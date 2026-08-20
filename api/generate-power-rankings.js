import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const LEAGUE_ID = "aaaaaaaa-0000-0000-0000-000000000001"

const SYSTEM_PROMPT = `You produce Power Rankings for a Big Brother fantasy league app called BB League — two ranked lists of houseguests who are still eligible to be drafted, used as draft decision-support. This is a data insight, not a story — base every ranking and every reason strictly on the computed stats and current game status provided; don't invent plot details you don't have. Cut dramatic or narrative language entirely (no "brutal," "dream pick," "carried you," or similar color commentary) — reasons are short, factual, and specific to the numbers.

Produce two lists:
- "next_week": ranked prediction of who will score the most fantasy points in the upcoming week, factoring in current game status (HOH/nominee/safe changes risk and opportunity this week), recent streak, and trend.
- "rest_of_season": ranked prediction of who will accumulate the most fantasy points for the remainder of the season, factoring in season-long consistency, competition win rate, and resilience (surviving the block) more heavily than any single recent week.

Respond with ONLY a JSON object matching this exact shape, no markdown code fences, no other text:
{"next_week": [{"houseguest_id": "...", "predicted_points": number, "reason": "..."}], "rest_of_season": [...]}

Include every houseguest id given to you in both lists, ordered highest predicted_points first. Each reason is one short sentence (under ~15 words), citing the specific stat(s) driving that ranking.`

function isCompWin(event) {
  return event.category === "comps"
    && event.points_awarded > 0
    && event.label?.startsWith("Won ")
}

function isBlockSurvival(event) {
  return event.label === "Survived the Block"
}

function currentStreak(weeklyPoints, weekNumber) {
  if (weekNumber < 1) return null
  const lastWeekPts = weeklyPoints[weekNumber] ?? 0
  const type = lastWeekPts > 0 ? "hot" : "cold"
  let length = 0
  for (let week = weekNumber; week >= 1; week--) {
    const pts = weeklyPoints[week] ?? 0
    const matches = type === "hot" ? pts > 0 : pts === 0
    if (!matches) break
    length++
  }
  return { type, length }
}

