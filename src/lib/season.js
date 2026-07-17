// Week 0 is the pre-season countdown, before the house doors open. Week 1
// starts the moment the season premieres.
// From Week 2 onward, weeks reset at 12:00 AM ET every Friday — the
// morning after Thursday's live show, not the moment it airs — giving
// time for eviction/scoring to wrap up before the week counter advances.
// Commissioner can override the current week (leagues.current_week_override)
// for double evictions, surprise weeks, or anything else that breaks the
// normal weekly cadence.
export const LEAGUE_ID = "aaaaaaaa-0000-0000-0000-000000000001"
export const SEASON_START = new Date("2026-07-09T20:00:00-04:00")
export const WEEK_2_START = new Date("2026-07-17T00:00:00-04:00")

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function calculatedWeek(now = new Date()) {
  const elapsed = now.getTime() - SEASON_START.getTime()
  if (elapsed < 0) return 0
  if (now.getTime() < WEEK_2_START.getTime()) return 1
  return 2 + Math.floor((now.getTime() - WEEK_2_START.getTime()) / WEEK_MS)
}

// episodes.episode_type is a Postgres enum — a week has up to one episode of
// each type, airing in this order (nominations, then POV, then eviction).
// "premiere" is a one-off 4th type for Week 1's move-in/twist episode,
// which aired before the normal HOH cycle started — see Commissioner.jsx,
// where it's only offered as an option for week 1.
export const EPISODE_TYPES = ["premiere", "nominations", "pov", "eviction"]

export const EPISODE_TYPE_LABELS = {
  premiere: "Premiere",
  nominations: "Nominations",
  pov: "POV",
  eviction: "Eviction",
}

export function episodeTypeLabel(episodeType) {
  return EPISODE_TYPE_LABELS[episodeType] ?? episodeType
}

// customLabel (episodes.label) overrides the type-based default — for
// weeks that don't follow the usual Nominations/POV/Eviction cadence.
export function episodeLabel(weekNumber, episodeType, customLabel) {
  const name = customLabel || (episodeType ? episodeTypeLabel(episodeType) : null)
  return name ? `Week ${weekNumber} · ${name}` : `Week ${weekNumber}`
}

// Sort key for ordering episodes most-recent-first: week number dominates,
// episode type order (nominations < POV < eviction) breaks ties within a week.
export function episodeSortKey(weekNumber, episodeType) {
  return weekNumber * 10 + EPISODE_TYPES.indexOf(episodeType)
}
