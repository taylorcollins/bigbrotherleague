import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const LEAGUE_ID = "aaaaaaaa-0000-0000-0000-000000000001"

const SYSTEM_PROMPT = `You produce Power Rankings for a Big Brother fantasy league app called BB League — two ranked lists of houseguests who are still eligible to be drafted, used as draft decision-support. This is a data insight, not a story — base every ranking and every reason strictly on the computed stats and current game status provided; don't invent plot details you don't have. Cut dramatic or narrative language entirely (no "brutal," "dream pick," "carried you," or similar color commentary) — reasons are short, factual, and specific to the numbers.

Game mechanics that materially change who *can* score, not just who has scored — weigh these, don't just extrapolate raw stats:
- HOH, nominations, Veto, and Blockbuster all reset every week: a new HOH is crowned and new nominees are chosen from scratch at the start of each week. This week's nominee/safe/HOH status does NOT indicate who will be nominated, who will hold HOH, or who's eligible for Veto/Blockbuster next week. Do not assume this week's nominees will be next week's nominees, or that a currently-safe houseguest will be safe next week.
- The one status fact that DOES carry forward: whoever currently holds HOH is barred from competing for HOH the following week (a hard rule). Zero HOH-win upside for them in "next_week"; they're eligible again the week after.
- Each week's Veto competition is played by the HOH, the nominees, and a small number of other houseguests chosen at random — most houseguests are NOT guaranteed a shot at Veto every week. Don't treat a houseguest's season-long POV win count as if they compete every week.
- Blockbuster is played only by that week's nominees — whoever they turn out to be, not necessarily this week's nominees.
- A houseguest currently nominated faces real risk of being evicted before this week is even over, which would end their season and zero out all future scoring — factor that survival risk into "next_week" and "rest_of_season" for anyone currently on the block, separate from the fact that their specific nominee status won't carry into next week.
- Competition outcomes are heavily luck-driven. Hot and cold streaks are common and frequently don't persist — treat a current streak as one input, not a strong predictor of continuation, and lean toward a houseguest's season-long average when a streak is short or has no mechanical explanation (e.g. no comp win behind a hot week).

Real Big Brother dynamics that should shape "rest_of_season" especially — these are documented patterns from the actual show, not just arithmetic on this season's numbers:
- Winning too much, too early raises elimination risk rather than lowering it. Houseguests who rack up competition wins get identified by the house as "comp beasts" and targeted specifically because of it — don't simply extrapolate a hot competition streak upward; a houseguest with many recent comp wins may face rising, not falling, risk of being voted out soon.
- Target frequency (times already nominated, blindsided, or backdoored this season) is a direct signal of how often the house has already flagged this person as a threat or an easy vote. Someone targeted repeatedly and still standing has proven resilient, but it also means the house keeps seeing them as a target — weigh both directions rather than reading it as pure survival strength.
- Social game matters as much as competition wins for season-long survival — real winners have won with zero or few competition wins by playing a strong social/floater game instead (this is a proven winning path on the actual show, not a consolation prize). A houseguest with strong positive social-event totals (alliances, no betrayals, surviving showmances) but modest comp numbers can still be well-positioned for jury votes and a long season. A houseguest hit repeatedly by "Floater Tax" is being read by the house as contributing nothing, which is a real long-term risk regardless of survival so far.
- Jury stage changes the stakes: once a houseguest has reached jury, eviction costs the house -10 pts instead of -5, and they've already banked the +8 for making jury and possibly early jury votes at +3 each. Factor this larger downside and already-secured floor into "rest_of_season" — a mid-pack jury-stage houseguest's expected value skews differently than a pre-jury houseguest with identical raw stats.
- Scale predicted_points to how much season is actually left. You'll be told how many houseguests currently remain in the house — Big Brother evicts roughly one per week (occasionally two in a double-eviction week) until the finale, so that count is a rough proxy for weeks remaining. Don't project "rest_of_season" totals as if a full season's worth of weeks remain when the house is down to a handful of people; predicted_points should shrink as the season nears its end, and "next_week" and "rest_of_season" predictions should naturally converge toward each other as fewer weeks remain.

Produce two lists:
- "next_week": ranked prediction of who will score the most fantasy points in the next full week of the season — a fresh week with a new HOH and new nominees, not a continuation of this week. Current status affects this mainly through survival risk (a current nominee may not make it to next week) and the standing HOH lockout rule above, not through assumed competition eligibility. Also factor recent streak and trend.
- "rest_of_season": ranked prediction of who will accumulate the most fantasy points for the remainder of the season, scaled to the actual number of weeks left (see above), factoring in season-long consistency, competition win rate, and resilience (surviving the block) more heavily than any single recent week.

Respond with ONLY a JSON object matching this exact shape, no markdown code fences, no other text:
{"next_week": [{"houseguest_id": "...", "predicted_points": number, "reason": "..."}], "rest_of_season": [...]}

Include every houseguest id given to you in both lists, ordered highest predicted_points first. Each reason is one short sentence (under ~15 words), citing the specific stat(s) or mechanic driving that ranking.`

