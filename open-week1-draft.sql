-- Open the Week 1 draft window
-- Run this in the Supabase SQL editor against your PRODUCTION project,
-- after bb28-cast.sql has been run (houseguests must exist first).
--
-- 6 picks per player, opens immediately, closes Friday 2026-07-10 8:00 PM ET.
--
-- Safe to re-run: only inserts a Week 1 row if one doesn't already exist,
-- then (re)sets the open/close dates either way.

INSERT INTO draft_windows (id, league_id, week_number, phase, picks_per_player, opens_at, closes_at, is_revealed)
SELECT '7d2cbbac-ac00-446d-b870-4523da42474b', 'aaaaaaaa-0000-0000-0000-000000000001', 1, 'pre_jury', 6,
       now(), '2026-07-10T20:00:00-04:00', false
WHERE NOT EXISTS (
  SELECT 1 FROM draft_windows
  WHERE league_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND week_number = 1
);

UPDATE draft_windows
SET opens_at = now(), closes_at = '2026-07-10T20:00:00-04:00', is_revealed = false, picks_per_player = 6
WHERE league_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND week_number = 1;
