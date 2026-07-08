-- BB28 Cast Upload
-- Run this in the Supabase SQL editor against your PRODUCTION project.
-- Assumes a leagues row with id 'aaaaaaaa-0000-0000-0000-000000000001'
-- already exists there (same id hardcoded in src/pages/Onboarding.jsx).
-- If your real league id is different, replace league_id below before running.
--
-- Sourced from GoldDerby and TVLine cast-reveal coverage (2026-07-07).
-- No official Instagram handles or photo URLs were available at reveal time —
-- instagram_handle and photo_url are left NULL. Fill those in later via
-- Supabase directly, or ask to have a Commissioner UI built for it.
--
-- 'Unknown Survivor' is a placeholder for a reportedly second returning
-- Survivor castaway whose identity hadn't been revealed as of this writing.
-- Once they're named, update this row (name, nickname, age, hometown)
-- rather than inserting a new one — keep the same id so existing picks/
-- scores tied to it aren't orphaned:
--   UPDATE houseguests SET name = '...', nickname = '...', age = ..., hometown = '...'
--   WHERE id = '6d7705d0-dc94-41ec-95b5-2257750a7503';

INSERT INTO houseguests (id, name, nickname, status, league_id, is_jury, is_prejury_eviction, in_draft_pool, age, hometown) VALUES
  ('54d7ac06-f10a-4d95-974f-cd23899ace81', 'Angela Murray',            'Angela',  'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 53, 'Syracuse, UT'),
  ('0913c6e0-260c-45d9-a672-65aac746db19', 'Ashley Trail',              'Ashley',  'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 24, 'Alton, IL'),
  ('b6b5ee68-eb7e-406b-a9b5-6d657c5b6116', 'Barrett Pfeiffer',          'Barrett', 'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 27, 'Benton, AR'),
  ('262ee9a9-64d4-41c3-833c-05ec6876ab26', 'Chuk Anyanwu',              'Chuk',    'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 27, 'Dallas, TX'),
  ('19ad0682-fb51-4346-8e18-5111724d6037', 'Drew Campbell',             'Drew',    'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 22, 'Temecula, CA'),
  ('a55b3d30-d414-48f4-ba3c-89b5b37b8c31', 'Haley Thogmartin',          'Haley',   'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 29, 'Neosho, MO'),
  ('ee40e207-46a5-4189-b740-065ee4f4244e', 'Jason De Puy',              'Jason',   'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 35, 'San Francisco, CA'),
  ('25972a18-d8f0-4f30-85b4-6d54a1b70649', 'Kamuela "Kamu" Kirk',       'Kamu',    'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 32, 'Phoenix, AZ'),
  ('1b64055f-e108-49f5-a336-3e51bd650fe3', 'LaTrice Verrett',           'LaTrice', 'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 57, 'Kankakee, IL'),
  ('c1de7bd1-7c7d-45c4-8436-13b5ff0a6ace', 'Lyric Medeiros',            'Lyric',   'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 25, 'Honolulu, HI'),
  ('4bdf88e8-0e7e-4cd7-b3ea-b75cf52e2e64', 'Mallory Aurichio',          'Mallory', 'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 24, 'Township of Washington, NJ'),
  ('0eeed75d-1a45-41da-9b08-21a0ca1dc0eb', 'Melody Morris',             'Melody',  'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 24, 'Thornton, CO'),
  ('b160cbb7-16fd-4427-a6c9-9e78e2027365', 'Rick Devens',               'Rick',    'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 42, 'Macon, GA'),
  ('1c3e1a8c-1441-4fbb-b5eb-66799d7ee5ea', 'Rome Seymour',              'Rome',    'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 28, 'Traverse City, MI'),
  ('0f36c049-b197-4fad-a225-ab2f0f155a87', 'Taylor Brown',              'Taylor',  'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 27, 'Deerfield Beach, FL'),
  ('b6665117-90a2-4183-b66a-8528f7afbde1', 'Yash Patel',                'Yash',    'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, 24, 'Monroe Township, NJ'),
  ('6d7705d0-dc94-41ec-95b5-2257750a7503', 'Unknown Survivor',          'Unknown Survivor', 'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Optional cleanup: remove the fictional dev/seed cast if it exists in this
-- database (uncomment to run). Matches by the placeholder names from seed.sql.
-- DELETE FROM houseguests WHERE name IN (
--   'Alex Turner','Brianna Wells','Carlos Mendez','Diana Park','Ethan Brooks',
--   'Fiona Grant','Greg Hammond','Hannah Cruz','Ivan Petrov','Jade Monroe',
--   'Kyle Nash','Lydia Chen','Marco Rivera','Nina Okafor','Owen Blake','Priya Sharma'
-- );
