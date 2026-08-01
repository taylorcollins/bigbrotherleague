import { useState, useEffect } from "react"
import { ChevronRight } from "lucide-react"
import { PageHeader, DraftBanner, HouseguestCard, RankCard, HouseguestProfileSheet, WeekHistorySheet, Card } from "@/components"
import { supabase } from "@/lib/supabase"
import { useCurrentPlayer } from "@/hooks/useCurrentPlayer"
import { LEAGUE_ID, calculatedWeek, episodeLabel, episodeSortKey } from "@/lib/season"

function getInitials(name) {
  const parts = (name ?? "").trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name ?? "??").slice(0, 2).toUpperCase()
}


function ptsColor(pts) {
  if (pts > 0) return "text-brand-primary"
  if (pts < 0) return "text-status-nominee"
  return "text-gray-400"
}

// Episode labels are "Week N · Type" (see episodeLabel in lib/season.js) —
// strip the week prefix since these show up inside a Week N sheet.
function shortEpisodeLabel(label) {
  return label?.replace(/^Week \d+ · /, "") || "Episode"
}

function WeekHistoryRow({ weekNumber, totalPoints, onPress }) {
  return (
    <button onClick={onPress} className="w-full text-left">
      <Card className="flex items-center justify-between">
        <p className="text-label font-semibold text-gray-900">Week {weekNumber}</p>
        <div className="flex items-center gap-2">
          <span className={`text-label font-semibold ${ptsColor(totalPoints)}`}>
            {totalPoints > 0 ? `+${totalPoints}` : totalPoints} pts
          </span>
          <ChevronRight size={18} className="text-gray-400" />
        </div>
      </Card>
    </button>
  )
}

