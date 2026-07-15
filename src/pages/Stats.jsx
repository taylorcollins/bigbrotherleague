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
import { episodeLabel, episodeSortKey } from "@/lib/season"

function getInitials(name) {
  const parts = name.trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
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
  const [episodes, setEpisodes] = useState([])                 // [{episodeId, weekNumber, episodeType, label, totalPoints, yourPoints}]
  const [episodeMeta, setEpisodeMeta] = useState({})           // episode_id → {weekNumber, episodeType, label}
  const [myEpisodePts, setMyEpisodePts] = useState({})         // episode_id → current player's points that episode
  const [playerEpisodeScores, setPlayerEpisodeScores] = useState({}) // episode_id → [{name, total}]
  const [eventsByEpisode, setEventsByEpisode] = useState({})   // episode_id → [events]
  const [eventsByHG, setEventsByHG] = useState({})             // houseguest_id → [events]
  const [loading, setLoading] = useState(true)

  const [isEpisodeSheetOpen, setIsEpisodeSheetOpen] = useState(false)
  const [activeEpisode, setActiveEpisode] = useState(null)
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false)
  const [activeHouseguest, setActiveHouseguest] = useState(null)

  useEffect(() => {
    async function fetchData() {
      const [hgRes, eventsRes, episodesRes, picksRes] = await Promise.all([
        supabase.from("houseguests").select("*").order("name"),
        supabase
          .from("houseguest_events")
          .select("*, houseguests(nickname, name), scoring_events(label, points)"),
        supabase
          .from("episodes")
          .select("id, week_number, episode_type, label, is_locked")
          .order("week_number"),
        supabase
          .from("picks")
          .select("houseguest_id, player_id, players(display_name), draft_windows(week_number)"),
      ])

      if (hgRes.error)      console.error("houseguests:", hgRes.error.message)
      if (eventsRes.error)  console.error("houseguest_events:", eventsRes.error.message)
      if (episodesRes.error) console.error("episodes:", episodesRes.error.message)

      // Map episode_id → {weekNumber, episodeType, label}, and week → episode ids
      const epMeta = {}
      const weekToEpisodeIds = {}
      episodesRes.data?.forEach(ep => {
        epMeta[ep.id] = { weekNumber: ep.week_number, episodeType: ep.episode_type, label: episodeLabel(ep.week_number, ep.episode_type, ep.label) }
        if (!weekToEpisodeIds[ep.week_number]) weekToEpisodeIds[ep.week_number] = []
        weekToEpisodeIds[ep.week_number].push(ep.id)
      })

      // Season totals (total, positive split, negative split) per houseguest
      const totals = {}
      const posTotals = {}
      const negTotals = {}
      eventsRes.data?.forEach(e => {
        totals[e.houseguest_id] = (totals[e.houseguest_id] ?? 0) + e.points_awarded
        if (e.points_awarded > 0) posTotals[e.houseguest_id] = (posTotals[e.houseguest_id] ?? 0) + e.points_awarded
        if (e.points_awarded < 0) negTotals[e.houseguest_id] = (negTotals[e.houseguest_id] ?? 0) + e.points_awarded
      })

      // Events grouped by episode and by houseguest
      const byEpisode = {}
      const byHouseguest = {}
      eventsRes.data?.forEach(e => {
        const meta = epMeta[e.episode_id]
        const enriched = { ...e, week_number: meta?.weekNumber }

        if (meta) {
          if (!byEpisode[e.episode_id]) byEpisode[e.episode_id] = []
          byEpisode[e.episode_id].push(enriched)
        }

        if (!byHouseguest[e.houseguest_id]) byHouseguest[e.houseguest_id] = []
        byHouseguest[e.houseguest_id].push(enriched)
      })

      const DRAFT_PICKS = 6

      // Build hgEpisodePoints map for player score calculation
      const hgEpisodePts = {}
      eventsRes.data?.forEach(e => {
        if (!epMeta[e.episode_id]) return
        if (!hgEpisodePts[e.houseguest_id]) hgEpisodePts[e.houseguest_id] = {}
        hgEpisodePts[e.houseguest_id][e.episode_id] = (hgEpisodePts[e.houseguest_id][e.episode_id] ?? 0) + e.points_awarded
      })

      // Compute each player's total per episode from their picks (a pick is
      // valid for every episode in that draft window's week)
      const playerEpisodeMap = {}
      const myEpisodeMap = {}
      picksRes.data?.forEach(pick => {
        const wn = pick.draft_windows?.week_number
        const name = pick.players?.display_name
        if (!wn || !name) return
        ;(weekToEpisodeIds[wn] ?? []).forEach(epId => {
          const pts = hgEpisodePts[pick.houseguest_id]?.[epId] ?? 0
          if (!playerEpisodeMap[epId]) playerEpisodeMap[epId] = {}
          playerEpisodeMap[epId][name] = (playerEpisodeMap[epId][name] ?? 0) + pts
          if (pick.player_id === playerId) {
            myEpisodeMap[epId] = (myEpisodeMap[epId] ?? 0) + pts
          }
        })
      })
      setMyEpisodePts(myEpisodeMap)

      // Build sorted episodes list (most recent first)
      const episodeList = Object.keys(epMeta).map(epId => {
        const meta = epMeta[epId]
        const events = byEpisode[epId] ?? []

        // Sum points per houseguest for this episode
        const hgTotals = {}
        events.forEach(e => {
          hgTotals[e.houseguest_id] = (hgTotals[e.houseguest_id] ?? 0) + e.points_awarded
        })

        // Top DRAFT_PICKS HGs = max possible player score
        const topHgScores = Object.values(hgTotals)
          .sort((a, b) => b - a)
          .slice(0, DRAFT_PICKS)
        const totalPoints = topHgScores.reduce((s, pts) => s + pts, 0)

        return {
          episodeId: epId,
          weekNumber: meta.weekNumber,
          episodeType: meta.episodeType,
          label: meta.label,
          totalPoints,
          yourPoints: myEpisodeMap[epId] ?? 0,
        }
      }).sort((a, b) => episodeSortKey(b.weekNumber, b.episodeType) - episodeSortKey(a.weekNumber, a.episodeType))

      // Convert to sorted arrays per episode
      const playerEpisodeScoresMap = {}
      Object.entries(playerEpisodeMap).forEach(([epId, playerPts]) => {
        playerEpisodeScoresMap[epId] = Object.entries(playerPts)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)
      })

      setHouseguests(hgRes.data ?? [])
      setSeasonTotals(totals)
      setPositiveTotals(posTotals)
      setNegativeTotals(negTotals)
      setEpisodes(episodeList)
      setEpisodeMeta(epMeta)
      setEventsByEpisode(byEpisode)
      setEventsByHG(byHouseguest)
      setPlayerEpisodeScores(playerEpisodeScoresMap)
      setLoading(false)
    }

    fetchData()
  }, [playerId])

  function openBreakdown(episodeId) {
    const events = eventsByEpisode[episodeId] ?? []

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

    const playerScores = playerEpisodeScores[episodeId] ?? []
    const topScore = playerScores[0]?.total ?? 0
    const topScorers = playerScores.filter(p => p.total === topScore).map(p => p.name)

    setActiveEpisode({
      label: episodeMeta[episodeId]?.label ?? "Episode",
      yourScore: myEpisodePts[episodeId] ?? 0,
      topScore,
      topScorers,
      houseguests: hgList,
    })
    setIsEpisodeSheetOpen(true)
  }

  function openProfile(hg) {
    const hgEvents = eventsByHG[hg.id] ?? []

    // Group events by episode
    const byEp = {}
    hgEvents.forEach(e => {
      const epId = e.episode_id
      const meta = episodeMeta[epId]
      if (!byEp[epId]) {
        byEp[epId] = {
          id: epId,
          label: meta?.label ?? "Episode",
          sortKey: episodeSortKey(meta?.weekNumber ?? 0, meta?.episodeType),
          totalPoints: 0,
          positivePoints: 0,
          negativePoints: 0,
          events: [],
        }
      }
      byEp[epId].events.push({ name: e.scoring_events.label, points: e.points_awarded })
      byEp[epId].totalPoints += e.points_awarded
      if (e.points_awarded > 0) byEp[epId].positivePoints += e.points_awarded
      if (e.points_awarded < 0) byEp[epId].negativePoints += e.points_awarded
    })

    // Show every episode recorded so far, filling in 0-pt entries
    const allEpisodeIds = Object.keys(eventsByEpisode)
    const hgEpisodes = allEpisodeIds.map(epId => {
      const meta = episodeMeta[epId]
      return byEp[epId] ?? {
        id: epId,
        label: meta?.label ?? "Episode",
        sortKey: episodeSortKey(meta?.weekNumber ?? 0, meta?.episodeType),
        totalPoints: 0,
        positivePoints: 0,
        negativePoints: 0,
        events: [],
      }
    }).sort((a, b) => b.sortKey - a.sortKey)

    setActiveHouseguest({
      name: hg.nickname,
      initials: getInitials(hg.name),
      imageSrc: hg.photo_url ?? null,
      age: hg.age ?? null,
      hometown: hg.hometown ?? null,
      instagramHandle: hg.instagram_handle ?? null,
      episodes: hgEpisodes,
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
                  status={hg.status}
                  seasonPoints={seasonTotals[hg.id] ?? 0}
                  positivePoints={positiveTotals[hg.id] ?? 0}
                  negativePoints={negativeTotals[hg.id] ?? 0}
                  initials={getInitials(hg.name)}
                  imageSrc={hg.photo_url}
                  onProfilePress={() => openProfile(hg)}
                  avatarSize="xl"
                />
              ))
            )}
          </div>
        )}

        {activeTab === "Episodes" && (
          <div className="flex flex-col gap-3">
            {loading ? (
              <p className="text-caption text-gray-400 text-center mt-8">Loading…</p>
            ) : episodes.length === 0 ? (
              <p className="text-caption text-gray-400 text-center mt-8">No episodes yet.</p>
            ) : (
              episodes.map(ep => (
                <EpisodeCard
                  key={ep.episodeId}
                  episodeId={ep.episodeId}
                  label={ep.label}
                  totalPoints={ep.totalPoints}
                  yourPoints={ep.yourPoints}
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
