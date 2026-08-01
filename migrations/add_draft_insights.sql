-- Add draft_insights table for the Draft page's "who to pick" blurb —
-- Claude-written advice on houseguest dynamics/heat/showmances based on
-- last week's scoring events, shown above the houseguest list while a
-- draft window is open. Run this in the Supabase SQL editor against your
-- PRODUCTION project.
--
-- Same shape and review flow as week_summaries: Commissioner generates a
-- draft with Claude (via /api/generate-draft-insight) or writes one
-- manually, then saves it here. Keyed by the week_number of the draft
-- window it's advising for (not the week the events came from).

CREATE TABLE draft_insights (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id),
  week_number integer not null,
  insight text not null,
  updated_at timestamptz not null default now(),
  unique (league_id, week_number)
);

ALTER TABLE draft_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read draft insights"
ON draft_insights FOR SELECT
USING (true);

CREATE POLICY "Commissioners can insert draft insights"
ON draft_insights FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM players WHERE players.user_id = auth.uid() AND players.is_commissioner = true)
);

CREATE POLICY "Commissioners can update draft insights"
ON draft_insights FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM players WHERE players.user_id = auth.uid() AND players.is_commissioner = true)
);

-- Same column-level grant gap we hit on houseguests.in_draft_pool and
-- week_summaries — cover it up front so the Commissioner save doesn't
-- silently no-op. SELECT is required too, not just INSERT/UPDATE — the
-- upsert's ON CONFLICT check needs to read the existing row.
GRANT SELECT, INSERT, UPDATE ON draft_insights TO authenticated;