function isCompWin(event) {
  return event.category === "comps"
    && event.points_awarded > 0
    && event.label?.startsWith("Won ")
}

function isBlockSurvival(event) {
  return event.label === "Survived the Block"
}

// Direct signal for target theory — how often the house has already
// flagged this houseguest as a threat or an easy vote.
const TARGET_LABELS = ["Nominated", "Blindsided", "Backdoored"]
function isTargetEvent(event) {
  return TARGET_LABELS.includes(event.label)
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
      .select("id, nickname, status, is_jury")
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
    const targetEventsByHg = {}
    const socialPointsByHg = {}
    const socialEventsByHg = {}
    const floaterTaxByHg = {}
    const juryVotesByHg = {}
    events.forEach(e => {
      const week = e.episodes?.week_number
      if (week === undefined || week > weekNumber) return
      const evt = { label: e.scoring_events?.label, category: e.scoring_events?.category, points_awarded: e.points_awarded }
      if (isCompWin(evt)) compWinsByHg[e.houseguest_id] = (compWinsByHg[e.houseguest_id] ?? 0) + 1
      if (isBlockSurvival(evt)) blockSurvivalsByHg[e.houseguest_id] = (blockSurvivalsByHg[e.houseguest_id] ?? 0) + 1
      if (isTargetEvent(evt)) targetEventsByHg[e.houseguest_id] = (targetEventsByHg[e.houseguest_id] ?? 0) + 1
      if (evt.category === "social") {
        socialPointsByHg[e.houseguest_id] = (socialPointsByHg[e.houseguest_id] ?? 0) + evt.points_awarded
        socialEventsByHg[e.houseguest_id] = (socialEventsByHg[e.houseguest_id] ?? 0) + 1
      }
      if (evt.label === "Floater Tax") floaterTaxByHg[e.houseguest_id] = (floaterTaxByHg[e.houseguest_id] ?? 0) + 1
      if (evt.label === "Received a Jury Vote") juryVotesByHg[e.houseguest_id] = (juryVotesByHg[e.houseguest_id] ?? 0) + 1
    })

    function hasStatus(status, slug) {
      return (status ?? "").split(",").map(s => s.trim()).includes(slug)
    }

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
      const targetCount = targetEventsByHg[hg.id] ?? 0
      const socialPoints = socialPointsByHg[hg.id] ?? 0
      const socialEvents = socialEventsByHg[hg.id] ?? 0
      const floaterTax = floaterTaxByHg[hg.id] ?? 0
      const juryVotes = juryVotesByHg[hg.id] ?? 0

      // Mechanical eligibility facts the model shouldn't have to infer from
      // the raw status string alone. Only the HOH lockout carries forward
      // into next week — nominee status is framed as this-week survival
      // risk, not a next-week competition-eligibility signal, since noms
      // reset from scratch every week.
      const eligibilityNotes = []
      if (hasStatus(hg.status, "hoh")) {
        eligibilityNotes.push("currently HOH — barred from competing for HOH next week")
      }
      if (hasStatus(hg.status, "nominee")) {
        eligibilityNotes.push("currently nominated — faces this week's remaining eviction risk before next week even begins; does not carry over to next week's nominations or Veto/Blockbuster eligibility")
      }
      if (hg.is_jury) {
        eligibilityNotes.push("already reached jury — eviction now costs -10 instead of -5, and the +8 for making jury is already banked")
      }
      const eligibilitySuffix = eligibilityNotes.length ? ` (${eligibilityNotes.join("; ")})` : ""

      return `id: ${hg.id} — ${hg.nickname} (status: ${hg.status}): season total ${seasonTotal} pts through week ${weekNumber}, averaging ${avgPerWeek} pts/week, current streak: ${streakDesc}, trend vs last week: ${trend >= 0 ? "+" : ""}${trend}, competition wins: ${compWins}, times survived the block: ${blockSurvivals}, targeted (nominated/blindsided/backdoored) ${targetCount}x this season, social game: ${socialPoints >= 0 ? "+" : ""}${socialPoints} pts across ${socialEvents} social event(s)${floaterTax ? `, Floater Tax hit ${floaterTax}x` : ""}${juryVotes ? `, received ${juryVotes} jury vote(s)` : ""}.${eligibilitySuffix}`
    })

    const taxonomyLines = (scoringEvents ?? []).map(se => `${se.label} (${se.category}): ${se.points >= 0 ? "+" : ""}${se.points} pts`)

    // Rough proxy for weeks remaining in the season, since there's no
    // authoritative finale date to draw from — Big Brother evicts about one
    // houseguest per week, so the current headcount lower-bounds how much
    // season is left. Used to keep rest_of_season magnitudes realistic.
    const remainingCount = houseguests.length

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Houseguests remaining in the house: ${remainingCount} (roughly ${Math.max(remainingCount - 2, 1)}-${Math.max(remainingCount - 1, 1)} more weeks of season likely left, given ~1 eviction/week).

Scoring taxonomy (for context on what drives points):
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
