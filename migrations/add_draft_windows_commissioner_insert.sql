-- Allow commissioners to create/delete draft windows
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- draft_windows already has a working commissioner UPDATE path (Force
-- Open/Close), but no INSERT or DELETE policy exists yet — needed so the
-- Commissioner panel can create a week's draft window directly instead of
-- a one-off SQL script per week. Includes an explicit GRANT since a bare
-- RLS policy hasn't been sufficient on its own for other tables this
-- season (see fix-in-draft-pool-permission.sql, fix-week-summaries-select-grant.sql).

CREATE POLICY "Commissioners can insert draft windows"
ON draft_windows FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM players WHERE players.user_id = auth.uid() AND players.is_commissioner = true)
);

CREATE POLICY "Commissioners can delete draft windows"
ON draft_windows FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM players WHERE players.user_id = auth.uid() AND players.is_commissioner = true)
);

GRANT INSERT, DELETE ON draft_windows TO authenticated;
