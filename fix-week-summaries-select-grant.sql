-- Fix missing SELECT grant on week_summaries
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- The RLS "Anyone can read" policy alone isn't enough — Postgres also
-- requires a base table grant, same gap we hit with houseguests.in_draft_pool.

GRANT SELECT ON week_summaries TO anon, authenticated;
