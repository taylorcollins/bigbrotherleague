-- Enable Supabase Realtime on houseguest_events so score changes push to
-- clients immediately (Leaderboard, Game, Stats) instead of only refreshing
-- on next page load. Run this in the Supabase SQL editor against your
-- PRODUCTION project.

ALTER PUBLICATION supabase_realtime ADD TABLE houseguest_events;
