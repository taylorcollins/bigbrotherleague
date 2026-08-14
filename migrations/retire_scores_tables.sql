-- Retire the never-wired-up scores/pick_points schema.
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- scores was scoped early on to hold a "publish" step (lock pick_points,
-- write a scores row) that never got built -- the commissioner score-entry
-- flow only ever writes to houseguest_events. scores has 0 rows across the
-- whole season, and picks.pick_points has never been populated (0 of 234
-- picks). The app's real Leaderboard/Profile screens compute standings
-- live by joining picks -> houseguest_events instead, which is what's
-- actually been running in production the whole time.
--
-- rank_history, season_leaderboard, and weekly_leaderboard read from scores;
-- pick_performance reads from picks.pick_points. None of the four views are
-- referenced anywhere in the app. Dropping all of it so the schema matches
-- what's actually running, rather than documenting an approach that was
-- abandoned before it shipped.

DROP VIEW IF EXISTS rank_history;
DROP VIEW IF EXISTS season_leaderboard;
DROP VIEW IF EXISTS weekly_leaderboard;
DROP VIEW IF EXISTS pick_performance;

DROP TABLE IF EXISTS scores;

ALTER TABLE picks DROP COLUMN IF EXISTS pick_points;
