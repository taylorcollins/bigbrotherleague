-- Add "premiere" as a valid episode_type
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- Week 1's premiere had a move-in/twist segment that aired before the
-- normal HOH cycle even started — effectively a 4th episode that doesn't
-- fit the usual Nominations/POV/Eviction structure. This is a one-off
-- (a normal week has exactly 3 episodes), so the app only offers this as
-- an option on Week 1's Commissioner picker.

ALTER TYPE episode_type ADD VALUE IF NOT EXISTS 'premiere' BEFORE 'nominations';
