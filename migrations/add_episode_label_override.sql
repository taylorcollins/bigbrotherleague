-- Add an optional custom label to episodes
-- Run this in the Supabase SQL editor before the app can read/write this column.
--
-- Episode display names normally come straight from episode_type
-- (Nominations/POV/Eviction). Some weeks don't follow that pattern (e.g.
-- premiere week), so this lets the Commissioner override the displayed
-- name per episode. NULL falls back to the type-based default.

ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS label text;
