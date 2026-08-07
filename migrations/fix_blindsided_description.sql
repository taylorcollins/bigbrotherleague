-- "Blindsided" was described as being about the evicted houseguest's own
-- reaction ("Evicted unexpectedly, not backdoored"). It's meant to be
-- broader than that: scored on any houseguest who's visibly shocked by how
-- an eviction went, having believed a different outcome was coming —
-- whether or not they're the one who got evicted. Run this in the Supabase
-- SQL editor against your PRODUCTION project.

UPDATE scoring_events
SET description = 'Visibly shocked by an eviction outcome they didn''t see coming — evicted or not.'
WHERE label = 'Blindsided';
