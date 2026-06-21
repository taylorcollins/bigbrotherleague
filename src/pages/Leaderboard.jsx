import { useState, useEffect } from "react"
import { PageHeader, Card, LeaderboardRow, StatPair } from "@/components"
import { supabase } from "@/lib/supabase"
import { useCurrentPlayer } from "@/hooks/useCurrentPlayer"

function getInitials(name) {
  const parts = (name ?? "").trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name ?? "??").slice(0, 2).toUpperCase()
}

const PAGE_SIZE = 10

export default function Leaderboard() {
  const { playerId } = useCurrentPlayer()
  const [players, setPlayers]           = useState([])
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [loading, setLoading]           = useState(true)
  const [page, setPage]                 = useState(1)

  useEffect(() => {
    async function fetchData() {
      const [playersRes, picksRes, eventsRes, episodesRes] = await Promise.all([
        supabase.from("players").select("id, display_name"),
        supabase.from("picks").select("player_id, houseguest_id, draft_windows(week_number)"),
        supabase.from("houseguest_events").select("houseguest_id, points_awarded, episode_id"),
        supabase.from("episodes").select("id, week_number"),
      ])

      if (playersRes.error) console.error("players:", playersRes.error.message)
      if (picksRes.error)   console.error("picks:",   picksRes.error.message)
      if (eventsRes.error)  console.error("events:",  eventsRes.error.message)
      if (episodesRes.error) console.error("episodes:", episodesRes.error.message)

      // Map episode_id → week_number
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

      // For each pick, only count the houseguest's points for the week they were picked
      const playerPoints = {}
      picksRes.data?.forEach(p => {
        const wn = p.draft_windows?.week_number
        const pts = wn != null ? (hgWeekPoints[p.houseguest_id]?.[wn] ?? 0) : 0
        playerPoints[p.player_id] = (playerPoints[p.player_id] ?? 0) + pts
      })

      // Build ranked list sorted by total points descending
      const ranked = (playersRes.data ?? [])
        .map(p => ({
          id:       p.id,
          username: p.display_name ?? "Unknown",
          initials: getInitials(p.display_name),
          score:    playerPoints[p.id] ?? 0,
        }))
        .sort((a, b) => b.score - a.score)
        .map((p, i) => ({ ...p, rank: i + 1 }))

      const me = ranked.find(p => p.id === playerId) ?? null

      setPlayers(ranked)
      setCurrentPlayer(me)
      setLoading(false)
    }

    fetchData()
  }, [playerId])

  const totalPages = Math.max(1, Math.ceil(players.length / PAGE_SIZE))
  const visible = players.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="Leaderboard" />

      <div className="flex flex-col gap-4 px-4">
        {currentPlayer && (
          <Card>
            <p className="text-headline font-bold text-gray-900">{currentPlayer.username}</p>
            <div className="flex gap-6 mt-2">
              <StatPair label="Rank" value={`#${currentPlayer.rank}`} />
              <StatPair label="Score" value={currentPlayer.score} valueColor="text-brand-primary" />
            </div>
          </Card>
        )}

        {loading ? (
          <p className="text-caption text-gray-400 text-center mt-8">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map(player => (
              <LeaderboardRow
                key={player.id}
                rank={player.rank}
                username={player.username}
                initials={player.initials}
                score={player.score}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-card border border-gray-200 px-4 py-2 text-caption text-gray-500 disabled:opacity-30"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`h-8 w-8 rounded-full text-caption font-semibold ${
                  n === page ? "bg-brand-primary text-white" : "text-gray-400"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-card border border-gray-200 px-4 py-2 text-caption text-gray-500 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
