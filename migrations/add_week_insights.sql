-- Add week_insights table for the "My history" week bottom sheet on the Game
-- page — a short Claude-generated recap of how a specific player did that
-- week (their score vs. best possible, plus historical episode-type trends).
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- Unlike week_summaries (one league-wide recap, commissioner-written), this
-- is personalized per player, generated on first view via the new
-- /api/generate-week-insight function, and cached here so it's not
-- regenerated (and re-billed) every time the player reopens the sheet.

CREATE TABLE week_insights (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  week_number integer not null,
  insight text not null,
  updated_at timestamptz not null default now(),
  unique (player_id, week_number)
);

ALTER TABLE week_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read their own week insights"
ON week_insights FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM players WHERE players.id = week_insights.player_id AND players.user_id = auth.uid())
);

CREATE POLICY "Players can insert their own week insights"
ON week_insights FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM players WHERE players.id = week_insights.player_id AND players.user_id = auth.uid())
);

CREATE POLICY "Players can update their own week insights"
ON week_insights FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM players WHERE players.id = week_insights.player_id AND players.user_id = auth.uid())
);

-- Same column-level grant gap we hit on houseguests.in_draft_pool and
-- week_summaries — cover it up front so the insert/update doesn't silently no-op.
GRANT SELECT, INSERT, UPDATE ON week_insights TO authenticated;