export default function Game() {
  const { playerId } = useCurrentPlayer()
  const [uniquePicks, setUniquePicks]   = useState([])   // deduplicated HGs for "This week's team"
  const [picksByWeek, setPicksByWeek]   = useState({})   // weekNumber → picks[] for history
  const [hgByNickname, setHgByNickname] = useState({})  // nickname → { hg, events[] }
  const [myRank, setMyRank]             = useState(null)
  const [myScore, setMyScore]           = useState(null)
  const [currentWeek, setCurrentWeek]   = useState(null)
  const [loading, setLoading]           = useState(true)
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false)
  const [activeHouseguest, setActiveHouseguest]     = useState(null)
  const [episodeMeta, setEpisodeMeta]   = useState({})   // episode_id → {weekNumber, label, sortKey}
  const [allEpisodeIds, setAllEpisodeIds] = useState([])
  const [weekToEpisodes, setWeekToEpisodes] = useState({}) // weekNumber → [{id, label}] chronological
  const [weekTotals, setWeekTotals]     = useState({})   // weekNumber → total points that week
  const [weekSummary, setWeekSummary]   = useState(null) // week_summaries.summary for currentWeek, or null
  const [isWeekSheetOpen, setIsWeekSheetOpen] = useState(false)
  const [activeWeek, setActiveWeek]     = useState(null)

  useEffect(() => {
    if (!playerId) return
    async function fetchData() {
      const [picksRes, eventsRes, episodesRes, allPicksRes, leagueRes] = await Promise.all([
        supabase
          .from("picks")
          .select("houseguest_id, draft_window_id, houseguests(id, nickname, name, photo_url, status, age, hometown, instagram_handle), draft_windows(week_number)")
          .eq("player_id", playerId),

        supabase
          .from("houseguest_events")
          .select("*, houseguests(id, nickname, name, photo_url, age, hometown, instagram_handle), scoring_events(label, points)"),

        supabase
          .from("episodes")
          .select("id, week_number, episode_type, label"),

        // All players' picks to calculate live rank
        supabase
          .from("picks")
          .select("player_id, houseguest_id, draft_windows(week_number)"),

        supabase
          .from("leagues")
          .select("current_week_override")
          .eq("id", LEAGUE_ID)
          .single(),

      ])

      if (picksRes.error)    console.error("picks:",    picksRes.error.message)
      if (eventsRes.error)   console.error("events:",   eventsRes.error.message)
      if (allPicksRes.error) console.error("allPicks:", allPicksRes.error.message)

      // --- Episode metadata ---
      const epMeta = {}
      episodesRes.data?.forEach(ep => {
        epMeta[ep.id] = {
          weekNumber: ep.week_number,
          label: episodeLabel(ep.week_number, ep.episode_type, ep.label),
          sortKey: episodeSortKey(ep.week_number, ep.episode_type),
        }
      })
      setEpisodeMeta(epMeta)
      setAllEpisodeIds(episodesRes.data?.map(ep => ep.id) ?? [])

      // --- Episodes grouped by week, chronological (premiere → nominations → pov → eviction) ---
      const weekToEp = {}
      episodesRes.data?.forEach(ep => {
        if (!weekToEp[ep.week_number]) weekToEp[ep.week_number] = []
        weekToEp[ep.week_number].push({ id: ep.id, label: epMeta[ep.id].label, sortKey: epMeta[ep.id].sortKey })
      })
      Object.values(weekToEp).forEach(list => list.sort((a, b) => a.sortKey - b.sortKey))
      setWeekToEpisodes(weekToEp)

      // --- Events grouped by HG nickname ---
      const byNickname = {}
      eventsRes.data?.forEach(e => {
        const hg = e.houseguests
        if (!hg) return
        if (!byNickname[hg.nickname]) byNickname[hg.nickname] = { hg, events: [] }
        byNickname[hg.nickname].events.push({ ...e, week_number: epMeta[e.episode_id]?.weekNumber })
      })

      setHgByNickname(byNickname)

      const weekNow = leagueRes.data?.current_week_override ?? calculatedWeek()
      setCurrentWeek(weekNow)

      const { data: summaryRow } = await supabase
        .from("week_summaries")
        .select("summary")
        .eq("league_id", LEAGUE_ID)
        .eq("week_number", weekNow)
        .maybeSingle()
      setWeekSummary(summaryRow?.summary ?? null)

      const byWeek = {}

      ;(picksRes.data ?? []).forEach(p => {
        const wn = p.draft_windows?.week_number
        if (wn !== undefined) {
          if (!byWeek[wn]) byWeek[wn] = []
          byWeek[wn].push(p)
        }
      })
      Object.values(byWeek).forEach(picks =>
        picks.sort((a, b) => (a.houseguests?.nickname ?? "").localeCompare(b.houseguests?.nickname ?? ""))
      )

      // "This week's team" = picks locked in for the current BBL week specifically —
      // picks made for an upcoming week's draft don't count until that week arrives.
      setUniquePicks(byWeek[weekNow] ?? [])
      setPicksByWeek(byWeek)

      // --- Live score calculation ---
      // Group events by houseguest + week
      const hgWeekPoints = {}
      eventsRes.data?.forEach(e => {
        const wn = epMeta[e.episode_id]?.weekNumber
        if (wn === undefined) return
        if (!hgWeekPoints[e.houseguest_id]) hgWeekPoints[e.houseguest_id] = {}
        hgWeekPoints[e.houseguest_id][wn] = (hgWeekPoints[e.houseguest_id][wn] ?? 0) + e.points_awarded
      })

      // My season total: sum points per pick, only for the week they were picked
      const mySeasonTotal = (picksRes.data ?? []).reduce((sum, p) => {
        const wn = p.draft_windows?.week_number
        return sum + (wn != null ? (hgWeekPoints[p.houseguest_id]?.[wn] ?? 0) : 0)
      }, 0)

      // Per-week totals, for the history row list
      const weekTotalsMap = {}
      Object.entries(byWeek).forEach(([wn, picks]) => {
        weekTotalsMap[wn] = picks.reduce((sum, p) => sum + (hgWeekPoints[p.houseguest_id]?.[Number(wn)] ?? 0), 0)
      })
      setWeekTotals(weekTotalsMap)

      // All players' season totals for rank calculation
      const playerTotals = {}
      ;(allPicksRes.data ?? []).forEach(p => {
        const wn = p.draft_windows?.week_number
        const pts = wn != null ? (hgWeekPoints[p.houseguest_id]?.[wn] ?? 0) : 0
        playerTotals[p.player_id] = (playerTotals[p.player_id] ?? 0) + pts
      })
      const allScores = Object.values(playerTotals)
      const scoresAreUniform = allScores.length === 0 || allScores.every(s => s === allScores[0])
      const myRankVal = scoresAreUniform ? null : allScores.filter(s => s > mySeasonTotal).length + 1

      setMyScore(mySeasonTotal)
      setMyRank(myRankVal)
      setLoading(false)
    }

    fetchData()
  }, [playerId])

  function openProfile(hg, nickname) {
    const entry = hgByNickname[nickname]
    const byEp = {}
    entry?.events.forEach(e => {
      const epId = e.episode_id
      const meta = episodeMeta[epId]
      if (!byEp[epId]) {
        byEp[epId] = {
          id: epId,
          label: meta?.label ?? "Episode",
          sortKey: meta?.sortKey ?? 0,
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
    const episodes = allEpisodeIds.map(epId => {
      const meta = episodeMeta[epId]
      return byEp[epId] ?? {
        id: epId,
        label: meta?.label ?? "Episode",
        sortKey: meta?.sortKey ?? 0,
        totalPoints: 0,
        positivePoints: 0,
        negativePoints: 0,
        events: [],
      }
    }).sort((a, b) => b.sortKey - a.sortKey)

    setActiveHouseguest({
      name: nickname,
      initials: hg ? getInitials(hg.name) : nickname.slice(0, 2).toUpperCase(),
      imageSrc: hg?.photo_url ?? null,
      age: hg?.age ?? null,
      hometown: hg?.hometown ?? null,
      instagramHandle: hg?.instagram_handle ?? null,
      episodes,
    })
    setIsProfileSheetOpen(true)
  }

  function openWeekHistory(weekNumber) {
    const picks = picksByWeek[weekNumber] ?? []

    const houseguestsList = picks.map(p => {
      const hg = p.houseguests
      const nickname = hg?.nickname ?? ""
      const allEvents = hgByNickname[nickname]?.events ?? []
      const weekEvents = allEvents.filter(e => e.week_number === weekNumber)
      return {
        houseguestId: p.houseguest_id,
        nickname,
        initials: hg ? getInitials(hg.name) : nickname.slice(0, 2).toUpperCase(),
        imageSrc: hg?.photo_url ?? null,
        points: weekEvents.reduce((sum, e) => sum + e.points_awarded, 0),
        positivePts: weekEvents.filter(e => e.points_awarded > 0).reduce((sum, e) => sum + e.points_awarded, 0),
        negativePts: weekEvents.filter(e => e.points_awarded < 0).reduce((sum, e) => sum + e.points_awarded, 0),
        events: weekEvents.map(e => ({ label: e.scoring_events.label, points: e.points_awarded })),
      }
    })

    // Per-episode breakdown: for each episode in this week, every picked
    // houseguest's points and events during that specific episode.
    const episodesList = (weekToEpisodes[weekNumber] ?? []).map(ep => {
      const hgBreakdown = picks.map(p => {
        const nickname = p.houseguests?.nickname ?? ""
        const events = (hgByNickname[nickname]?.events ?? []).filter(e => e.episode_id === ep.id)
        return {
          nickname,
          points: events.reduce((sum, e) => sum + e.points_awarded, 0),
          events: events.map(e => ({ label: e.scoring_events.label, points: e.points_awarded })),
        }
      }).sort((a, b) => b.points - a.points)

      return {
        id: ep.id,
        label: shortEpisodeLabel(ep.label),
        totalPoints: hgBreakdown.reduce((sum, hg) => sum + hg.points, 0),
        houseguests: hgBreakdown,
      }
    })

    setActiveWeek({
      weekNumber,
      totalPoints: weekTotals[weekNumber] ?? 0,
      houseguests: houseguestsList,
      episodes: episodesList,
    })
    setIsWeekSheetOpen(true)
  }

  const historyWeeks = Object.keys(picksByWeek).map(Number).sort((a, b) => b - a)

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="BB League" />

      <div className="flex flex-col gap-4 px-4">
        <DraftBanner />

        {myRank !== null && (
          <RankCard
            rank={myRank}
            upDown={myScore !== null ? `${myScore} season points` : ""}
          />
        )}

        <div>
          <p className="text-headline text-gray-900 mb-1">Week {currentWeek ?? "—"} in BBL</p>
          {currentWeek === 0 ? (
            <p className="text-body-1 text-gray-600">
              Season 28's theme is “Time Trip” — houseguests will navigate decade-inspired twists and powers (think ’80s and Y2K) as the show celebrates its 1,000th episode. The season premieres Thursday, July 9 at 8/7c on CBS, so get your picks in before the house doors open.
            </p>
          ) : weekSummary ? (
            <div className="text-body-1 text-gray-600 flex flex-col gap-3">
              {weekSummary.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)}
            </div>
          ) : (
            <p className="text-body-1 text-gray-600">
              Scores for this week will post as episodes air — check back soon to see how your picks are doing.
            </p>
          )}
        </div>

        {/* Current team */}
        <div>
          <p className="text-label text-gray-900 mb-2">This week's team</p>
          <div className="flex flex-col gap-3">
            {loading ? (
              <p className="text-caption text-gray-400 text-center mt-4">Loading…</p>
            ) : uniquePicks.length === 0 ? (
              <p className="text-caption text-gray-400 text-center mt-4">No picks yet.</p>
            ) : (
              uniquePicks.map(pick => {
                const hg = pick.houseguests
                const nickname = hg?.nickname ?? ""
                const events = hgByNickname[nickname]?.events ?? []
                const seasonPoints   = events.reduce((sum, e) => sum + e.points_awarded, 0)
                const positivePoints = events.filter(e => e.points_awarded > 0).reduce((sum, e) => sum + e.points_awarded, 0)
                const negativePoints = events.filter(e => e.points_awarded < 0).reduce((sum, e) => sum + e.points_awarded, 0)
                return (
                  <HouseguestCard
                    key={pick.houseguest_id}
                    name={nickname}
                    status={hg?.status ?? null}
                    initials={hg ? getInitials(hg.name) : nickname.slice(0, 2).toUpperCase()}
                    imageSrc={hg?.photo_url ?? null}
                    seasonPoints={seasonPoints}
                    positivePoints={positivePoints}
                    negativePoints={negativePoints}
                    onProfilePress={() => openProfile(hg, nickname)}
                    avatarSize="xl"
                  />
                )
              })
            )}
          </div>
        </div>

        {/* Week-by-week history */}
        {historyWeeks.length > 0 && (
          <div>
            <p className="text-headline text-gray-900 mb-1">My history</p>
            <div className="flex flex-col gap-3">
              {historyWeeks.map(wn => (
                <WeekHistoryRow
                  key={wn}
                  weekNumber={wn}
                  totalPoints={weekTotals[wn] ?? 0}
                  onPress={() => openWeekHistory(wn)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <HouseguestProfileSheet
        isOpen={isProfileSheetOpen}
        onClose={() => setIsProfileSheetOpen(false)}
        houseguest={activeHouseguest}
      />

      <WeekHistorySheet
        isOpen={isWeekSheetOpen}
        onClose={() => setIsWeekSheetOpen(false)}
        week={activeWeek}
        playerId={playerId}
      />
    </div>
  )
}
