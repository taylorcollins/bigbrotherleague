-- Add an automatic "HOH + POV Sweep Bonus" scoring event: +1 pt for any
-- houseguest who wins both HOH and POV in the same week. Unlike every other
-- scoring_events row, this one is never entered by the commissioner
-- (entry_mode = 'auto') — it's applied by a trigger on houseguest_events
-- whenever both a hoh_win and pov_win row exist for the same houseguest and
-- week, and removed again if a correction breaks the pair. Run this in the
-- Supabase SQL editor against your PRODUCTION project.
--
-- The label deliberately does NOT start with "Won " so it isn't picked up
-- by the "Won "-prefix comp-win heuristic used in src/lib/draftStats.js and
-- api/generate-power-rankings.js (isCompWin) — this is a bonus on top of
-- two wins already counted, not a third independent competition win.

INSERT INTO scoring_events (key, label, category, points, entry_mode, description)
VALUES (
  'hoh_pov_sweep',
  'HOH + POV Sweep Bonus',
  'comps',
  1,
  'auto',
  'Automatically awarded when a houseguest wins both HOH and POV in the same week.'
);

-- Fires after any houseguest_events insert. If the inserted row is an HOH
-- or POV win, checks whether the houseguest now has both wins recorded for
-- that week, and inserts the bonus (once) if so.
CREATE OR REPLACE FUNCTION apply_hoh_pov_sweep_bonus()
RETURNS TRIGGER AS $$
DECLARE
  v_key text;
  v_week integer;
  v_bonus_id uuid;
  v_has_pair boolean;
  v_already_has_bonus boolean;
BEGIN
  SELECT key INTO v_key FROM scoring_events WHERE id = NEW.scoring_event_id;
  IF v_key NOT IN ('hoh_win', 'pov_win') THEN
    RETURN NEW;
  END IF;

  SELECT week_number INTO v_week FROM episodes WHERE id = NEW.episode_id;
  IF v_week IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    EXISTS (SELECT 1 FROM houseguest_events he JOIN episodes ep ON ep.id = he.episode_id JOIN scoring_events se ON se.id = he.scoring_event_id WHERE he.houseguest_id = NEW.houseguest_id AND ep.week_number = v_week AND se.key = 'hoh_win')
    AND EXISTS (SELECT 1 FROM houseguest_events he JOIN episodes ep ON ep.id = he.episode_id JOIN scoring_events se ON se.id = he.scoring_event_id WHERE he.houseguest_id = NEW.houseguest_id AND ep.week_number = v_week AND se.key = 'pov_win')
  INTO v_has_pair;

  IF NOT v_has_pair THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_bonus_id FROM scoring_events WHERE key = 'hoh_pov_sweep';

  SELECT EXISTS (
    SELECT 1 FROM houseguest_events he
    JOIN episodes ep ON ep.id = he.episode_id
    WHERE he.houseguest_id = NEW.houseguest_id AND ep.week_number = v_week AND he.scoring_event_id = v_bonus_id
  ) INTO v_already_has_bonus;

  IF NOT v_already_has_bonus THEN
    INSERT INTO houseguest_events (episode_id, houseguest_id, scoring_event_id, points_awarded, note)
    VALUES (NEW.episode_id, NEW.houseguest_id, v_bonus_id, (SELECT points FROM scoring_events WHERE id = v_bonus_id), 'Auto-added: won HOH and POV the same week');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_hoh_pov_sweep_bonus ON houseguest_events;
CREATE TRIGGER trg_apply_hoh_pov_sweep_bonus
AFTER INSERT ON houseguest_events
FOR EACH ROW
EXECUTE FUNCTION apply_hoh_pov_sweep_bonus();

