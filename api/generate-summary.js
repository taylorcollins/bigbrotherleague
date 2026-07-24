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

const SYSTEM_PROMPT = `You write the "Week N in BBL" recap for a Big Brother fantasy league app called BB League. The tone is casual, direct, and fan-voiced — like a commissioner texting the group chat, not a press release. Keep it to 2-4 short paragraphs, no headers, no bullet points, no markdown formatting. Separate paragraphs with a blank line. Reference houseguests by their short nickname. Base everything strictly on the scoring events provided — don't invent plot details you don't have.

Two examples of the established voice:

---
Hello players! A few housekeeping notes before Week 1 evictions.

This season's format threw us some new twists, so we're adding three scoring categories to match:

Blockbuster is back: Three houseguests hit the block this season instead of two, so +8 pts if your drafted houseguest wins the Blockbuster competition and saves themselves.

Winning Safety: +7 pts if your houseguest wins safety and is exempt from nomination for the week.

BB Time Capsule: +3 pts if your houseguest is America's pick for the Time Capsule, plus +5 for drawing a power or -2 for drawing a punishment (net +8 or +1).

Week 2 draft opens right after the eviction — get your picks ready!
---
Week 1 is in the books. First eviction is done, house has reset — new week, new HOH, new targets.

Week 2 draft is now open. Get your picks in before the next episode airs.

Watch for this week: who wins HOH, who enters the revolving door of being "on the block," and how the houseguests that are doing too much are gonna fare.
---`

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
    const { data: events, error: evErr } = await supabase
      .from("houseguest_events")
      .select("episode_id, points_awarded, houseguests(nickname), scoring_events(label)")
      .in("episode_id", episodeIds)

    if (evErr) {
      res.status(500).json({ error: "Failed to load events" })
      return
    }

    const epMeta = {}
    episodes.forEach(ep => {
      epMeta[ep.id] = ep.label || EPISODE_TYPE_LABELS[ep.episode_type] || ep.episode_type
    })

    const byEpisode = {}
    ;(events ?? []).forEach(e => {
      const epName = epMeta[e.episode_id] ?? "Episode"
      if (!byEpisode[epName]) byEpisode[epName] = []
      const nickname = e.houseguests?.nickname ?? "Unknown"
      const label = e.scoring_events?.label ?? "event"
      const pts = e.points_awarded >= 0 ? `+${e.points_awarded}` : `${e.points_awarded}`
      byEpisode[epName].push(`${nickname}: ${label} (${pts})`)
    })

    const lines = []
    Object.entries(byEpisode).forEach(([epName, evLines]) => {
      lines.push(`${epName}:`)
      evLines.forEach(l => lines.push(`- ${l}`))
    })
    const eventSummary = lines.length ? lines.join("\n") : "No scoring events recorded yet this week."

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Write the Week ${weekNumber} recap. Here's what scored this week:\n\n${eventSummary}`,
        },
      ],
    })

    const textBlock = message.content.find(b => b.type === "text")
    res.status(200).json({ summary: textBlock?.text?.trim() ?? "" })
  } catch (err) {
    console.error("generate-summary error:", err)
    res.status(500).json({ error: "Failed to generate summary" })
  }
}
