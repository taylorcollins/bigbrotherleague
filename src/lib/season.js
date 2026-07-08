// Week 0 is premiere/move-in week (before the first HOH -> Eviction cycle
// completes). Week 1 starts 7 days after the season premiere, and weeks
// advance every 7 days after that by default.
// Commissioner can override the current week (leagues.current_week_override)
// for double evictions, surprise weeks, or anything else that breaks the
// normal weekly cadence.
export const LEAGUE_ID = "aaaaaaaa-0000-0000-0000-000000000001"
export const SEASON_START = new Date("2026-07-09T20:00:00-04:00")

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function calculatedWeek(now = new Date()) {
  const elapsed = now.getTime() - SEASON_START.getTime()
  if (elapsed < 0) return 0
  return Math.floor(elapsed / WEEK_MS)
}
