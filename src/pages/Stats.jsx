import { useState, useEffect } from "react"
import {
  PageHeader,
  HouseguestCard,
  EpisodeCard,
  EpisodeBreakdownSheet,
  HouseguestProfileSheet,
} from "@/components"
import { supabase } from "@/lib/supabase"
import { useCurrentPlayer } from "@/hooks/useCurrentPlayer"

function getInitials(name) {
  const parts = name.trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function dbStatusToBadge(status) {
  const map = {
    hoh:      "HOH",
    pov:      "POV Holder",
    nominee:  "Nominee",
    active:   "Safe",
    jury:     "Jury",
    evicted:  "Evicted",
    winner:   "Winner",
    have_not: "Have-Not",
  }
  return map[status] ?? "Safe"
}

function inferEpisodeColor(eventLabels) {
  if (eventLabels.some(l => l === "Won HOH"))            return "bg-status-hoh-light"
  if (eventLabels.some(l => l === "Won POV"))            return "bg-status-pov-light"
  if (eventLabels.some(l => l.startsWith("Evicted")))   return "bg-status-evicted-light"
  if (eventLabels.some(l => l === "Nominated"))          return "bg-status-nominee-light"
  return "bg-status-safe-light"
}

const TABS = ["Houseguests", "Episodes"]

export default function Stats() {
  const { playerId } = useCurrentPlayer()
  const [activeTab, setActiveTab] = useState("Houseguests")
  const [houseguests, setHouseguests] = useState([])
  const [seasonTotals, setSeasonTotals] = useState({})     // houseguest_id → total points
  const [positiveTotals, setPositiveTotals] = useState({}) // houseguest_id → sum of positive points
  const [negativeTotals, setNegativeTotals] = useState({}) // houseguest_id → sum of negative points
  const [weeks, setWeeks] = useState([])                   // [{weekNumber, totalPoints, yourPoints}]
  const [myWeeklyPts, setMyWeeklyPts] = useState({})      // weekNumber → current player's weekly_points
  const [eventsByWeek, setEventsByWeek] = useState({})    // weekNumber → [events]
  const [eventsByHG, setEventsByHG] = useState({})        // houseguest_id → [events]
  const [loading, setLoading] = useState(true)

  const [isEpisodeSheetOpen, setIsEpisodeSheetOpen] = useState(false)
  const [activeEpisode, setActiveEpisode] = useState(null)
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false)
  const [activeHouseguest, setActiveHouseguest] = useState(null)

  useEffect(() => {
    async function fetchData() {
      const [hgRes, eventsRes, episodesRes, scoresRes] = await Promise.all([
        supabase.from("houseguests").select("*").order("name"),
        supabase
          .from("houseguest_events")
          .select("*, houseguests(nickname, name), scoring_events(label, points)"),
        supabase
          .from("episodes")
          .select("id, week_number, episode_type, is_locked")
          .order("week_number"),
        supabase
          .from("scores")
          .select("weekly_points, draft_windows(week_number)")
          .eq("player_id", playerId),
      ])

      if (hgRes.error)      console.error("houseguests:", hgRes.error.message)
      if (eventsRes.error)  console.error("houseguest_events:", eventsRes.error.message)
      if (episodesRes.error) console.error("episodes:", episodesRes.error.message)
      if (scoresRes.error)  console.error("scores:", scoresRes.error.message)

      // Current player's weekly points per week
      const weeklyPts = {}
      scoresRes.data?.forEach(s => {
        const wn = s.draft_windows?.week_number
        if (wn !== undefined) weeklyPts[wn] = s.weekly_points
      })
      setMyWeeklyPts(weeklyPts)

      // Map episode_id → week_number
      const epWeekMap = {}
      episodesRes.data?.forEach(ep => { epWeekMap[ep.id] = ep.week_number })

      // Season totals (total, positive split, negative split) per houseguest
      const totals = {}
      const posTotals = {}
      const negTotals = {}
      eventsRes.data?.forEach(e => {
        totals[e.houseguest_id] = (totals[e.houseguest_id] ?? 0) + e.points_awarded
        if (e.points_awarded > 0) posTotals[e.houseguest_id] = (posTotals[e.houseguest_id] ?? 0) + e.points_awarded
        if (e.points_awarded < 0) negTotals[e.houseguest_id] = (negTotals[e.houseguest_id] ?? 0) + e.points_awarded
      })

      // Events grouped by week and by houseguest
      const byWeek = {}
      const byHouseguest = {}
      eventsRes.data?.forEach(e => {
        const wn = epWeekMap[e.episode_id]
        const enriched = { ...e, week_number: wn }

        if (wn !== undefined) {
          if (!byWeek[wn]) byWeek[wn] = []
          byWeek[wn].push(enriched)
        }

        if (!byHouseguest[e.houseguest_id]) byHouseguest[e.houseguest_id] = []
        byHouseguest[e.houseguest_id].push(enriched)
      })

      // Build sorted weeks list (most recent first)
      const uniqueWeeks = [...new Set(episodesRes.data?.map(ep => ep.week_number) ?? [])]
      const weekList = uniqueWeeks.map(wn => {
        const events = byWeek[wn] ?? []
        const totalPoints = events.reduce((sum, e) => sum + e.points_awarded, 0)
        return { weekNumber: wn, totalPoints, yourPoints: weeklyPts[wn] ?? 0 }
      }).sort((a, b) => b.weekNumber - a.weekNumber)

      setHouseguests(hgRes.data ?? [])
      setSeasonTotals(totals)
      setPositiveTotals(posTotals)
      setNegativeTotals(negTotals)
      setWeeks(weekList)
      setEventsByWeek(byWeek)
      setEventsByHG(byHouseguest)
      setLoading(false)
    }

    fetchData()
  }, [playerId])

  function openBreakdown(weekNumber) {
    const events = eventsByWeek[weekNumber] ?? []

    // Group events by houseguest
    const byHG = {}
    events.forEach(e => {
      const id = e.houseguest_id
      if (!byHG[id]) {
        byHG[id] = {
          name: e.houseguests.nickname,
          initials: getInitials(e.houseguests.name ?? e.houseguests.nickname),
          events: [],
          totalPoints: 0,
        }
      }
      byHG[id].events.push({ label: e.scoring_events.label, points: e.points_awarded })
      byHG[id].totalPoints += e.points_awarded
    })

    const hgList = Object.values(byHG).map(hg => ({
      name: hg.name,
      initials: hg.initials,
      color: inferEpisodeColor(hg.events.map(e => e.label)),
      episodePoints: hg.totalPoints,
      events: hg.events,
    })).sort((a, b) => b.episodePoints - a.episodePoints)

    const topScore = hgList.length > 0 ? Math.max(...hgList.map(h => h.episodePoints)) : 0
    const topScorers = hgList.filter(h => h.episodePoints === topScore).map(h => h.name)

    setActiveEpisode({
      episodeNumber: weekNumber,
      yourScore: myWeeklyPts[weekNumber] ?? 0,
      topScore,
      topScorers,
      houseguests: hgList,
    })
    setIsEpisodeSheetOpen(true)
  }

  function openProfile(hg) {
    const hgEvents = eventsByHG[hg.id] ?? []

    // Group events by week
    const byWeek = {}
    hgEvents.forEach(e => {
      const wn = e.week_number
      if (!byWeek[wn]) byWeek[wn] = { episodeNumber: wn, totalPoints: 0, positivePoints: 0, negativePoints: 0, events: [] }
      byWeek[wn].events.push({ name: e.scoring_events.label, points: e.points_awarded })
      byWeek[wn].totalPoints += e.points_awarded
      if (e.points_awarded > 0) byWeek[wn].positivePoints += e.points_awarded
      if (e.points_awarded < 0) byWeek[wn].negativePoints += e.points_awarded
    })

    // Show all weeks that have happened in the season, filling in 0-pt entries
    const allScoredWeeks = Object.keys(eventsByWeek).map(Number)
    const episodes = allScoredWeeks.map(wn =>
      byWeek[wn] ?? { episodeNumber: wn, totalPoints: 0, positivePoints: 0, negativePoints: 0, events: [] }
    ).sort((a, b) => b.episodeNumber - a.episodeNumber)

    setActiveHouseguest({
      name: hg.nickname,
      initials: getInitials(hg.name),
      imageSrc: hg.photo_url ?? null,
      instagramHandle: null,
      episodes,
    })
    setIsProfileSheetOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="Stats" />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-4">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-label transition-colors ${
              activeTab === tab
                ? "border-b-2 border-brand-primary text-brand-primary"
                : "text-gray-400"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4">
        {activeTab === "Houseguests" && (
          <div className="flex flex-col gap-3">
            {loading ? (
              <p className="text-caption text-gray-400 text-center mt-8">Loading…</p>
            ) : (
              houseguests.map(hg => (
                <HouseguestCard
                  key={hg.id}
                  name={hg.nickname}
                  status={dbStatusToBadge(hg.status)}
                  seasonPoints={seasonTotals[hg.id] ?? 0}
                  positivePoints={positiveTotals[hg.id] ?? 0}
                  negativePoints={negativeTotals[hg.id] ?? 0}
                  initials={getInitials(hg.name)}
                  imageSrc={hg.photo_url}
                  onProfilePress={() => openProfile(hg)}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "Episodes" && (
          <div className="flex flex-col gap-3">
            {loading ? (
              <p className="text-caption text-gray-400 text-center mt-8">Loading…</p>
            ) : weeks.length === 0 ? (
              <p className="text-caption text-gray-400 text-center mt-8">No episodes yet.</p>
            ) : (
              weeks.map(w => (
                <EpisodeCard
                  key={w.weekNumber}
                  episodeNumber={w.weekNumber}
                  totalPoints={w.totalPoints}
                  yourPoints={w.yourPoints}
                  onViewBreakdown={openBreakdown}
                />
              ))
            )}
          </div>
        )}
      </div>

      <EpisodeBreakdownSheet
        isOpen={isEpisodeSheetOpen}
        onClose={() => setIsEpisodeSheetOpen(false)}
        episode={activeEpisode}
      />

      <HouseguestProfileSheet
        isOpen={isProfileSheetOpen}
        onClose={() => setIsProfileSheetOpen(false)}
        houseguest={activeHouseguest}
      />
    </div>
  )
}
