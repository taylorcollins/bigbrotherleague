-- Add "Won Safety" scoring event
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- Worth a little less than POV (+8) since it's a lesser safety comp,
-- not full veto power.

INSERT INTO scoring_events (id, key, label, category, points, entry_mode, description) VALUES
  ('bfafb04e-9004-404e-a9be-c5d5f59c1e70', 'safety_win', 'Won Safety', 'comps', 7, 'commissioner', 'Won a safety competition')
ON CONFLICT (id) DO NOTHING;
