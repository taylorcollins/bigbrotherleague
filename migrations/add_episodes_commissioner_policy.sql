-- Allow commissioners to create/update episodes
-- Run this in the Supabase SQL editor.
--
-- The Commissioner "Score" tab has always needed to insert rows into
-- `episodes` (one per week previously, now one per episode type per week),
-- but no RLS policy ever permitted it — this was never caught because no
-- episode had ever actually been saved in production before now.

CREATE POLICY "Commissioners can insert episodes"
ON episodes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM players WHERE players.user_id = auth.uid() AND players.is_commissioner = true)
);

CREATE POLICY "Commissioners can update episodes"
ON episodes FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM players WHERE players.user_id = auth.uid() AND players.is_commissioner = true)
);
