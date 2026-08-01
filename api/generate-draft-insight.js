import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const LEAGUE_ID = "aaaaaaaa-0000-0000-0000-000000000001"

const NO_HISTORY_INSIGHT =
  "No scoring history yet to go on — this draft is a clean slate. Go with your gut on who you think will make early moves."

const SYSTEM_PROMPT = `You write short strategic draft advice for a Big Brother fantasy league app called BB League, shown to players while they're picking their team for the week. The tone is casual and fun — like a friend giving you a heads up before you draft, not a stats report. Keep it to 2-3 short paragraphs, no headers, no bullet points, no markdown formatting. Reference houseguests by their short nickname. Base everything strictly on the scoring events provided from last week — don't invent plot details, showmances, feuds, or outcomes you don't have direct evidence for in the data.

Think like a fantasy draft analyst: houseguests who won competitions or made big moves last week often paint a target on their back for the week ahead (more "heat" = more nomination risk, which can mean fewer points, but also a chance at big survival/veto points). Houseguests racking up social-category points (fights, lies, showmances, emotional diary room moments) tend to keep generating those points if the pattern continues. Houseguests with no events at all last week are floating under the radar — call that out as its own kind of signal (could mean safe and steady, could mean invisible and low-scoring). Don't recommend specific picks outright — surface the dynamics and let the reader draw their own conclusion.`

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
      .select("is_commissioner")
      .eq("user_id", userData.user.id)
      .single()

    if (!player?.is_commissioner) {
      res.status(403).json({ error: "Commissioner access required" })
      return
    }

    // Advice for the Week `weekNumber` draft is based on the prior week's
    // events — the most recently completed week when this draft opened.
    const priorWeek = weekNumber - 1

    const { data: pool, error: poolErr } = await supabase
      .from("houseguests")
      .select("id, nickname")
      .eq("league_id", LEAGUE_ID)
      .eq("in_draft_pool", true)

    if (poolErr) {
      res.status(500).json({ error: "Failed to load draft pool" })
      return
    }

    if (!pool?.length) {
      res.status(404).json({ error: "No houseguests currently in the draft pool" })
      return
    }

    const poolIds = pool.map(hg => hg.id)
    const nicknameById = {}
    pool.forEach(hg => { nicknameById[hg.id] = hg.nickname })

    const { data: episodes, error: epErr } = await supabase
      .from("episodes")
      .select("id")
      .eq("league_id", LEAGUE_ID)
      .eq("week_number", priorWeek)

    if (epErr) {
      res.status(500).json({ error: "Failed to load episodes" })
      return
    }

    if (!episodes?.length) {
      res.status(200).json({ insight: NO_HISTORY_INSIGHT })
      return
    }

    const episodeIds = episodes.map(ep => ep.id)
    const { data: events, error: evErr } = await supabase
      .from("houseguest_events")
      .select("houseguest_id, points_awarded, scoring_events(label)")
      .in("episode_id", episodeIds)
      .in("houseguest_id", poolIds)

    if (evErr) {
      res.status(500).json({ error: "Failed to load events" })
      return
    }

    if (!events?.length) {
      res.status(200).json({ insight: NO_HISTORY_INSIGHT })
      return
    }

    // Group last week's events by houseguest, so the model reasons about
    // "who did what" rather than "what happened when."
    const byHouseguest = {}
    events.forEach(e => {
      const nickname = nicknameById[e.houseguest_id]
      if (!nickname) return
      if (!byHouseguest[nickname]) byHouseguest[nickname] = []
      const label = e.scoring_events?.label ?? "event"
      const pts = e.points_awarded >= 0 ? `+${e.points_awarded}` : `${e.points_awarded}`
      byHouseguest[nickname].push(`${label} (${pts})`)
    })

    const lines = []
    pool.forEach(hg => {
      const evs = byHouseguest[hg.nickname]
      lines.push(evs?.length ? `${hg.nickname}: ${evs.join(", ")}` : `${hg.nickname}: no scoring events last week`)
    })
    const eventSummary = lines.join("\n")

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Write draft advice for the Week ${weekNumber} draft. Here's what happened last week (Week ${priorWeek}) for everyone currently in the draft pool:\n\n${eventSummary}`,
        },
      ],
    })

    const textBlock = message.content.find(b => b.type === "text")
    res.status(200).json({ insight: textBlock?.text?.trim() ?? "" })
  } catch (err) {
    console.error("generate-draft-insight error:", err)
    res.status(500).json({ error: "Failed to generate insight" })
  }
}
