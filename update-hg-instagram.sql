-- Set houseguest Instagram handles
-- Run this in the Supabase SQL editor against your PRODUCTION project,
-- after bb28-cast.sql has been run (houseguests must exist first).
--
-- Handles stored without the leading '@' — HouseguestProfileSheet builds
-- the link as https://instagram.com/${instagram_handle}.
--
-- Source: https://thetab.com/realityshrine/2026/07/10/we-found-every-big-brother-season-28-cast-members-instagram-for-your-pre-season-stalking/
-- Angela Murray, Rick Devens, and Dee Valladares (returning-player twists,
-- not covered by that article) sourced directly from their Instagram
-- profiles. Dee's row is matched by her revealed name, so run
-- reveal-unknown-survivor.sql before this (or re-run this after).

UPDATE houseguests SET instagram_handle = 'angelamurray_utah_realtor' WHERE name = 'Angela Murray';
UPDATE houseguests SET instagram_handle = 'rick_devens'               WHERE name = 'Rick Devens';
UPDATE houseguests SET instagram_handle = 'roamwithdee'               WHERE name = 'Dee Valladares';
UPDATE houseguests SET instagram_handle = 'ashleytrail3'        WHERE name = 'Ashley Trail';
UPDATE houseguests SET instagram_handle = 'spicy_buckett'       WHERE name = 'Barrett Pfeiffer';
UPDATE houseguests SET instagram_handle = 'chuk_anyanwu'        WHERE name = 'Chuk Anyanwu';
UPDATE houseguests SET instagram_handle = '_drew.campbell_'     WHERE name = 'Drew Campbell';
UPDATE houseguests SET instagram_handle = 'hjthogmartin'        WHERE name = 'Haley Thogmartin';
UPDATE houseguests SET instagram_handle = 'estitties'           WHERE name = 'Jason De Puy';
UPDATE houseguests SET instagram_handle = 'thejawaiian'         WHERE name = 'Kamuela "Kamu" Kirk';
UPDATE houseguests SET instagram_handle = 'latricevf'           WHERE name = 'LaTrice Verrett';
UPDATE houseguests SET instagram_handle = 'lyricmedeiros'       WHERE name = 'Lyric Medeiros';
UPDATE houseguests SET instagram_handle = 'malloryaurichio'     WHERE name = 'Mallory Aurichio';
UPDATE houseguests SET instagram_handle = 'melxmorris'          WHERE name = 'Melody Morris';
UPDATE houseguests SET instagram_handle = 'therealjackseymour'  WHERE name = 'Rome Seymour';
UPDATE houseguests SET instagram_handle = 'iamtaylorbrown'      WHERE name = 'Taylor Brown';
UPDATE houseguests SET instagram_handle = 'yashliveslife'       WHERE name = 'Yash Patel';
