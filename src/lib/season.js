// Week 0 is the pre-season countdown, before the house doors open. Week 1
// starts the moment the season premieres, and weeks advance every 7 days
// after that by default.
// Commissioner can override the current week (leagues.current_week_override)
// for double evictions, surprise weeks, or anything else that breaks the
// normal weekly cadence.
export const LEAGUE_ID = "aaaaaaaa-0000-0000-0000-000000000001"
export const SEASON_START = new Date("2026-07-09T20:00:00-04:00")

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function calculatedWeek(now = new Date()) {
  const elapsed = now.getTime() - SEASON_START.getTime()
  if (elapsed < 0) return 0
  return Math.floor(elapsed / WEEK_MS) + 1
}

// episodes.episode_type is a Postgres enum — a week has up to one episode of
// each type, airing in this order (nominations, then POV, then eviction).
export const EPISODE_TYPES = ["nominations", "pov", "eviction"]

export const EPISODE_TYPE_LABELS = {
  nominations: "Nominations",
  pov: "POV",
  eviction: "Eviction",
}

export function episodeTypeLabel(episodeType) {
  return EPISODE_TYPE_LABELS[episodeType] ?? episodeType
}

export function episodeLabel(weekNumber, episodeType) {
  return episodeType ? `Week ${weekNumber} · ${episodeTypeLabel(episodeType)}` : `Week ${weekNumber}`
}

// Sort key for ordering episodes most-recent-first: week number dominates,
// episode type order (nominations < POV < eviction) breaks ties within a week.
export function episodeSortKey(weekNumber, episodeType) {
  return weekNumber * 10 + EPISODE_TYPES.indexOf(episodeType)
}
