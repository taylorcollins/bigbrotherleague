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
  const [players, setPlayers] = useState([])
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function fetchData() {
      const [playersRes, scoresRes] = await Promise.all([
        supabase.from("players").select("id, display_name"),
        supabase
          .from("scores")
          .select("player_id, season_points, season_rank, draft_windows(week_number)"),
      ])

      if (playersRes.error) console.error("players:", playersRes.error.message)
      if (scoresRes.error) console.error("scores:", scoresRes.error.message)

      // Build player name map
      const playerMap = {}
      playersRes.data?.forEach(p => { playerMap[p.id] = p.display_name })

      // Per player, keep the scores entry with the highest week_number (most current)
      const latestScore = {}
      scoresRes.data?.forEach(s => {
        const wn = s.draft_windows?.week_number ?? 0
        if (!latestScore[s.player_id] || wn > latestScore[s.player_id].weekNumber) {
          latestScore[s.player_id] = {
            seasonPoints: s.season_points,
            seasonRank: s.season_rank,
            weekNumber: wn,
          }
        }
      })

      // Build ranked list sorted by season_rank
      const ranked = Object.entries(latestScore).map(([playerId, score]) => ({
        id: playerId,
        username: playerMap[playerId] ?? "Unknown",
        initials: getInitials(playerMap[playerId]),
        score: score.seasonPoints,
        rank: score.seasonRank,
      })).sort((a, b) => a.rank - b.rank)

      // Pull out the current player's entry for the header card
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
        {/* Current user card */}
        {currentPlayer && (
          <Card>
            <p className="text-headline font-bold text-gray-900">{currentPlayer.username}</p>
            <div className="flex gap-6 mt-2">
              <StatPair label="Rank" value={`#${currentPlayer.rank}`} />
              <StatPair label="Score" value={currentPlayer.score} valueColor="text-brand-primary" />
            </div>
          </Card>
        )}

        {/* Player list */}
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

        {/* Pagination — only show if more than one page */}
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
                  n === page
                    ? "bg-brand-primary text-white"
                    : "text-gray-400"
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
