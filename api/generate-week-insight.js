import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const LEAGUE_ID = "aaaaaaaa-0000-0000-0000-000000000001"

const EPISODE_TYPE_LABELS = {
  premiere: "Premiere",
  nominations: "Nominations",
  pov: "POV",
  eviction: "Eviction",
}

const SYSTEM_PROMPT = `You write a short personalized "how your week went" insight for one player in a Big Brother fantasy league app called BB League. The tone is casual and fun — like a friend texting you after the episode, not a stats report. Keep it to 1-2 short paragraphs, no headers, no bullet points, no markdown formatting. Reference houseguests by their short nickname. Base everything strictly on the numbers and events provided — don't invent plot details you don't have.

Always mention how their score compares to the best possible score that week. Weave in any relevant historical trend about the episode type(s) that aired that week (e.g. call it out if POV episodes are usually low-scoring, or if this week beat/missed the historical average). If the data shows a houseguest with a surprising point swing — someone who went off unexpectedly, positive or negative — mention it, especially if it wasn't one of this player's picks.`

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  try {
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
    if (!token) {
      res.status(401).json({ error: "Missing Authorization header" })
      return
    }

    const { weekNumber } = req.body ?? {}
    if (!Number.isInteger(weekNumber)) {
      res.status(400).json({ error: "weekNumber is required" })
      return
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData?.user) {
      res.status(401).json({ error: "Invalid session" })
      return
    }

    const { data: player } = await supabase
      .from("players")
      .select("id")
      .eq("user_id", userData.user.id)
      .single()

    if (!player) {
      res.status(403).json({ error: "No player found for this account" })
      return
    }

    // Reuse a cached insight if one already exists for this player/week —
    // avoids re-billing the Anthropic API every time the sheet reopens.
    const { data: cached } = await supabase
      .from("week_insights")
      .select("insight")
      .eq("player_id", player.id)
      .eq("week_number", weekNumber)
      .maybeSingle()

    if (cached?.insight) {
      res.status(200).json({ insight: cached.insight, cached: true })
      return
    }

    const { data: episodes, error: epErr } = await supabase
      .from("episodes")
      .select("id, episode_type, label")
      .eq("league_id", LEAGUE_ID)
      .eq("week_number", weekNumber)

    if (epErr) {
      res.status(500).json({ error: "Failed to load episodes" })
      return
    }

    if (!episodes?.length) {
      res.status(404).json({ error: `No episodes found for week ${weekNumber}` })
      return
    }

    const episodeIds = episodes.map(ep => ep.id)
    const epLabelById = {}
    const epTypeById = {}
    episodes.forEach(ep => {
      epLabelById[ep.id] = ep.label || EPISODE_TYPE_LABELS[ep.episode_type] || ep.episode_type
      epTypeById[ep.id] = ep.episode_type
    })

    const { data: events, error: evErr } = await supabase
      .from("houseguest_events")
      .select("houseguest_id, episode_id, points_awarded, houseguests(nickname), scoring_events(label)")
      .in("episode_id", episodeIds)

    if (evErr) {
      res.status(500).json({ error: "Failed to load events" })
      return
    }

    // Points per houseguest this week, for the "best possible score" calc
    const hgWeekTotals = {}
    ;(events ?? []).forEach(e => {
      hgWeekTotals[e.houseguest_id] = (hgWeekTotals[e.houseguest_id] ?? 0) + e.points_awarded
    })

    const { data: draftWindow } = await supabase
      .from("draft_windows")
      .select("picks_per_player")
      .eq("week_number", weekNumber)
      .maybeSingle()
    const picksPerPlayer = draftWindow?.picks_per_player ?? 6

    const bestPossible = Object.values(hgWeekTotals)
      .filter(pts => pts > 0)
      .sort((a, b) => b - a)
      .slice(0, picksPerPlayer)
      .reduce((sum, pts) => sum + pts, 0)

    // This player's own picks and score for the week
    const { data: allMyPicks } = await supabase
      .from("picks")
      .select("houseguest_id, houseguests(nickname), draft_windows(week_number)")
      .eq("player_id", player.id)

    const myPicks = (allMyPicks ?? []).filter(p => p.draft_windows?.week_number === weekNumber)
    const myNicknames = myPicks.map(p => p.houseguests?.nickname).filter(Boolean)
    const myScore = myPicks.reduce((sum, p) => sum + (hgWeekTotals[p.houseguest_id] ?? 0), 0)

    // This week's total points per episode type (usually just one episode per type)
    const totalsByEpisodeThisWeek = {}
    ;(events ?? []).forEach(e => {
      totalsByEpisodeThisWeek[e.episode_id] = (totalsByEpisodeThisWeek[e.episode_id] ?? 0) + e.points_awarded
    })
    const thisWeekTotalsByType = {}
    episodes.forEach(ep => {
      thisWeekTotalsByType[ep.episode_type] =
        (thisWeekTotalsByType[ep.episode_type] ?? 0) + (totalsByEpisodeThisWeek[ep.id] ?? 0)
    })

    // Historical average total points per episode of each type this week
    // covers, excluding this week's own episodes from the average.
    const typesThisWeek = [...new Set(episodes.map(ep => ep.episode_type))]
    const { data: historicalEpisodes } = await supabase
      .from("episodes")
      .select("id, episode_type")
      .eq("league_id", LEAGUE_ID)
      .in("episode_type", typesThisWeek)

    const priorEpisodes = (historicalEpisodes ?? []).filter(ep => !episodeIds.includes(ep.id))
    const priorEpisodeIds = priorEpisodes.map(ep => ep.id)

    let historyLines = []
    if (priorEpisodeIds.length > 0) {
      const { data: historicalEvents } = await supabase
        .from("houseguest_events")
        .select("episode_id, points_awarded")
        .in("episode_id", priorEpisodeIds)

      const totalsByPriorEpisode = {}
      ;(historicalEvents ?? []).forEach(e => {
        totalsByPriorEpisode[e.episode_id] = (totalsByPriorEpisode[e.episode_id] ?? 0) + e.points_awarded
      })

      const priorTypeById = {}
      priorEpisodes.forEach(ep => { priorTypeById[ep.id] = ep.episode_type })

      const histByType = {} // type -> { sum, count }
      Object.entries(totalsByPriorEpisode).forEach(([epId, total]) => {
        const type = priorTypeById[epId]
        if (!histByType[type]) histByType[type] = { sum: 0, count: 0 }
        histByType[type].sum += total
        histByType[type].count += 1
      })

      historyLines = typesThisWeek
        .filter(type => histByType[type]?.count > 0)
        .map(type => {
          const { sum, count } = histByType[type]
          const avg = (sum / count).toFixed(1)
          const label = EPISODE_TYPE_LABELS[type] ?? type
          return `${label}: this week totaled ${thisWeekTotalsByType[type] ?? 0} pts across all houseguests, vs a historical average of ${avg} pts over ${count} prior ${label} episode(s).`
        })
    }

    // Full per-houseguest scoring breakdown for the week, grouped by episode
    const byEpisode = {}
    ;(events ?? []).forEach(e => {
      const epName = epLabelById[e.episode_id] ?? "Episode"
      if (!byEpisode[epName]) byEpisode[epName] = []
      const nickname = e.houseguests?.nickname ?? "Unknown"
      const label = e.scoring_events?.label ?? "event"
      const pts = e.points_awarded >= 0 ? `+${e.points_awarded}` : `${e.points_awarded}`
      byEpisode[epName].push(`${nickname}: ${label} (${pts})`)
    })
    const eventLines = []
    Object.entries(byEpisode).forEach(([epName, evLines]) => {
      eventLines.push(`${epName}:`)
      evLines.forEach(l => eventLines.push(`- ${l}`))
    })
    const eventSummary = eventLines.length ? eventLines.join("\n") : "No scoring events recorded this week."

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 512,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Week ${weekNumber} recap for this player.

Their picks: ${myNicknames.join(", ") || "no picks locked in"}
Their score: ${myScore} pts
Best possible score this week: ${bestPossible} pts

Episode-type history:
${historyLines.join("\n") || "No historical data yet for these episode types."}

Full scoring breakdown this week:
${eventSummary}`,
        },
      ],
    })

    const textBlock = message.content.find(b => b.type === "text")
    const insight = textBlock?.text?.trim() ?? ""

    // Cache it so reopening the sheet doesn't re-generate (and re-bill) it
    await supabase
      .from("week_insights")
      .upsert(
        { player_id: player.id, week_number: weekNumber, insight, updated_at: new Date().toISOString() },
        { onConflict: "player_id,week_number" }
      )

    res.status(200).json({ insight, cached: false })
  } catch (err) {
    console.error("generate-week-insight error:", err)
    res.status(500).json({ error: "Failed to generate insight" })
  }
}
