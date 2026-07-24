-- Add week_summaries table for the Game page's "Week N in BBL" recap
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- Replaces the hand-hardcoded per-week copy in Game.jsx — Commissioner can
-- generate a draft with Claude (via the new /api/generate-summary function)
-- or write one manually, then save it here.

CREATE TABLE week_summaries (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id),
  week_number integer not null,
  summary text not null,
  updated_at timestamptz not null default now(),
  unique (league_id, week_number)
);

ALTER TABLE week_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read week summaries"
ON week_summaries FOR SELECT
USING (true);

CREATE POLICY "Commissioners can insert week summaries"
ON week_summaries FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM players WHERE players.user_id = auth.uid() AND players.is_commissioner = true)
);

CREATE POLICY "Commissioners can update week summaries"
ON week_summaries FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM players WHERE players.user_id = auth.uid() AND players.is_commissioner = true)
);

-- Same column-level grant gap we hit on houseguests.in_draft_pool — cover it
-- up front so the Commissioner save doesn't silently no-op.
GRANT INSERT, UPDATE ON week_summaries TO authenticated;
