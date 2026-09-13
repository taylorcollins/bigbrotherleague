import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { PageHeader, LeaderboardRow } from "@/components"
import { usePlayerStandings } from "@/hooks/usePlayerStandings"

function getInitials(name) {
  const parts = (name ?? "").trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name ?? "??").slice(0, 2).toUpperCase()
}

const MEDALS = { 1: "gold", 2: "silver", 3: "bronze" }
function medalForRank(rank) {
  return MEDALS[rank] ?? null
}

const CHILD_PAGES = [
  { label: "Season leaderboard — by %", path: "/leaderboard/season-percentage" },
  { label: "Season leaderboard — by points", path: "/leaderboard/season-points" },
  { label: "Weekly leaderboard", path: "/leaderboard/weekly" },
]

export default function Leaderboard() {
  const navigate = useNavigate()
  const { players: standings, availableWeeks, finishedWeeks, loading } = usePlayerStandings()

  const latestWeek = availableWeeks.length ? availableWeeks[0] : null
  const latestWeekIsFinished = latestWeek !== null && finishedWeeks.has(latestWeek)

  const topSeasonByPoints = useMemo(() => {
    return standings
      .filter(p => p.weeksPlayed > 0)
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((p, i) => ({
        id:       p.id,
        username: p.displayName,
        initials: getInitials(p.displayName),
        score:    p.score,
        rank:     i + 1,
        medal:    medalForRank(i + 1),
      }))
  }, [standings])

  const topWeekByScore = useMemo(() => {
    if (latestWeek === null) return []
    return standings
      .filter(p => latestWeek in p.weeklyPoints)
      .map(p => ({ ...p, weekScore: p.weeklyPoints[latestWeek] }))
      .sort((a, b) => b.weekScore - a.weekScore)
      .slice(0, 3)
      .map((p, i) => ({
        id:       p.id,
        username: p.displayName,
        initials: getInitials(p.displayName),
        score:    p.weekScore,
        rank:     i + 1,
        medal:    latestWeekIsFinished ? medalForRank(i + 1) : null,
      }))
  }, [standings, latestWeek, latestWeekIsFinished])

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="Leaderboard" />

      <div className="px-4 pt-2 flex flex-col gap-4">
        {loading ? (
          <p className="text-caption text-gray-400 text-center mt-8">Loading…</p>
        ) : (
          <>
            <div>
              <p className="text-headline text-gray-900 mb-2">Top scores — season</p>
              {topSeasonByPoints.length ? (
                <div className="flex flex-col gap-3">
                  {topSeasonByPoints.map(player => (
                    <LeaderboardRow
                      key={player.id}
                      rank={player.rank}
                      username={player.username}
                      initials={player.initials}
                      score={player.score}
                      medal={player.medal}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-caption text-gray-400">No scores yet this season.</p>
              )}
            </div>

            <div>
              <p className="text-headline text-gray-900 mb-2">
                Top scores — {latestWeek !== null ? `Week ${latestWeek}` : "this week"}
              </p>
              {latestWeek !== null && !latestWeekIsFinished && (
                <p className="text-caption text-gray-400 mb-2">
                  Medals award once Week {latestWeek}'s scoring is locked in.
                </p>
              )}
              {topWeekByScore.length ? (
                <div className="flex flex-col gap-3">
                  {topWeekByScore.map(player => (
                    <LeaderboardRow
                      key={player.id}
                      rank={player.rank}
                      username={player.username}
                      initials={player.initials}
                      score={player.score}
                      medal={player.medal}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-caption text-gray-400">No scores yet this week.</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {CHILD_PAGES.map(page => (
                <button
                  key={page.path}
                  onClick={() => navigate(page.path)}
                  className="flex items-center justify-between bg-white rounded-card border border-gray-100 px-4 py-3"
                >
                  <span className="text-label text-gray-900">{page.label}</span>
                  <ChevronRight size={18} className="text-gray-400" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
