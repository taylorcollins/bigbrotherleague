import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronRight, DoorOpen } from "lucide-react"
import { PageHeader, Card, AiInsight } from "@/components"
import { useSeasonEvents } from "@/hooks/useSeasonEvents"
import { useAuth } from "@/context/AuthContext"

const LEADER_CARDS = [
  { label: "Most HOH wins", keys: ["hoh_win"] },
  { label: "Most POV wins", keys: ["pov_win"] },
  { label: "Most blockbusters", keys: ["blockbuster_win"] },
  { label: "Most block survivals", keys: ["surviving_block"] },
  { label: "Most alliances", keys: ["named_alliance"] },
  { label: "Most fights", keys: ["fight_episode"] },
]

const COLUMNS = [
  { label: "HOH", keys: ["hoh_win"] },
  { label: "POV", keys: ["pov_win"] },
  { label: "Blockbuster", keys: ["blockbuster_win"] },
  { label: "Nominated", keys: ["nominated"] },
]

const CHILD_PAGES = [
  { label: "Houseguest rankings", path: "/stats/houseguests" },
  { label: "Episode breakdown", path: "/stats/episodes" },
]

function countFor(countsByHouseguest, houseguestId, keys) {
  const counts = countsByHouseguest[houseguestId]
  if (!counts) return 0
  return keys.reduce((sum, key) => sum + (counts[key] ?? 0), 0)
}

export default function StatsLeaders() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { houseguests, events, seasonTotals, episodes, loading } = useSeasonEvents()
  const [insight, setInsight] = useState("")

  // Weeks elapsed so far this season — the denominator for each houseguest's
  // weekly average, so it drops for anyone evicted early rather than only
  // reflecting weeks they scored.
  const weekCount = useMemo(() => new Set(episodes.map(ep => ep.weekNumber)).size, [episodes])

  // houseguest_id -> scoring_event key -> count
  const countsByHouseguest = useMemo(() => {
    const map = {}
    events.forEach(e => {
      const key = e.scoring_events?.key
      if (!key) return
      if (!map[e.houseguest_id]) map[e.houseguest_id] = {}
      map[e.houseguest_id][key] = (map[e.houseguest_id][key] ?? 0) + 1
    })
    return map
  }, [events])

  const houseguestNames = useMemo(() => {
    const map = {}
    houseguests.forEach(hg => { map[hg.id] = hg.nickname })
    return map
  }, [houseguests])

  function leaderText(keys) {
    let max = 0
    let leaders = []
    houseguests.forEach(hg => {
      const count = countFor(countsByHouseguest, hg.id, keys)
      if (count > max) {
        max = count
        leaders = [hg.nickname]
      } else if (count === max && count > 0) {
        leaders.push(hg.nickname)
      }
    })
    return { max, names: leaders }
  }

  const columnMaxes = useMemo(() => {
    return COLUMNS.map(col => Math.max(0, ...houseguests.map(hg => countFor(countsByHouseguest, hg.id, col.keys))))
  }, [houseguests, countsByHouseguest])

  useEffect(() => {
    if (!session?.access_token) return
    let cancelled = false

    async function loadInsight() {
      try {
        const res = await fetch("/api/generate-stat-leader-insight", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to generate insight")
        if (!cancelled) setInsight(data.insight)
      } catch (err) {
        console.error("stat leader insight:", err.message)
      }
    }

    loadInsight()
    return () => { cancelled = true }
  }, [session])

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="Stats" />

      <div className="px-4 pt-2 flex flex-col gap-4">
        {loading ? (
          <p className="text-caption text-gray-400 text-center mt-8">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {LEADER_CARDS.map(card => {
                const { max, names } = leaderText(card.keys)
                return (
                  <Card key={card.label} noPadding className="p-3">
                    <p className="text-caption text-gray-400 uppercase tracking-wide">{card.label}</p>
                    {max === 0 ? (
                      <p className="text-body-1 text-gray-400 mt-1">No leader yet</p>
                    ) : (
                      <>
                        <p className="text-label text-gray-900 mt-1 truncate">{names.join(", ")}</p>
                        <p className="text-headline text-brand-primary">{max}</p>
                      </>
                    )}
                  </Card>
                )
              })}
            </div>

            <AiInsight text={insight} />

            <Card noPadding className="overflow-x-auto">
              <table className="w-full text-caption">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-semibold text-gray-400 px-3 py-2">Houseguest</th>
                    {COLUMNS.map(col => (
                      <th key={col.label} className="text-center font-semibold text-gray-400 px-2 py-2">{col.label}</th>
                    ))}
                    <th className="text-right font-semibold text-gray-400 px-3 py-2">Weekly avg</th>
                  </tr>
                </thead>
                <tbody>
                  {houseguests.map(hg => (
                    <tr key={hg.id} className="border-b border-gray-50 last:border-b-0">
                      <td className="px-3 py-2 text-label text-gray-900 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          {houseguestNames[hg.id]}
                          {hg.status === "evicted" && (
                            <DoorOpen size={13} className="text-status-evicted shrink-0" aria-label="Evicted" />
                          )}
                        </span>
                      </td>
                      {COLUMNS.map((col, i) => {
                        const count = countFor(countsByHouseguest, hg.id, col.keys)
                        const isNominated = col.label === "Nominated"
                        const isLeader = count > 0 && count === columnMaxes[i]
                        const cellColor = isNominated
                          ? (count > 0 ? "font-semibold text-status-nominee" : "text-gray-600")
                          : (isLeader ? "font-semibold text-brand-primary" : "text-gray-600")
                        return (
                          <td
                            key={col.label}
                            className={`text-center px-2 py-2 ${cellColor}`}
                          >
                            {count}
                          </td>
                        )
                      })}
                      <td className="text-right px-3 py-2 font-semibold text-gray-900">
                        {weekCount > 0 ? ((seasonTotals[hg.id] ?? 0) / weekCount).toFixed(1) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

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
