-- Rick Devens goes by "Devens" — update his display nickname
-- Run this in the Supabase SQL editor against your PRODUCTION project.
-- Full name stays "Rick Devens"; only the nickname shown throughout
-- the app (cards, picks, scoring) changes.

UPDATE houseguests SET nickname = 'Devens' WHERE name = 'Rick Devens';
