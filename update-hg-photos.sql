-- Set houseguest photos
-- Run this in the Supabase SQL editor against your PRODUCTION project,
-- after bb28-cast.sql has been run (houseguests must exist first).
--
-- Photos are served from public/hgphotos/ in the app (deployed to the site
-- root), so these are plain absolute paths — no separate image host needed.
--
-- Dee Valladares' row is matched by her revealed name, so run
-- reveal-unknown-survivor.sql before this (or re-run this after).

UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-angela-murray.avif'   WHERE name = 'Angela Murray';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-rick-devens.jpeg'     WHERE name = 'Rick Devens';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-dee-valladares.jpeg'  WHERE name = 'Dee Valladares';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-ashley-trail.avif'    WHERE name = 'Ashley Trail';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-barrett-pfeiffer.avif' WHERE name = 'Barrett Pfeiffer';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-chuk-anyanwu.avif'     WHERE name = 'Chuk Anyanwu';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-drew-campbell.avif'    WHERE name = 'Drew Campbell';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-haley-thogmartin.avif' WHERE name = 'Haley Thogmartin';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-jason-de-puy.avif'     WHERE name = 'Jason De Puy';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-kamu-kirk.avif'        WHERE name = 'Kamuela "Kamu" Kirk';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-latrice-verrett.avif'  WHERE name = 'LaTrice Verrett';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-lyric-medeiros.avif'   WHERE name = 'Lyric Medeiros';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-mallory-aurichio.avif' WHERE name = 'Mallory Aurichio';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-melody-morris.avif'    WHERE name = 'Melody Morris';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-rome-seymour.avif'     WHERE name = 'Rome Seymour';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-taylor-brown.avif'     WHERE name = 'Taylor Brown';
UPDATE houseguests SET photo_url = '/hgphotos/big-brother-28-yash-patel.avif'       WHERE name = 'Yash Patel';
