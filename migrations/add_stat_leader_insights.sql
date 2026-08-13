-- Add stat_leader_insights table for the new Stats landing page's AI insight
-- strip (season-wide houseguest event tallies, not personalized per player).
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- Like week_insights, this is lazily generated on first view via the new
-- /api/generate-stat-leader-insight function and cached here so it isn't
-- regenerated (and re-billed) on every page load. Unlike week_insights it's
-- league-wide rather than per-player, so any authenticated player can
-- trigger and cache it — there's no personal data to scope by user.

CREATE TABLE stat_leader_insights (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id),
  week_number integer not null, -- latest scored week, used as the cache-invalidation key
  insight text not null,
  updated_at timestamptz not null default now(),
  unique (league_id, week_number)
);

ALTER TABLE stat_leader_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stat leader insights"
ON stat_leader_insights FOR SELECT
USING (true);

CREATE POLICY "Authenticated players can insert stat leader insights"
ON stat_leader_insights FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated players can update stat leader insights"
ON stat_leader_insights FOR UPDATE
TO authenticated
USING (true);

-- Same column-level grant gap we hit on houseguests.in_draft_pool,
-- week_summaries, and week_insights — cover it up front so the
-- insert/update doesn't silently no-op.
GRANT SELECT, INSERT, UPDATE ON stat_leader_insights TO authenticated;
