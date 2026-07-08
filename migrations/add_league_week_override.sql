-- Add a manual week override for leagues
-- Run this in the Supabase SQL editor before the app can read/write this column.
--
-- "Week in BBL" normally auto-calculates from the season start date (see
-- src/lib/season.js). Set current_week_override on a league to pin the
-- displayed week for double evictions, surprise weeks, etc. Set back to
-- NULL to resume automatic calculation.

ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS current_week_override integer;