-- Mirror image of the insert trigger — if a correction removes an HOH or
-- POV win and breaks the pair, remove the bonus too instead of leaving it
-- stranded. The commissioner's episode-save flow deletes and re-inserts a
-- whole episode's events, so this keeps the bonus correct through edits.
CREATE OR REPLACE FUNCTION remove_hoh_pov_sweep_bonus()
RETURNS TRIGGER AS $$
DECLARE
  v_key text;
  v_week integer;
  v_bonus_id uuid;
  v_has_pair boolean;
BEGIN
  SELECT key INTO v_key FROM scoring_events WHERE id = OLD.scoring_event_id;
  IF v_key NOT IN ('hoh_win', 'pov_win') THEN
    RETURN OLD;
  END IF;

  SELECT week_number INTO v_week FROM episodes WHERE id = OLD.episode_id;
  IF v_week IS NULL THEN
    RETURN OLD;
  END IF;

  SELECT
    EXISTS (SELECT 1 FROM houseguest_events he JOIN episodes ep ON ep.id = he.episode_id JOIN scoring_events se ON se.id = he.scoring_event_id WHERE he.houseguest_id = OLD.houseguest_id AND ep.week_number = v_week AND se.key = 'hoh_win')
    AND EXISTS (SELECT 1 FROM houseguest_events he JOIN episodes ep ON ep.id = he.episode_id JOIN scoring_events se ON se.id = he.scoring_event_id WHERE he.houseguest_id = OLD.houseguest_id AND ep.week_number = v_week AND se.key = 'pov_win')
  INTO v_has_pair;

  IF v_has_pair THEN
    RETURN OLD;
  END IF;

  SELECT id INTO v_bonus_id FROM scoring_events WHERE key = 'hoh_pov_sweep';

  DELETE FROM houseguest_events he
  USING episodes ep
  WHERE he.episode_id = ep.id
    AND he.houseguest_id = OLD.houseguest_id
    AND ep.week_number = v_week
    AND he.scoring_event_id = v_bonus_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_remove_hoh_pov_sweep_bonus ON houseguest_events;
CREATE TRIGGER trg_remove_hoh_pov_sweep_bonus
AFTER DELETE ON houseguest_events
FOR EACH ROW
EXECUTE FUNCTION remove_hoh_pov_sweep_bonus();

-- Backfill: apply the bonus retroactively to every already-recorded week
-- where a houseguest already has both an hoh_win and pov_win event. Attaches
-- the bonus to the POV win's episode, matching the trigger's natural
-- behavior when HOH (nominations episode) is recorded before POV.
INSERT INTO houseguest_events (episode_id, houseguest_id, scoring_event_id, points_awarded, note)
SELECT
  pov.episode_id,
  pov.houseguest_id,
  (SELECT id FROM scoring_events WHERE key = 'hoh_pov_sweep'),
  (SELECT points FROM scoring_events WHERE key = 'hoh_pov_sweep'),
  'Auto-added (backfill): won HOH and POV the same week'
FROM (
  SELECT he.houseguest_id, ep.week_number, he.episode_id
  FROM houseguest_events he
  JOIN episodes ep ON ep.id = he.episode_id
  JOIN scoring_events se ON se.id = he.scoring_event_id
  WHERE se.key = 'pov_win'
) pov
JOIN (
  SELECT he.houseguest_id, ep.week_number
  FROM houseguest_events he
  JOIN episodes ep ON ep.id = he.episode_id
  JOIN scoring_events se ON se.id = he.scoring_event_id
  WHERE se.key = 'hoh_win'
) hoh ON hoh.houseguest_id = pov.houseguest_id AND hoh.week_number = pov.week_number
WHERE NOT EXISTS (
  SELECT 1 FROM houseguest_events he2
  JOIN episodes ep2 ON ep2.id = he2.episode_id
  JOIN scoring_events se2 ON se2.id = he2.scoring_event_id
  WHERE se2.key = 'hoh_pov_sweep'
    AND he2.houseguest_id = pov.houseguest_id
    AND ep2.week_number = pov.week_number
);
