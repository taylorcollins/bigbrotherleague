-- Add power_rankings table for the Power Rankings feature — Claude-ranked
-- "Next Week" and "Rest of Season" predictions per houseguest, shown on
-- /stats/power-rankings and from the Draft page. Run this in the Supabase
-- SQL editor against your PRODUCTION project.
--
-- Like stat_leader_insights/week_insights, this is lazily generated on
-- first view via /api/generate-power-rankings and cached here so it isn't
-- regenerated (and re-billed) on every page load. One row per league/week
-- covers both horizons — a single Claude call, a single cache-invalidation
-- unit. Each jsonb column is an array of
-- { houseguest_id, predicted_points, reason }, already validated server-side
-- against real in-draft-pool houseguest ids before being cached.

CREATE TABLE power_rankings (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id),
  week_number integer not null, -- latest scored week, used as the cache-invalidation key
  next_week jsonb not null,
  rest_of_season jsonb not null,
  updated_at timestamptz not null default now(),
  unique (league_id, week_number)
);

ALTER TABLE power_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read power rankings"
ON power_rankings FOR SELECT
USING (true);

CREATE POLICY "Authenticated players can insert power rankings"
ON power_rankings FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated players can update power rankings"
ON power_rankings FOR UPDATE
TO authenticated
USING (true);

-- Same column-level grant gap we hit on houseguests.in_draft_pool,
-- week_summaries, week_insights, and stat_leader_insights — cover it up
-- front so the insert/update doesn't silently no-op.
GRANT SELECT, INSERT, UPDATE ON power_rankings TO authenticated;
