-- Fix Ashley immediately, and grant write access to in_draft_pool
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- The Commissioner Score tab's save reported success, but in_draft_pool
-- never actually changed for Ashley — the status column update clearly
-- works (HOH/Nominee/Evicted badges have saved fine before), so this is
-- most likely a column-level GRANT that never included in_draft_pool,
-- not a row-level RLS policy issue (RLS can't selectively block one
-- column while allowing another on the same row/statement).

-- 1. Immediate fix for Ashley
UPDATE houseguests SET in_draft_pool = false WHERE name = 'Ashley Trail';

-- 2. Root-cause fix: make sure the authenticated role can write this column
GRANT UPDATE (in_draft_pool) ON houseguests TO authenticated;
