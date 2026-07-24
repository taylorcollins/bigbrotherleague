-- Remove unconditional write policies on picks
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- "Allow insert" and "Allow delete" on picks have qual/with_check = true
-- with no auth or ownership check at all -- they sit alongside the correctly
-- scoped picks_insert/picks_delete (which check player ownership and that
-- the draft window is still open), but Postgres OR's multiple permissive
-- policies together, so the unconditional ones completely negate the scoped
-- ones. Right now anyone with the public anon key can insert or delete any
-- player's picks at any time, including after a window closes.
--
-- picks_insert and picks_delete already enforce the correct rules, so
-- dropping these two is enough -- no new policy needed.

DROP POLICY "Allow insert" ON picks;
DROP POLICY "Allow delete" ON picks;
