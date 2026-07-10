import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { PageHeader, DraftBanner, HouseguestCard, RankCard, HouseguestProfileSheet, Card, Avatar } from "@/components"
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

function WeekHistoryCard({ weekNumber, picks, hgByNickname }) {
  const [openId, setOpenId] = useState(null)

  function toggle(id) {
    setOpenId(prev => (prev === id ? null : id))
  }

  // Calculate week total live from events — same source as individual rows
  const weekTotal = picks.reduce((sum, p) => {
    const nickname = p.houseguests?.nickname ?? ""
    const events = (hgByNickname[nickname]?.events ?? []).filter(e => e.week_number === weekNumber)
    return sum + events.reduce((s, e) => s + e.points_awarded, 0)
  }, 0)

  return (
    <Card noPadding>
      {/* Week header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-label font-semibold text-gray-900">Week {weekNumber}</p>
        <span className={`text-label font-semibold ${ptsColor(weekTotal)}`}>
          {weekTotal > 0 ? `+${weekTotal}` : weekTotal} pts
        </span>
      </div>

      {/* Accordion row per pick */}
      {picks.map(p => {
        const hg = p.houseguests
        const nickname = hg?.nickname ?? ""
        const initials = hg ? getInitials(hg.name) : nickname.slice(0, 2).toUpperCase()
        const allEvents = hgByNickname[nickname]?.events ?? []
        const weekEvents = allEvents.filter(e => e.week_number === weekNumber)
        const weekPts      = weekEvents.reduce((sum, e) => sum + e.points_awarded, 0)
        const positivePts  = weekEvents.filter(e => e.points_awarded > 0).reduce((sum, e) => sum + e.points_awarded, 0)
        const negativePts  = weekEvents.filter(e => e.points_awarded < 0).reduce((sum, e) => sum + e.points_awarded, 0)
        const isOpen = openId === p.houseguest_id

        return (
          <div key={p.houseguest_id} className="border-b border-gray-100 last:border-b-0">
            {/* Collapsed header */}
            <button
              onClick={() => toggle(p.houseguest_id)}
              className="flex items-center w-full gap-3 px-4 py-3"
            >
              <Avatar src={hg?.photo_url} initials={initials} size="sm" />
              <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                <span className="text-label font-semibold text-gray-900">{nickname}</span>
                {(positivePts > 0 || negativePts < 0) && (
                  <div className="flex gap-1">
                    {positivePts > 0 && (
                      <span className="rounded-pill bg-brand-primary/10 text-brand-primary px-2 py-0.5 text-caption font-semibold">
                        +{positivePts}
                      </span>
                    )}
                    {negativePts < 0 && (
                      <span className="rounded-pill bg-status-nominee-light text-status-nominee px-2 py-0.5 text-caption font-semibold">
                        {negativePts}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <span className={`text-label font-semibold ${ptsColor(weekPts)}`}>
                {weekPts > 0 ? `+${weekPts}` : weekPts} pts
              </span>
              <ChevronDown
                size={20}
                className={`text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Expanded event list */}
            {isOpen && (
              <div className="border-t border-gray-100 px-4 pt-3 pb-2 pl-[52px]">
                {weekEvents.length === 0 ? (
                  <p className="text-caption text-gray-400 py-1">No points this week</p>
                ) : (
                  weekEvents.map((e, i) => (
                    <div key={i} className="flex justify-between py-1.5">
                      <span className="text-body-1 text-gray-600">{e.scoring_events.label}</span>
                      <span className={`text-body-1 font-semibold ${e.points_awarded >= 0 ? "text-brand-primary" : "text-status-nominee"}`}>
                        {e.points_awarded >= 0 ? `+${e.points_awarded}` : e.points_awarded}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </Card>
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
          .select("id, week_number, episode_type"),

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
          label: episodeLabel(ep.week_number, ep.episode_type),
          sortKey: episodeSortKey(ep.week_number, ep.episode_type),
        }
      })
      setEpisodeMeta(epMeta)
      setAllEpisodeIds(episodesRes.data?.map(ep => ep.id) ?? [])

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
      const byWeek = {}

      ;(picksRes.data ?? []).forEach(p => {
        const wn = p.draft_windows?.week_number
        if (wn !== undefined) {
          if (!byWeek[wn]) byWeek[wn] = []
          byWeek[wn].push(p)
        }
      })

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
          <p className="text-body-1 text-gray-600">
            {currentWeek === 0
              ? "Season 28's theme is “Time Trip” — houseguests will navigate decade-inspired twists and powers (think ’80s and Y2K) as the show celebrates its 1,000th episode. The season premieres Thursday, July 9 at 8/7c on CBS, so get your picks in before the house doors open."
              : currentWeek === 1
              ? "Episode 1 is done: the houseguests moved in, and a twist handed HOH power to returning players instead of the newbies. Nobody's scored any points yet — HOH, nominations, and eviction are still ahead, so this week is still fully up for grabs."
              : "[Summary of where we are in the cycle and how your picks are doing]."}
          </p>
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
                    status={null}
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
                <WeekHistoryCard
                  key={wn}
                  weekNumber={wn}
                  picks={picksByWeek[wn]}
                  hgByNickname={hgByNickname}
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
    </div>
  )
}
