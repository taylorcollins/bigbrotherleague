// Computes short, factual per-houseguest stat callouts for the Draft page —
// deterministic math over houseguest_events, not AI-generated narrative.
// Each houseguest gets up to two lines: a "headline" (the most notable thing
// about their season so far, if anything qualifies) and a "baseline"
// (average points/week, always shown when there's any history).

const STREAK_MIN_WEEKS = 3
const TREND_MIN_SWING = 5
const COMP_WINS_MIN = 2
const BLOCK_SURVIVALS_MIN = 2

// A "competition win" is any comps-category event worth points whose label
// follows the "Won ___" naming convention (Won HOH, Won POV, Won Safety,
// Won Blockbuster, Won a Battle Back) — matched by convention rather than a
// hardcoded label list so new comp types are picked up automatically.
function isCompWin(event) {
  return event.scoring_events?.category === "comps"
    && event.points_awarded > 0
    && event.scoring_events?.label?.startsWith("Won ")
}

function isBlockSurvival(event) {
  return event.scoring_events?.label === "Survived the Block"
}

// weeklyPointsByHg: houseguestId -> { [week]: points }, for every houseguest
// with any recorded event through priorWeek — used both for per-row stats
// and to find the season-wide record week.
function buildWeeklyPoints(houseguestEvents, epWeekMap, priorWeek) {
  const byHg = {}
  houseguestEvents.forEach(e => {
    const week = epWeekMap[e.episode_id]
    if (week === undefined || week > priorWeek) return
    if (!byHg[e.houseguest_id]) byHg[e.houseguest_id] = {}
    byHg[e.houseguest_id][week] = (byHg[e.houseguest_id][week] ?? 0) + e.points_awarded
  })
  return byHg
}

function currentStreak(weeklyPoints, priorWeek) {
  if (priorWeek < 1) return null
  const lastWeekPts = weeklyPoints[priorWeek] ?? 0
  const type = lastWeekPts > 0 ? "hot" : "cold"
  let length = 0
  for (let week = priorWeek; week >= 1; week--) {
    const pts = weeklyPoints[week] ?? 0
    const matches = type === "hot" ? pts > 0 : pts === 0
    if (!matches) break
    length++
  }
  return { type, length }
}

// Returns { [houseguestId]: { headline: string|null, baseline: string|null } }
export function computeDraftHighlights(houseguestEvents, episodes, priorWeek) {
  const result = {}
  if (priorWeek < 1) return result

  const epWeekMap = {}
  episodes.forEach(ep => { epWeekMap[ep.id] = ep.week_number })

  const weeklyPointsByHg = buildWeeklyPoints(houseguestEvents, epWeekMap, priorWeek)

  // Season record = the single highest weekly total by anyone (including
  // houseguests no longer in the draft pool), so the record stays accurate
  // even after its holder is evicted.
  let seasonRecord = 0
  Object.values(weeklyPointsByHg).forEach(weeks => {
    Object.values(weeks).forEach(pts => { if (pts > seasonRecord) seasonRecord = pts })
  })

  const compWinsByHg = {}
  const blockSurvivalsByHg = {}
  houseguestEvents.forEach(e => {
    const week = epWeekMap[e.episode_id]
    if (week === undefined || week > priorWeek) return
    if (isCompWin(e)) compWinsByHg[e.houseguest_id] = (compWinsByHg[e.houseguest_id] ?? 0) + 1
    if (isBlockSurvival(e)) blockSurvivalsByHg[e.houseguest_id] = (blockSurvivalsByHg[e.houseguest_id] ?? 0) + 1
  })

  Object.keys(weeklyPointsByHg).forEach(hgId => {
    const weeklyPoints = weeklyPointsByHg[hgId]

    let bestWeek = { week: null, pts: -Infinity }
    let seasonTotal = 0
    for (let week = 1; week <= priorWeek; week++) {
      const pts = weeklyPoints[week] ?? 0
      seasonTotal += pts
      if (pts > bestWeek.pts) bestWeek = { week, pts }
    }

    const streak = currentStreak(weeklyPoints, priorWeek)
    const trend = priorWeek >= 2 ? (weeklyPoints[priorWeek] ?? 0) - (weeklyPoints[priorWeek - 1] ?? 0) : 0
    const compWins = compWinsByHg[hgId] ?? 0
    const blockSurvivals = blockSurvivalsByHg[hgId] ?? 0

    let headline = null
    if (seasonRecord > 0 && bestWeek.pts === seasonRecord) {
      headline = `Season-high: +${seasonRecord} pts (Wk ${bestWeek.week})`
    } else if (streak && streak.length >= STREAK_MIN_WEEKS && streak.type === "hot") {
      headline = `${streak.length} weeks in a row scoring points`
    } else if (streak && streak.length >= STREAK_MIN_WEEKS && streak.type === "cold") {
      headline = `${streak.length} weeks in a row with 0 points`
    } else if (Math.abs(trend) >= TREND_MIN_SWING) {
      headline = trend > 0 ? `Up ${trend} pts from last week` : `Down ${Math.abs(trend)} pts from last week`
    } else if (compWins >= COMP_WINS_MIN) {
      headline = `${compWins} competition wins this season`
    } else if (blockSurvivals >= BLOCK_SURVIVALS_MIN) {
      headline = `Survived the block ${blockSurvivals} times`
    }

    const avgPerWeek = Math.round((seasonTotal / priorWeek) * 10) / 10
    const baseline = `Averaging ${avgPerWeek} pts/week`

    result[hgId] = { headline, baseline }
  })

  return result
}
