import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

// Computes live standings by joining picks -> houseguest_events, the same
// approach the Leaderboard has always used. There's no "scores" table in
// play here -- it was scoped early on but never wired up (nothing ever
// wrote to it), and this live join is what's actually been running in
// production the whole time.
export function usePlayerStandings() {
  const [players, setPlayers] = useState([]) // ranked: [{id, displayName, score, rank, bestWeekly}]
  const [loading, setLoading] = useState(true)
  const channelName = useRef(null)

  useEffect(() => {
    if (channelName.current === null) {
      channelName.current = `player-standings-${Math.random().toString(36).slice(2)}`
    }

    async function fetchData() {
      const [playersRes, picksRes, eventsRes, episodesRes] = await Promise.all([
        supabase.from("players").select("id, display_name"),
        supabase.from("picks").select("player_id, houseguest_id, draft_windows(week_number)"),
        supabase.from("houseguest_events").select("houseguest_id, points_awarded, episode_id"),
        supabase.from("episodes").select("id, week_number"),
      ])

      if (playersRes.error)  console.error("players:", playersRes.error.message)
      if (picksRes.error)    console.error("picks:", picksRes.error.message)
      if (eventsRes.error)   console.error("events:", eventsRes.error.message)
      if (episodesRes.error) console.error("episodes:", episodesRes.error.message)

      // Map episode_id -> week_number
      const epWeekMap = {}
      episodesRes.data?.forEach(ep => { epWeekMap[ep.id] = ep.week_number })

      // Group events by houseguest + week: hgWeekPoints[hg_id][week] = total points
      const hgWeekPoints = {}
      eventsRes.data?.forEach(e => {
        const wn = epWeekMap[e.episode_id]
        if (wn === undefined) return
        if (!hgWeekPoints[e.houseguest_id]) hgWeekPoints[e.houseguest_id] = {}
        hgWeekPoints[e.houseguest_id][wn] = (hgWeekPoints[e.houseguest_id][wn] ?? 0) + e.points_awarded
      })

      // For each pick, only count the houseguest's points for the week they
      // were picked, grouped per player per week so we can derive both a
      // season total and a best single week.
      const playerWeekPoints = {}
      picksRes.data?.forEach(p => {
        const wn = p.draft_windows?.week_number
        if (wn == null) return
        const pts = hgWeekPoints[p.houseguest_id]?.[wn] ?? 0
        if (!playerWeekPoints[p.player_id]) playerWeekPoints[p.player_id] = {}
        playerWeekPoints[p.player_id][wn] = (playerWeekPoints[p.player_id][wn] ?? 0) + pts
      })

      // Build ranked list sorted by total points descending
      const ranked = (playersRes.data ?? [])
        .map(p => {
          const weeks = Object.values(playerWeekPoints[p.id] ?? {})
          return {
            id:          p.id,
            displayName: p.display_name ?? "Unknown",
            score:       weeks.reduce((sum, pts) => sum + pts, 0),
            bestWeekly:  weeks.length ? Math.max(...weeks) : null,
          }
        })
        .sort((a, b) => b.score - a.score)
        .map((p, i) => ({ ...p, rank: i + 1 }))

      setPlayers(ranked)
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

  return { players, loading }
}
