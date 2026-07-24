-- Backfill Week 1 and Week 2 summaries with the copy already live in Game.jsx
-- Run this in the Supabase SQL editor against your PRODUCTION project,
-- after add_week_summaries.sql.
--
-- Prevents a regression once Game.jsx switches from hardcoded per-week
-- JSX to reading from week_summaries.

INSERT INTO week_summaries (league_id, week_number, summary) VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    1,
    E'Hello players! A few housekeeping notes before Week 1 evictions.\n\nThis season''s format threw us some new twists, so we''re adding three scoring categories to match:\n\nBlockbuster is back: Three houseguests hit the block this season instead of two, so +8 pts if your drafted houseguest wins the Blockbuster competition and saves themselves.\n\nWinning Safety: +7 pts if your houseguest wins safety and is exempt from nomination for the week.\n\nBB Time Capsule: +3 pts if your houseguest is America''s pick for the Time Capsule, plus +5 for drawing a power or -2 for drawing a punishment (net +8 or +1).\n\nWeek 2 draft opens right after the eviction — get your picks ready!'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    2,
    E'Week 1 is in the books. First eviction is done, house has reset — new week, new HOH, new targets.\n\nWeek 2 draft is now open. Get your picks in before the next episode airs.\n\nWatch for this week: who wins HOH, who enters the revolving door of being "on the block," and how the houseguests that are doing too much are gonna fare.'
  )
ON CONFLICT (league_id, week_number) DO NOTHING;
