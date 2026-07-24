-- Open the Week 3 draft window
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- 6 picks per player, opens immediately, closes Sunday 2026-07-26 8:00 PM ET.
--
-- Safe to re-run: only inserts a Week 3 row if one doesn't already exist,
-- then (re)sets the open/close dates either way.

INSERT INTO draft_windows (id, league_id, week_number, phase, picks_per_player, opens_at, closes_at, is_revealed)
SELECT 'cf2ad65d-1682-41fa-834f-1a5a6e3e6244', 'aaaaaaaa-0000-0000-0000-000000000001', 3, 'pre_jury', 6,
       now(), '2026-07-26T20:00:00-04:00', false
WHERE NOT EXISTS (
  SELECT 1 FROM draft_windows
  WHERE league_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND week_number = 3
);

UPDATE draft_windows
SET opens_at = now(), closes_at = '2026-07-26T20:00:00-04:00', is_revealed = false, picks_per_player = 6
WHERE league_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND week_number = 3;
