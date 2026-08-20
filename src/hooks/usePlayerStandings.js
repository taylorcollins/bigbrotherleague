import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

const DRAFT_PICKS_FALLBACK = 6

// Computes live standings by joining picks -> houseguest_events, the same
// approach the Leaderboard has always used. There's no "scores" table in
// play here -- it was scoped early on but never wired up (nothing ever
// wrote to it), and this live join is what's actually been running in
// production the whole time.
//
// Season ranking is by a scoring percentage — actual points scored ÷ best
// possible points — counted only across the weeks a player actually made
// picks in, not every week of the season. This is fairer to players who
// joined late or missed a draft window than a raw point total, which just
// rewards whoever has played the most weeks. "Best possible" for a week is
// the same top-N-positive-scorers definition used elsewhere in the app
// (api/generate-week-insight.js, Game.jsx's maxPointsByWeek).
export function usePlayerStandings() {
  const [players, setPlayers] = useState([]) // ranked: [{id, displayName, score, rank, bestWeekly, percentage, weeklyPoints}]
  const [availableWeeks, setAvailableWeeks] = useState([]) // sorted descending, weeks with recorded results
  const [finishedWeeks, setFinishedWeeks] = useState(new Set()) // weeks whose following draft window has closed
  const [loading, setLoading] = useState(true)
  const channelName = useRef(null)

  useEffect(() => {
    if (channelName.current === null) {
      channelName.current = `player-standings-${Math.random().toString(36).slice(2)}`
    }

    async function fetchData() {
      const [playersRes, picksRes, eventsRes, episodesRes, windowsRes] = await Promise.all([
        supabase.from("players").select("id, display_name"),
        supabase.from("picks").select("player_id, houseguest_id, draft_windows(week_number)"),
        supabase.from("houseguest_events").select("houseguest_id, points_awarded, episode_id"),
        supabase.from("episodes").select("id, week_number"),
        supabase.from("draft_windows").select("week_number, picks_per_player, closes_at"),
      ])

      if (playersRes.error)  console.error("players:", playersRes.error.message)
      if (picksRes.error)    console.error("picks:", picksRes.error.message)
      if (eventsRes.error)   console.error("events:", eventsRes.error.message)
      if (episodesRes.error) console.error("episodes:", episodesRes.error.message)
      if (windowsRes.error)  console.error("draft_windows:", windowsRes.error.message)

      // Map episode_id -> week_number
      const epWeekMap = {}
      episodesRes.data?.forEach(ep => { epWeekMap[ep.id] = ep.week_number })

      const picksPerPlayerByWeek = {}
      const closesAtByWeek = {}
      windowsRes.data?.forEach(w => {
        picksPerPlayerByWeek[w.week_number] = w.picks_per_player
        closesAtByWeek[w.week_number] = w.closes_at
      })

      // Group events by houseguest + week: hgWeekPoints[hg_id][week] = total points
      const hgWeekPoints = {}
      eventsRes.data?.forEach(e => {
        const wn = epWeekMap[e.episode_id]
        if (wn === undefined) return
        if (!hgWeekPoints[e.houseguest_id]) hgWeekPoints[e.houseguest_id] = {}
        hgWeekPoints[e.houseguest_id][wn] = (hgWeekPoints[e.houseguest_id][wn] ?? 0) + e.points_awarded
      })

      // Best possible score for each week — top N (that week's
      // picks_per_player) positive houseguest totals, summed. Same
      // definition used in Game.jsx and generate-week-insight.js.
      const weeksWithResults = new Set()
      Object.values(hgWeekPoints).forEach(weekMap => {
        Object.keys(weekMap).forEach(wn => weeksWithResults.add(Number(wn)))
      })

      const bestPossibleByWeek = {}
      weeksWithResults.forEach(wn => {
        const picksPerPlayer = picksPerPlayerByWeek[wn] ?? DRAFT_PICKS_FALLBACK
        const hgScoresThisWeek = Object.values(hgWeekPoints).map(weekMap => weekMap[wn] ?? 0)
        const topScores = hgScoresThisWeek.filter(pts => pts > 0).sort((a, b) => b - a).slice(0, picksPerPlayer)
        bestPossibleByWeek[wn] = topScores.reduce((sum, pts) => sum + pts, 0)
      })

      // A week counts as "finished" once the following week's draft has
      // closed — that's the signal this league uses that a week's scoring
      // is fully locked in, not just that some events have been recorded.
      const now = new Date()
      const finished = new Set()
      weeksWithResults.forEach(wn => {
        const nextWeekCloses = closesAtByWeek[wn + 1]
        if (nextWeekCloses && new Date(nextWeekCloses) < now) finished.add(wn)
      })

      // For each pick, only count the houseguest's points for the week they
      // were picked, grouped per player per week. The key's mere presence
      // (not its value) is what means "this player made picks that week" —
      // a legitimate 0-point week still needs to count as played.
      const playerWeekPoints = {}
      picksRes.data?.forEach(p => {
        const wn = p.draft_windows?.week_number
        if (wn == null) return
        const pts = hgWeekPoints[p.houseguest_id]?.[wn] ?? 0
        if (!playerWeekPoints[p.player_id]) playerWeekPoints[p.player_id] = {}
        playerWeekPoints[p.player_id][wn] = (playerWeekPoints[p.player_id][wn] ?? 0) + pts
      })

      // Build ranked list sorted by season scoring percentage descending —
      // players with no qualifying weeks (never drafted) get percentage
      // null and sort last, with no rank assigned.
      const withStats = (playersRes.data ?? []).map(p => {
        const weeklyPoints = playerWeekPoints[p.id] ?? {}
        const qualifyingWeeks = Object.keys(weeklyPoints).map(Number)

        const actualSum = qualifyingWeeks.reduce((sum, wn) => sum + weeklyPoints[wn], 0)
        const possibleSum = qualifyingWeeks.reduce((sum, wn) => sum + (bestPossibleByWeek[wn] ?? 0), 0)
        const percentage = possibleSum > 0 ? actualSum / possibleSum : null

        const weeks = Object.values(weeklyPoints)

        return {
          id:          p.id,
          displayName: p.display_name ?? "Unknown",
          score:       actualSum,
          bestWeekly:  weeks.length ? Math.max(...weeks) : null,
          percentage,
          weeklyPoints,
          weeksPlayed: qualifyingWeeks.length,
        }
      })

      const ranked = withStats
        .sort((a, b) => {
          if (a.percentage === null && b.percentage === null) return 0
          if (a.percentage === null) return 1
          if (b.percentage === null) return -1
          return b.percentage - a.percentage
        })
        .map((p, i) => ({ ...p, rank: p.percentage === null ? null : i + 1 }))

      setPlayers(ranked)
      setAvailableWeeks([...weeksWithResults].sort((a, b) => b - a))
      setFinishedWeeks(finished)
      setLoading(false)
    }

    fetchData()

    // Refetch whenever the commissioner scores an episode, so standings
    // update live instead of only on next page load.
    const channel = supabase
      .channel(channelName.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "houseguest_events" }, fetchData)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return { players, availableWeeks, finishedWeeks, loading }
}
