import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
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

const TABS = [
  { key: "week", label: "Week" },
  { key: "season", label: "Season" },
]

export default function Leaderboard() {
  const { playerId } = useCurrentPlayer()
  const { players: standings, availableWeeks, finishedWeeks, loading } = usePlayerStandings()
  const [tab, setTab] = useState("week")
  const [selectedWeek, setSelectedWeek] = useState(null) // null until the player picks one, or availableWeeks loads
  const [page, setPage] = useState(1)

  const minWeek = availableWeeks.length ? Math.min(...availableWeeks) : null
  const maxWeek = availableWeeks.length ? Math.max(...availableWeeks) : null
  const displayWeek = selectedWeek ?? (availableWeeks.length ? availableWeeks[0] : null)

  // Reset pagination when the active tab or week changes — compared and
  // applied during render (React's "adjusting state on a prop change"
  // pattern) rather than in an effect, so it takes effect in the same pass.
  const [pageResetKey, setPageResetKey] = useState(null)
  const currentPageResetKey = `${tab}-${displayWeek}`
  if (currentPageResetKey !== pageResetKey) {
    setPageResetKey(currentPageResetKey)
    if (page !== 1) setPage(1)
  }

  const weekRanking = useMemo(() => {
    if (displayWeek === null) return []
    return standings
      .filter(p => displayWeek in p.weeklyPoints)
      .map(p => ({ ...p, weekScore: p.weeklyPoints[displayWeek] }))
      .sort((a, b) => b.weekScore - a.weekScore)
      .map((p, i) => ({ ...p, weekRank: i + 1 }))
  }, [standings, displayWeek])

  const weekIsFinished = displayWeek !== null && finishedWeeks.has(displayWeek)

  const seasonPlayers = standings.map(p => ({
    id:       p.id,
    username: p.displayName,
    initials: getInitials(p.displayName),
    score:    formatPercentage(p.percentage),
    rank:     p.rank,
    medal:    medalForRank(p.rank),
    detail:   `${p.weeksPlayed} week${p.weeksPlayed === 1 ? "" : "s"}`,
  }))

  const weekPlayers = weekRanking.map(p => ({
    id:       p.id,
    username: p.displayName,
    initials: getInitials(p.displayName),
    score:    p.weekScore,
    rank:     p.weekRank,
    medal:    weekIsFinished ? medalForRank(p.weekRank) : null,
  }))

  const visiblePlayers = tab === "week" ? weekPlayers : seasonPlayers
  const currentSeasonPlayer = seasonPlayers.find(p => p.id === playerId) ?? null
  const currentWeekPlayer = weekPlayers.find(p => p.id === playerId) ?? null

  const totalPages = Math.max(1, Math.ceil(visiblePlayers.length / PAGE_SIZE))
  const visible = visiblePlayers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="Leaderboard" />

      <div className="flex flex-col gap-4 px-4">
        <div className="flex gap-2">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-pill px-3 py-1.5 text-caption font-semibold transition-colors ${
                tab === t.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "week" && displayWeek !== null && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setSelectedWeek(Math.max(minWeek, displayWeek - 1))}
              disabled={displayWeek === minWeek}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-caption text-gray-500">Week {displayWeek}</span>
            <button
              onClick={() => setSelectedWeek(Math.min(maxWeek, displayWeek + 1))}
              disabled={displayWeek === maxWeek}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {tab === "week" && displayWeek !== null && !weekIsFinished && (
          <p className="text-caption text-gray-400 text-center -mt-2">
            Medals award once Week {displayWeek}'s scoring is locked in.
          </p>
        )}

        {tab === "week" ? (
          currentWeekPlayer ? (
            <Card>
              <p className="text-headline font-bold text-gray-900">{currentWeekPlayer.username}</p>
              <div className="flex gap-6 mt-2">
                <StatPair label={`Rank (Week ${displayWeek})`} value={`#${currentWeekPlayer.rank}`} />
                <StatPair label="Points" value={currentWeekPlayer.score} valueColor="text-brand-primary" />
              </div>
            </Card>
          ) : (
            !loading && displayWeek !== null && (
              <Card>
                <p className="text-body-1 text-gray-400">You didn't make picks for Week {displayWeek}.</p>
              </Card>
            )
          )
        ) : (
          currentSeasonPlayer && (
            <Card>
              <p className="text-headline font-bold text-gray-900">{currentSeasonPlayer.username}</p>
              <div className="flex gap-6 mt-2">
                <StatPair label="Rank" value={currentSeasonPlayer.rank != null ? `#${currentSeasonPlayer.rank}` : "—"} />
                <StatPair label="Scoring %" value={currentSeasonPlayer.score} valueColor="text-brand-primary" />
              </div>
            </Card>
          )
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
