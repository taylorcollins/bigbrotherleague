-- Move the BB Time Capsule events from "Finals" (one_time) to "Gameplay" (play)
-- Run this in the Supabase SQL editor against your PRODUCTION project.

UPDATE scoring_events SET category = 'play'
WHERE key IN ('time_capsule_selected', 'time_capsule_power', 'time_capsule_punishment');
