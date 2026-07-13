-- Add new Week 1 twist scoring events: Blockbuster and BB Time Capsule
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- Blockbuster: three houseguests hit the block this season instead of two,
-- so there's a new competition to win safety back.
--
-- BB Time Capsule: America picks a houseguest to open the capsule (+3),
-- who then draws either a power (+5, net +8) or a punishment (-2, net +1).
-- Modeled as two separate toggles so the Commissioner can combine them.

INSERT INTO scoring_events (id, key, label, category, points, entry_mode, description) VALUES
  ('331ad050-6334-4705-9a1f-9a2fd019fd1f', 'blockbuster_win',        'Won Blockbuster',              'comps',    8,  'commissioner', 'Won the Blockbuster competition'),
  ('809b8ac6-e81d-480a-9789-26c5e4e8445e', 'time_capsule_selected',  'Selected for BB Time Capsule',  'one_time', 3,  'commissioner', 'America''s pick to open the BB Time Capsule'),
  ('f528ea21-8e83-4e74-a399-1fef3928aa88', 'time_capsule_power',     'Time Capsule: Drew a Power',    'one_time', 5,  'commissioner', 'Time Capsule contained a power'),
  ('481a8ead-9612-4238-8bda-99cbbd7b3487', 'time_capsule_punishment','Time Capsule: Drew a Punishment','one_time', -2, 'commissioner', 'Time Capsule contained a punishment')
ON CONFLICT (id) DO NOTHING;
