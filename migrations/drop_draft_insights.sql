-- Drop draft_insights — the Draft page's Claude-generated "who to pick"
-- paragraph has been replaced by deterministic per-houseguest stat callouts
-- computed client-side (src/lib/draftStats.js), so this table, its API
-- route, and the Commissioner card that wrote to it are no longer used.
-- Run this in the Supabase SQL editor against your PRODUCTION project.

DROP TABLE IF EXISTS draft_insights;