function validateList(list, validIds) {
  if (!Array.isArray(list)) return []
  return list
    .filter(entry => entry && validIds.has(entry.houseguest_id))
    .map(entry => ({
      houseguest_id: entry.houseguest_id,
      predicted_points: Number(entry.predicted_points),
      reason: typeof entry.reason === "string" ? entry.reason.trim() : "",
    }))
    .filter(entry => Number.isFinite(entry.predicted_points) && entry.reason.length > 0)
    .sort((a, b) => b.predicted_points - a.predicted_points)
}

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

    const { data: events, error: evErr } = await supabase
      .from("houseguest_events")
      .select("houseguest_id, points_awarded, episodes(week_number), scoring_events(label, category)")

    if (evErr) {
      res.status(500).json({ error: "Failed to load events" })
      return
    }

    if (!events?.length) {
      res.status(404).json({ error: "No scoring events recorded yet" })
      return
    }

    const weekNumber = Math.max(...events.map(e => e.episodes?.week_number ?? 0))
    if (weekNumber < 1) {
      res.status(404).json({ error: "No scoring events recorded yet" })
      return
    }

    // Reuse a cached ranking if one already exists for this league/week —
    // avoids re-billing the Anthropic API every time the page reloads.
    const { data: cached } = await supabase
      .from("power_rankings")
      .select("next_week, rest_of_season")
      .eq("league_id", LEAGUE_ID)
      .eq("week_number", weekNumber)
      .maybeSingle()

    if (cached) {
      res.status(200).json({ nextWeek: cached.next_week, restOfSeason: cached.rest_of_season, weekNumber, cached: true })
      return
    }

    const { data: houseguests, error: hgErr } = await supabase
      .from("houseguests")
      .select("id, nickname, status")
      .eq("in_draft_pool", true)

    if (hgErr) {
      res.status(500).json({ error: "Failed to load houseguests" })
      return
    }

    if (!houseguests?.length) {
      res.status(404).json({ error: "No houseguests currently eligible to be ranked" })
      return
    }

    const { data: scoringEvents } = await supabase
      .from("scoring_events")
      .select("label, category, points")
      .order("category")

    // Per-houseguest weekly point totals through weekNumber, for streak/trend
    const weeklyPointsByHg = {}
    events.forEach(e => {
      const week = e.episodes?.week_number
      if (week === undefined || week > weekNumber) return
      if (!weeklyPointsByHg[e.houseguest_id]) weeklyPointsByHg[e.houseguest_id] = {}
      weeklyPointsByHg[e.houseguest_id][week] = (weeklyPointsByHg[e.houseguest_id][week] ?? 0) + e.points_awarded
    })

    const compWinsByHg = {}
    const blockSurvivalsByHg = {}
    events.forEach(e => {
      const week = e.episodes?.week_number
      if (week === undefined || week > weekNumber) return
      const evt = { label: e.scoring_events?.label, category: e.scoring_events?.category, points_awarded: e.points_awarded }
      if (isCompWin(evt)) compWinsByHg[e.houseguest_id] = (compWinsByHg[e.houseguest_id] ?? 0) + 1
      if (isBlockSurvival(evt)) blockSurvivalsByHg[e.houseguest_id] = (blockSurvivalsByHg[e.houseguest_id] ?? 0) + 1
    })

    const featureLines = houseguests.map(hg => {
      const weeklyPoints = weeklyPointsByHg[hg.id] ?? {}
      let seasonTotal = 0
      for (let week = 1; week <= weekNumber; week++) seasonTotal += weeklyPoints[week] ?? 0

      const streak = currentStreak(weeklyPoints, weekNumber)
      const streakDesc = streak ? `${streak.length} week(s) ${streak.type === "hot" ? "scoring points" : "at 0 points"}` : "no history yet"
      const trend = weekNumber >= 2 ? (weeklyPoints[weekNumber] ?? 0) - (weeklyPoints[weekNumber - 1] ?? 0) : 0
      const avgPerWeek = Math.round((seasonTotal / weekNumber) * 10) / 10
      const compWins = compWinsByHg[hg.id] ?? 0
      const blockSurvivals = blockSurvivalsByHg[hg.id] ?? 0

      return `id: ${hg.id} — ${hg.nickname} (status: ${hg.status}): season total ${seasonTotal} pts through week ${weekNumber}, averaging ${avgPerWeek} pts/week, current streak: ${streakDesc}, trend vs last week: ${trend >= 0 ? "+" : ""}${trend}, competition wins: ${compWins}, times survived the block: ${blockSurvivals}.`
    })

    const taxonomyLines = (scoringEvents ?? []).map(se => `${se.label} (${se.category}): ${se.points >= 0 ? "+" : ""}${se.points} pts`)

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Scoring taxonomy (for context on what drives points):
${taxonomyLines.join("\n")}

Current per-houseguest stats through week ${weekNumber}:
${featureLines.join("\n")}`,
        },
      ],
    })

    const textBlock = message.content.find(b => b.type === "text")
    let raw = textBlock?.text?.trim() ?? ""
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      res.status(500).json({ error: "Failed to parse power rankings" })
      return
    }

    const validIds = new Set(houseguests.map(h => h.id))
    const nextWeek = validateList(parsed?.next_week, validIds)
    const restOfSeason = validateList(parsed?.rest_of_season, validIds)

    if (!nextWeek.length || !restOfSeason.length) {
      res.status(500).json({ error: "Power rankings response was empty after validation" })
      return
    }

    // Cache it so reopening the page doesn't re-generate (and re-bill) it
    await supabase
      .from("power_rankings")
      .upsert(
        { league_id: LEAGUE_ID, week_number: weekNumber, next_week: nextWeek, rest_of_season: restOfSeason, updated_at: new Date().toISOString() },
        { onConflict: "league_id,week_number" }
      )

    res.status(200).json({ nextWeek, restOfSeason, weekNumber, cached: false })
  } catch (err) {
    console.error("generate-power-rankings error:", err)
    res.status(500).json({ error: "Failed to generate power rankings" })
  }
}
