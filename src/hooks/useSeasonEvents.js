import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useCurrentPlayer } from "@/hooks/useCurrentPlayer"
import { episodeLabel, episodeSortKey } from "@/lib/season"

const DRAFT_PICKS_FALLBACK = 6

export function useSeasonEvents() {
  const { playerId } = useCurrentPlayer()
  const [houseguests, setHouseguests] = useState([])
  const [events, setEvents] = useState([])                     // raw houseguest_events rows, joined
  const [seasonTotals, setSeasonTotals] = useState({})         // houseguest_id → total points
  const [positiveTotals, setPositiveTotals] = useState({})     // houseguest_id → sum of positive points
  const [negativeTotals, setNegativeTotals] = useState({})     // houseguest_id → sum of negative points
  const [episodes, setEpisodes] = useState([])                 // [{episodeId, weekNumber, episodeType, label, totalPoints, yourPoints}]
  const [episodeMeta, setEpisodeMeta] = useState({})           // episode_id → {weekNumber, episodeType, label}
  const [myEpisodePts, setMyEpisodePts] = useState({})         // episode_id → current player's points that episode
  const [playerEpisodeScores, setPlayerEpisodeScores] = useState({}) // episode_id → [{name, total}]
  const [eventsByEpisode, setEventsByEpisode] = useState({})   // episode_id → [events]
  const [eventsByHG, setEventsByHG] = useState({})             // houseguest_id → [events]
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [hgRes, eventsRes, episodesRes, picksRes, windowsRes] = await Promise.all([
        supabase.from("houseguests").select("*").order("nickname"),
        supabase
          .from("houseguest_events")
          .select("*, houseguests(nickname, name), scoring_events(key, label, category, points)"),
        supabase
          .from("episodes")
          .select("id, week_number, episode_type, label, is_locked")
          .order("week_number"),
        supabase
          .from("picks")
          .select("houseguest_id, player_id, players(display_name), draft_windows(week_number)"),
        supabase
          .from("draft_windows")
          .select("week_number, picks_per_player"),
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

      const picksPerPlayerByWeek = {}
      windowsRes.data?.forEach(w => { picksPerPlayerByWeek[w.week_number] = w.picks_per_player })

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

      // Build sorted episodes list (most recent first)
      const episodeList = Object.keys(epMeta).map(epId => {
        const meta = epMeta[epId]
        const eventsForEp = byEpisode[epId] ?? []

        // Sum points per houseguest for this episode
        const hgTotals = {}
        eventsForEp.forEach(e => {
          hgTotals[e.houseguest_id] = (hgTotals[e.houseguest_id] ?? 0) + e.points_awarded
        })

        // Top N HGs = max possible player score, where N is that week's
        // actual picks_per_player (not a hardcoded guess — draft windows can
        // now use different pick counts per week). Only positive scorers
        // count — a houseguest you didn't draft contributes 0, so a
        // negative-scoring houseguest is never part of the optimal picks.
        const picksPerPlayer = picksPerPlayerByWeek[meta.weekNumber] ?? DRAFT_PICKS_FALLBACK
        const topHgScores = Object.values(hgTotals)
          .filter(pts => pts > 0)
          .sort((a, b) => b - a)
          .slice(0, picksPerPlayer)
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

      const rankedHouseguests = [...(hgRes.data ?? [])].sort((a, b) => {
        const diff = (totals[b.id] ?? 0) - (totals[a.id] ?? 0)
        return diff !== 0 ? diff : (a.nickname ?? "").localeCompare(b.nickname ?? "")
      })

      setHouseguests(rankedHouseguests)
      setEvents(eventsRes.data ?? [])
      setSeasonTotals(totals)
      setPositiveTotals(posTotals)
      setNegativeTotals(negTotals)
      setEpisodes(episodeList)
      setEpisodeMeta(epMeta)
      setEventsByEpisode(byEpisode)
      setEventsByHG(byHouseguest)
      setMyEpisodePts(myEpisodeMap)
      setPlayerEpisodeScores(playerEpisodeScoresMap)
      setLoading(false)
    }

    fetchData()

    // Refetch whenever the commissioner scores an episode, so scores update
    // live instead of only on next page load.
    const channel = supabase
      .channel("stats-houseguest-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "houseguest_events" }, fetchData)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [playerId])

  return {
    houseguests,
    events,
    seasonTotals,
    positiveTotals,
    negativeTotals,
    episodes,
    episodeMeta,
    myEpisodePts,
    playerEpisodeScores,
    eventsByEpisode,
    eventsByHG,
    loading,
  }
}
