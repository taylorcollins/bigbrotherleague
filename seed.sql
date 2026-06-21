-- BB League Dev Seed
-- Run this in the Supabase SQL editor on your dev branch.
-- After running, sign up with a test account and update the player row
-- with your real user_id: UPDATE players SET user_id = 'your-auth-uuid' WHERE display_name = 'Commissioner';

-- ============================================================
-- LEAGUE
-- ============================================================
INSERT INTO leagues (id, name, season, invite_code) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'BB League Season 1', 1, 'DEV2024')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SCORING EVENTS
-- ============================================================
INSERT INTO scoring_events (id, key, label, category, points, entry_mode, description) VALUES
  -- Competitions
  ('ee000001-0000-0000-0000-000000000001', 'won_hoh',                   'Won HOH',                     'comps',    10, 'commissioner', 'Houseguest won Head of Household.'),
  ('ee000002-0000-0000-0000-000000000001', 'won_pov',                   'Won POV',                     'comps',     8, 'commissioner', 'Houseguest won Power of Veto.'),
  ('ee000003-0000-0000-0000-000000000001', 'won_3_comps',               'Won 3+ Comps in a Row',       'comps',     5, 'commissioner', 'Won three or more competitions consecutively.'),
  ('ee000004-0000-0000-0000-000000000001', 'threw_comp',                'Made a Deal and Threw a Comp','comps',     3, 'commissioner', 'Negotiated safety in exchange for throwing a competition.'),
  ('ee000005-0000-0000-0000-000000000001', 'won_battle_back',           'Won a Battle Back',           'comps',     8, 'commissioner', 'Won a battle back competition to re-enter the house.'),
  -- Gameplay
  ('ee000006-0000-0000-0000-000000000001', 'nominated',                 'Nominated',                   'play',     -3, 'commissioner', 'Put on the block as a nominee.'),
  ('ee000007-0000-0000-0000-000000000001', 'blindsided_evicted',        'Blindsided and Evicted',      'play',     -5, 'commissioner', 'Evicted without knowing it was coming.'),
  ('ee000008-0000-0000-0000-000000000001', 'backdoored',                'Backdoored',                  'play',     -4, 'commissioner', 'Put on the block as a backdoor target.'),
  ('ee000009-0000-0000-0000-000000000001', 'survived_block',            'Survived the Block',          'play',      5, 'commissioner', 'Was nominated but survived eviction.'),
  ('ee000010-0000-0000-0000-000000000001', 'used_veto_self',            'Used Veto on Themselves',     'play',      5, 'commissioner', 'Won POV and used it to take themselves off the block.'),
  ('ee000011-0000-0000-0000-000000000001', 'hoh_backdoor',              'HOH Executed a Backdoor',     'play',      5, 'commissioner', 'Successfully executed a backdoor as HOH.'),
  ('ee000012-0000-0000-0000-000000000001', 'evicted_pre_jury',          'Evicted (Pre-Jury)',          'play',     -8, 'commissioner', 'Evicted from the house before jury.'),
  ('ee000013-0000-0000-0000-000000000001', 'evicted_post_jury',         'Evicted (Post-Jury)',         'play',     -4, 'commissioner', 'Evicted from the house after making jury.'),
  ('ee000014-0000-0000-0000-000000000001', 'survived_double_eviction',  'Survived Double Eviction Week','play',     6, 'commissioner', 'Made it through a double eviction episode.'),
  -- Social Game
  ('ee000015-0000-0000-0000-000000000001', 'left_out_vote',             'Left Out of a Vote',          'social',   -3, 'commissioner', 'Was not included in the majority vote.'),
  ('ee000016-0000-0000-0000-000000000001', 'named_alliance',            'In a Named Alliance',         'social',    3, 'commissioner', 'Member of a named alliance.'),
  ('ee000017-0000-0000-0000-000000000001', 'backstabbed_alliance',      'Backstabbed Own Alliance',    'social',   -4, 'commissioner', 'Voted out or betrayed a member of their own alliance.'),
  ('ee000018-0000-0000-0000-000000000001', 'cried_dr',                  'Cried in the Diary Room',     'social',    1, 'commissioner', 'Had an emotional diary room session.'),
  ('ee000019-0000-0000-0000-000000000001', 'busted_lie',                'Got Busted in a Lie',         'social',   -3, 'commissioner', 'Was caught lying by other houseguests.'),
  ('ee000020-0000-0000-0000-000000000001', 'got_in_fight',              'Got in a Fight',              'social',   -2, 'commissioner', 'Had a notable argument with another houseguest.'),
  ('ee000021-0000-0000-0000-000000000001', 'showmance_survived',        'Showmance Survived the Week', 'social',    2, 'commissioner', 'Showmance partner is still in the house.'),
  ('ee000022-0000-0000-0000-000000000001', 'showmance_evicted',         'Showmance Partner Evicted',   'social',   -3, 'commissioner', 'Their showmance partner was evicted.'),
  -- Spirit
  ('ee000023-0000-0000-0000-000000000001', 'have_not',                  'Have-Not',                    'spirit',   -2, 'commissioner', 'Designated as a Have-Not for the week.'),
  ('ee000024-0000-0000-0000-000000000001', 'volunteered_pawn',          'Volunteered as a Pawn',       'spirit',    3, 'commissioner', 'Volunteered to go on the block as a pawn.'),
  ('ee000025-0000-0000-0000-000000000001', 'wore_costume',              'Wore a Costume for the Week', 'spirit',    2, 'commissioner', 'Had to wear a punishment costume for the week.'),
  -- Finals
  ('ee000026-0000-0000-0000-000000000001', 'afp',                       'America''s Favorite Player',  'one_time', 15, 'commissioner', 'Won the America''s Favorite Player award.'),
  ('ee000027-0000-0000-0000-000000000001', 'floater_tax',               'Floater Tax',                 'one_time', -5, 'commissioner', 'Awarded to a houseguest who floated through the game without making any big moves.'),
  ('ee000028-0000-0000-0000-000000000001', 'kept_life_secret',          'Kept a Life Secret',          'one_time',  5, 'commissioner', 'Successfully kept a major secret the entire game.'),
  ('ee000029-0000-0000-0000-000000000001', 'life_secret_exposed',       'Life Secret Was Exposed',     'one_time', -5, 'commissioner', 'A major personal secret was revealed to the house.'),
  ('ee000030-0000-0000-0000-000000000001', 'made_jury',                 'Made Jury',                   'one_time',  5, 'commissioner', 'Made it to the jury phase of the game.'),
  ('ee000031-0000-0000-0000-000000000001', 'jury_vote',                 'Received a Jury Vote',        'one_time',  3, 'commissioner', 'Received a vote to win at the finale.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- HOUSEGUESTS (fictional test cast)
-- ============================================================
INSERT INTO houseguests (id, name, nickname, status, league_id, is_jury, is_prejury_eviction, in_draft_pool) VALUES
  ('cccccccc-0001-0000-0000-000000000001', 'Alex Turner',   'Alex',   'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true),
  ('cccccccc-0002-0000-0000-000000000001', 'Brianna Wells', 'Bri',    'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true),
  ('cccccccc-0003-0000-0000-000000000001', 'Carlos Mendez', 'Carlos', 'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true),
  ('cccccccc-0004-0000-0000-000000000001', 'Diana Park',    'Diana',  'evicted','aaaaaaaa-0000-0000-0000-000000000001', false, true,  true),
  ('cccccccc-0005-0000-0000-000000000001', 'Ethan Brooks',  'Ethan',  'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true),
  ('cccccccc-0006-0000-0000-000000000001', 'Fiona Grant',   'Fiona',  'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true),
  ('cccccccc-0007-0000-0000-000000000001', 'Greg Hammond',  'Greg',   'hoh',   'aaaaaaaa-0000-0000-0000-000000000001', false, false, true),
  ('cccccccc-0008-0000-0000-000000000001', 'Hannah Cruz',   'Hannah', 'pov',   'aaaaaaaa-0000-0000-0000-000000000001', false, false, true),
  ('cccccccc-0009-0000-0000-000000000001', 'Ivan Petrov',   'Ivan',   'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true),
  ('cccccccc-0010-0000-0000-000000000001', 'Jade Monroe',   'Jade',   'evicted','aaaaaaaa-0000-0000-0000-000000000001', false, true,  true),
  ('cccccccc-0011-0000-0000-000000000001', 'Kyle Nash',     'Kyle',   'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true),
  ('cccccccc-0012-0000-0000-000000000001', 'Lydia Chen',    'Lydia',  'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true),
  ('cccccccc-0013-0000-0000-000000000001', 'Marco Rivera',  'Marco',  'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true),
  ('cccccccc-0014-0000-0000-000000000001', 'Nina Okafor',   'Nina',   'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true),
  ('cccccccc-0015-0000-0000-000000000001', 'Owen Blake',    'Owen',   'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true),
  ('cccccccc-0016-0000-0000-000000000001', 'Priya Sharma',  'Priya',  'active', 'aaaaaaaa-0000-0000-0000-000000000001', false, false, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DRAFT WINDOWS
-- ============================================================
INSERT INTO draft_windows (id, league_id, week_number, phase, picks_per_player, opens_at, closes_at, is_revealed) VALUES
  ('eeeeeeee-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1, 'pre_jury', 6,
    now() - interval '14 days', now() - interval '7 days', true),
  ('eeeeeeee-0002-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 2, 'pre_jury', 6,
    now() - interval '6 days',  now() - interval '1 day',  true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PLAYERS
-- Note: user_id is null — update after signing up:
--   UPDATE players SET user_id = 'your-auth-uuid' WHERE display_name = 'Commissioner';
-- ============================================================
-- PLAYERS: add manually after signing up on the dev branch.
-- Get your auth UUID from Supabase Auth → Users, then run:
--
-- INSERT INTO players (id, user_id, league_id, display_name, is_commissioner, joined_at) VALUES
--   ('dd000001-0000-0000-0000-000000000001', 'YOUR-AUTH-UUID', 'aaaaaaaa-0000-0000-0000-000000000001', 'Commissioner', true, now())
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- EPISODES
-- ============================================================
INSERT INTO episodes (id, league_id, week_number, episode_type, air_date, is_double_eviction, is_locked) VALUES
  ('ffffffff-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1, 'scoring', '2024-07-18', false, true),
  ('ffffffff-0002-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 2, 'scoring', '2024-07-25', false, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PICKS: commented out — insert after players are added.
-- Uncomment and run once you have real player rows in the DB.
-- ============================================================
-- INSERT INTO picks (player_id, houseguest_id, draft_window_id, picked_at) VALUES
--   -- Commissioner: Week 1
--   ('dd000001-0000-0000-0000-000000000001', 'cccccccc-0001-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000001-0000-0000-0000-000000000001', 'cccccccc-0002-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000001-0000-0000-0000-000000000001', 'cccccccc-0003-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000001-0000-0000-0000-000000000001', 'cccccccc-0004-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000001-0000-0000-0000-000000000001', 'cccccccc-0005-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000001-0000-0000-0000-000000000001', 'cccccccc-0006-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   -- Commissioner: Week 2
--   ('dd000001-0000-0000-0000-000000000001', 'cccccccc-0001-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000001-0000-0000-0000-000000000001', 'cccccccc-0007-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000001-0000-0000-0000-000000000001', 'cccccccc-0008-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000001-0000-0000-0000-000000000001', 'cccccccc-0009-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000001-0000-0000-0000-000000000001', 'cccccccc-0010-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000001-0000-0000-0000-000000000001', 'cccccccc-0011-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   -- Player Two: Week 1
--   ('dd000002-0000-0000-0000-000000000001', 'cccccccc-0003-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000002-0000-0000-0000-000000000001', 'cccccccc-0005-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000002-0000-0000-0000-000000000001', 'cccccccc-0007-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000002-0000-0000-0000-000000000001', 'cccccccc-0009-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000002-0000-0000-0000-000000000001', 'cccccccc-0011-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000002-0000-0000-0000-000000000001', 'cccccccc-0013-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   -- Player Two: Week 2
--   ('dd000002-0000-0000-0000-000000000001', 'cccccccc-0002-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000002-0000-0000-0000-000000000001', 'cccccccc-0004-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000002-0000-0000-0000-000000000001', 'cccccccc-0006-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000002-0000-0000-0000-000000000001', 'cccccccc-0008-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000002-0000-0000-0000-000000000001', 'cccccccc-0010-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000002-0000-0000-0000-000000000001', 'cccccccc-0012-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   -- Player Three: Week 1
--   ('dd000003-0000-0000-0000-000000000001', 'cccccccc-0002-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000003-0000-0000-0000-000000000001', 'cccccccc-0004-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000003-0000-0000-0000-000000000001', 'cccccccc-0006-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000003-0000-0000-0000-000000000001', 'cccccccc-0008-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000003-0000-0000-0000-000000000001', 'cccccccc-0010-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000003-0000-0000-0000-000000000001', 'cccccccc-0012-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   -- Player Three: Week 2
--   ('dd000003-0000-0000-0000-000000000001', 'cccccccc-0001-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000003-0000-0000-0000-000000000001', 'cccccccc-0003-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000003-0000-0000-0000-000000000001', 'cccccccc-0005-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000003-0000-0000-0000-000000000001', 'cccccccc-0013-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000003-0000-0000-0000-000000000001', 'cccccccc-0014-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000003-0000-0000-0000-000000000001', 'cccccccc-0015-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   -- Player Four: Week 1
--   ('dd000004-0000-0000-0000-000000000001', 'cccccccc-0001-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000004-0000-0000-0000-000000000001', 'cccccccc-0006-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000004-0000-0000-0000-000000000001', 'cccccccc-0008-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000004-0000-0000-0000-000000000001', 'cccccccc-0010-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000004-0000-0000-0000-000000000001', 'cccccccc-0012-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   ('dd000004-0000-0000-0000-000000000001', 'cccccccc-0014-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', now()),
--   -- Player Four: Week 2
--   ('dd000004-0000-0000-0000-000000000001', 'cccccccc-0002-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000004-0000-0000-0000-000000000001', 'cccccccc-0004-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000004-0000-0000-0000-000000000001', 'cccccccc-0007-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000004-0000-0000-0000-000000000001', 'cccccccc-0011-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000004-0000-0000-0000-000000000001', 'cccccccc-0015-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now()),
--   ('dd000004-0000-0000-0000-000000000001', 'cccccccc-0016-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', now())
-- ON CONFLICT DO NOTHING;

-- ============================================================
-- HOUSEGUEST EVENTS (Week 1)
-- ============================================================
INSERT INTO houseguest_events (houseguest_id, episode_id, scoring_event_id, points_awarded) VALUES
  -- Alex: Won HOH (+10), In a Named Alliance (+3)
  ('cccccccc-0001-0000-0000-000000000001', 'ffffffff-0001-0000-0000-000000000001', 'ee000001-0000-0000-0000-000000000001', 10),
  ('cccccccc-0001-0000-0000-000000000001', 'ffffffff-0001-0000-0000-000000000001', 'ee000016-0000-0000-0000-000000000001', 3),
  -- Brianna: Nominated (-3), Survived the Block (+5)
  ('cccccccc-0002-0000-0000-000000000001', 'ffffffff-0001-0000-0000-000000000001', 'ee000006-0000-0000-0000-000000000001', -3),
  ('cccccccc-0002-0000-0000-000000000001', 'ffffffff-0001-0000-0000-000000000001', 'ee000009-0000-0000-0000-000000000001', 5),
  -- Carlos: Won POV (+8), Used Veto on Themselves (+5)
  ('cccccccc-0003-0000-0000-000000000001', 'ffffffff-0001-0000-0000-000000000001', 'ee000002-0000-0000-0000-000000000001', 8),
  ('cccccccc-0003-0000-0000-000000000001', 'ffffffff-0001-0000-0000-000000000001', 'ee000010-0000-0000-0000-000000000001', 5),
  -- Diana: Nominated (-3), Evicted Pre-Jury (-8)
  ('cccccccc-0004-0000-0000-000000000001', 'ffffffff-0001-0000-0000-000000000001', 'ee000006-0000-0000-0000-000000000001', -3),
  ('cccccccc-0004-0000-0000-000000000001', 'ffffffff-0001-0000-0000-000000000001', 'ee000012-0000-0000-0000-000000000001', -8),
  -- Ethan: Have-Not (-2)
  ('cccccccc-0005-0000-0000-000000000001', 'ffffffff-0001-0000-0000-000000000001', 'ee000023-0000-0000-0000-000000000001', -2),
  -- Fiona: In a Named Alliance (+3), Got in a Fight (-2)
  ('cccccccc-0006-0000-0000-000000000001', 'ffffffff-0001-0000-0000-000000000001', 'ee000016-0000-0000-0000-000000000001', 3),
  ('cccccccc-0006-0000-0000-000000000001', 'ffffffff-0001-0000-0000-000000000001', 'ee000020-0000-0000-0000-000000000001', -2)
ON CONFLICT DO NOTHING;

-- ============================================================
-- HOUSEGUEST EVENTS (Week 2)
-- ============================================================
INSERT INTO houseguest_events (houseguest_id, episode_id, scoring_event_id, points_awarded) VALUES
  -- Greg: Won HOH (+10)
  ('cccccccc-0007-0000-0000-000000000001', 'ffffffff-0002-0000-0000-000000000001', 'ee000001-0000-0000-0000-000000000001', 10),
  -- Hannah: Won POV (+8), Used Veto on Themselves (+5)
  ('cccccccc-0008-0000-0000-000000000001', 'ffffffff-0002-0000-0000-000000000001', 'ee000002-0000-0000-0000-000000000001', 8),
  ('cccccccc-0008-0000-0000-000000000001', 'ffffffff-0002-0000-0000-000000000001', 'ee000010-0000-0000-0000-000000000001', 5),
  -- Ivan: Nominated (-3), Survived the Block (+5)
  ('cccccccc-0009-0000-0000-000000000001', 'ffffffff-0002-0000-0000-000000000001', 'ee000006-0000-0000-0000-000000000001', -3),
  ('cccccccc-0009-0000-0000-000000000001', 'ffffffff-0002-0000-0000-000000000001', 'ee000009-0000-0000-0000-000000000001', 5),
  -- Jade: Nominated (-3), Evicted Pre-Jury (-8)
  ('cccccccc-0010-0000-0000-000000000001', 'ffffffff-0002-0000-0000-000000000001', 'ee000006-0000-0000-0000-000000000001', -3),
  ('cccccccc-0010-0000-0000-000000000001', 'ffffffff-0002-0000-0000-000000000001', 'ee000012-0000-0000-0000-000000000001', -8),
  -- Kyle: Have-Not (-2), Got Busted in a Lie (-3)
  ('cccccccc-0011-0000-0000-000000000001', 'ffffffff-0002-0000-0000-000000000001', 'ee000023-0000-0000-0000-000000000001', -2),
  ('cccccccc-0011-0000-0000-000000000001', 'ffffffff-0002-0000-0000-000000000001', 'ee000019-0000-0000-0000-000000000001', -3),
  -- Alex: In a Named Alliance (+3), Backstabbed Own Alliance (-4)
  ('cccccccc-0001-0000-0000-000000000001', 'ffffffff-0002-0000-0000-000000000001', 'ee000016-0000-0000-0000-000000000001', 3),
  ('cccccccc-0001-0000-0000-000000000001', 'ffffffff-0002-0000-0000-000000000001', 'ee000017-0000-0000-0000-000000000001', -4)
ON CONFLICT DO NOTHING;
