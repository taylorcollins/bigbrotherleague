-- Add per-player opt-in for the weekly "draft is open" email.
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- Backs the toggle on the Profile screen (previously a "coming soon"
-- placeholder). Defaults to true so nobody currently on the bcc list gets
-- silently dropped when this ships. When drafting the weekly email, filter
-- the recipient query to `where p.email_opt_in = true` instead of every
-- player -- see the Commissioner Weekly Workflow doc.

ALTER TABLE players ADD COLUMN IF NOT EXISTS email_opt_in boolean NOT NULL DEFAULT true;

-- players has no UPDATE RLS policy today, and `authenticated` already holds
-- a blanket table-level UPDATE grant (Supabase's default schema grant, with
-- RLS meant to be the actual gate) -- including on `is_commissioner`. Adding
-- a naive "USING (auth.uid() = user_id)" policy here would let any player
-- flip their own is_commissioner to true, since WITH CHECK can't reference
-- the pre-update row to pin other columns. So the row-ownership policy is
-- paired with a column-level grant restricting self-service UPDATE to just
-- email_opt_in -- Postgres enforces column privileges independently of RLS,
-- so this holds even if the policy's USING clause is ever loosened later.
REVOKE UPDATE ON players FROM authenticated, anon;
GRANT UPDATE (email_opt_in) ON players TO authenticated;

CREATE POLICY "players_update_self" ON players
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
