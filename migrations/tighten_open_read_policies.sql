-- Remove redundant wide-open SELECT policies
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- Several tables carry a properly-scoped SELECT policy (checking
-- is_league_member) alongside a redundant unconditional one (qual = true).
-- Postgres OR's multiple permissive policies together, so the open one
-- silently wins and the scoped one does nothing. The whole app is gated
-- behind login at the router level (AppShell renders only Login/Signup when
-- there's no session), so there's no legitimate case that needs anonymous
-- reads here -- safe to drop the open ones and keep only the scoped ones.
--
-- picks_available is the same pattern (item 1): picks_read already covers
-- legitimate access (revealed picks, or your own unrevealed picks).

DROP POLICY "picks_available" ON picks;
DROP POLICY "dw_available" ON draft_windows;
DROP POLICY "episodes_available" ON episodes;
DROP POLICY "hge_available" ON houseguest_events;
DROP POLICY "players_available" ON players;
DROP POLICY "scores_available" ON scores;

-- houseguests has no separate scoped SELECT policy to fall back on --
-- houseguests_read IS the open one, so it needs to be replaced rather than
-- just dropped.
ALTER POLICY "houseguests_read" ON houseguests USING (is_league_member(league_id));
