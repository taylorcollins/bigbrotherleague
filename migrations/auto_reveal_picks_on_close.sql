-- Make pick visibility time-based instead of dependent on a manual reveal
-- step. Previously picks_read only exposed other players' picks once
-- draft_windows.is_revealed was flipped to true — and the only code that
-- ever flipped it was a side effect of the commissioner loading the
-- Windows tab in Commissioner.jsx (WindowsTab's loadWindows), so a window
-- past its closes_at could sit "hidden" indefinitely if nobody happened to
-- open that admin page. Add "or the window has already closed" to the
-- policy so picks reveal automatically the moment closes_at passes, with
-- no dependency on anyone visiting anything. Run this in the Supabase SQL
-- editor against your PRODUCTION project.
--
-- is_revealed is left in place — it still lets a commissioner force an
-- early reveal (WindowsTab's forceClose) ahead of the natural close time.

DROP POLICY IF EXISTS "picks_read" ON picks;

CREATE POLICY "picks_read" ON picks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM draft_windows dw
    JOIN players p ON p.league_id = dw.league_id
    WHERE dw.id = picks.draft_window_id
      AND p.user_id = auth.uid()
      AND (dw.is_revealed = true OR now() >= dw.closes_at OR p.id = picks.player_id)
  )
);
