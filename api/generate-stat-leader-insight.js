import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const LEAGUE_ID = "aaaaaaaa-0000-0000-0000-000000000001"

const SYSTEM_PROMPT = `You write a short "stat leaders" insight for a Big Brother fantasy league app called BB League, shown above a table of houseguests and their season event tallies (HOH wins, POV wins, nominations, evictions survived, etc). This is a data insight, not a story — lead with the numbers, state facts plainly, and cut dramatic or narrative language entirely (no "oof," "carried you," "dream pick," "brutal," or similar color commentary). No unnecessary words. Keep it to 1-2 short paragraphs, no headers, no bullet points, no markdown formatting. Reference houseguests by their short nickname. Base everything strictly on the tallies provided — don't invent plot details you don't have.

Surface one or two non-obvious patterns across the tallies rather than restating the season-points leaderboard (which is already shown elsewhere on the page) — e.g. a houseguest who wins competitions but still ends up nominated often, someone who has survived the block repeatedly without a single competition win, or a houseguest with a lot of negative-scoring events despite a decent points total.`

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
      .select("houseguest_id, points_awarded, houseguests(nickname), scoring_events(label), episodes(week_number)")

    if (evErr) {
      res.status(500).json({ error: "Failed to load events" })
      return
    }

    if (!events?.length) {
      res.status(404).json({ error: "No scoring events recorded yet" })
      return
    }

    const weekNumber = Math.max(...events.map(e => e.episodes?.week_number ?? 0))

    // Reuse a cached insight if one already exists for this league/week —
    // avoids re-billing the Anthropic API every time the page reloads.
    const { data: cached } = await supabase
      .from("stat_leader_insights")
      .select("insight")
      .eq("league_id", LEAGUE_ID)
      .eq("week_number", weekNumber)
      .maybeSingle()

    if (cached?.insight) {
      res.status(200).json({ insight: cached.insight, cached: true })
      return
    }

    // Per-houseguest event tallies (count per label) plus season points
    const tallies = {}
    events.forEach(e => {
      const nickname = e.houseguests?.nickname ?? "Unknown"
      if (!tallies[nickname]) tallies[nickname] = { counts: {}, points: 0 }
      const label = e.scoring_events?.label ?? "event"
      tallies[nickname].counts[label] = (tallies[nickname].counts[label] ?? 0) + 1
      tallies[nickname].points += e.points_awarded
    })

    const tallyLines = Object.entries(tallies).map(([nickname, { counts, points }]) => {
      const countStr = Object.entries(counts).map(([label, n]) => `${label} x${n}`).join(", ")
      return `${nickname} (${points} season pts): ${countStr}`
    })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Season-to-date event tallies through week ${weekNumber}:\n\n${tallyLines.join("\n")}`,
        },
      ],
    })

    const textBlock = message.content.find(b => b.type === "text")
    const insight = textBlock?.text?.trim() ?? ""

    // Cache it so reopening the page doesn't re-generate (and re-bill) it
    await supabase
      .from("stat_leader_insights")
      .upsert(
        { league_id: LEAGUE_ID, week_number: weekNumber, insight, updated_at: new Date().toISOString() },
        { onConflict: "league_id,week_number" }
      )

    res.status(200).json({ insight, cached: false })
  } catch (err) {
    console.error("generate-stat-leader-insight error:", err)
    res.status(500).json({ error: "Failed to generate insight" })
  }
}
