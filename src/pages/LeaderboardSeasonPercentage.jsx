import { useState } from "react"
import { PageHeader, Card, LeaderboardRow, StatPair } from "@/components"
import { useCurrentPlayer } from "@/hooks/useCurrentPlayer"
import { usePlayerStandings } from "@/hooks/usePlayerStandings"

function getInitials(name) {
  const parts = (name ?? "").trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name ?? "??").slice(0, 2).toUpperCase()
}

function formatPercentage(percentage) {
  return percentage != null ? `${Math.round(percentage * 100)}%` : "—"
}

const MEDALS = { 1: "gold", 2: "silver", 3: "bronze" }
function medalForRank(rank) {
  return MEDALS[rank] ?? null
}

const PAGE_SIZE = 10

export default function LeaderboardSeasonPercentage() {
  const { playerId } = useCurrentPlayer()
  const { players: standings, loading } = usePlayerStandings()
  const [page, setPage] = useState(1)

  const players = standings.map(p => ({
    id:       p.id,
    username: p.displayName,
    initials: getInitials(p.displayName),
    score:    formatPercentage(p.percentage),
    rank:     p.rank,
    medal:    medalForRank(p.rank),
    detail:   `${p.weeksPlayed} week${p.weeksPlayed === 1 ? "" : "s"}`,
  }))

  const currentPlayer = players.find(p => p.id === playerId) ?? null

  const totalPages = Math.max(1, Math.ceil(players.length / PAGE_SIZE))
  const visible = players.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="By %" backTo="/leaderboard" />

      <div className="flex flex-col gap-4 px-4">
        {currentPlayer && (
          <Card>
            <p className="text-headline font-bold text-gray-900">{currentPlayer.username}</p>
            <div className="flex gap-6 mt-2">
              <StatPair label="Rank" value={currentPlayer.rank != null ? `#${currentPlayer.rank}` : "—"} />
              <StatPair label="Scoring %" value={currentPlayer.score} valueColor="text-brand-primary" />
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
                rank={player.rank ?? "—"}
                username={player.username}
                initials={player.initials}
                score={player.score}
                medal={player.medal}
                detail={player.detail}
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
