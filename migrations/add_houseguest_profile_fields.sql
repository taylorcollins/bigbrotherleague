-- Add houseguest profile fields
-- Run this in the Supabase SQL editor before the app can read/write these columns.

ALTER TABLE houseguests
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS hometown text,
  ADD COLUMN IF NOT EXISTS instagram_handle text;
