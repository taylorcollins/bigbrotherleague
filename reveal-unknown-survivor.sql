-- Reveal the second returning Survivor castaway: Dee Valladares (Survivor 45 winner)
-- Run this in the Supabase SQL editor against your PRODUCTION project.
--
-- Keeps the same id as the 'Unknown Survivor' placeholder row from
-- bb28-cast.sql so existing picks/scores tied to it aren't orphaned.
-- Photo not included here — add via update-hg-photos.sql once available.

UPDATE houseguests
SET name = 'Dee Valladares', nickname = 'Dee', age = 29, hometown = 'Miami, FL'
WHERE id = '6d7705d0-dc94-41ec-95b5-2257750a7503';
