import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { X, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { Avatar, Card, StatusBadge } from "@/components"
import { supabase } from "@/lib/supabase"
import { useCurrentPlayer } from "@/hooks/useCurrentPlayer"
import { useAuth } from "@/context/AuthContext"
import { LEAGUE_ID, calculatedWeek, EPISODE_TYPES, episodeTypeLabel } from "@/lib/season"

const TABS = ["Score", "Windows"]

const CATEGORY_LABELS = {
  comps:    "Competitions",
  play:     "Gameplay",
  social:   "Social Game",
  spirit:   "Spirit",
  one_time: "Finals",
}

const CATEGORY_ORDER = ["comps", "play", "social", "spirit", "one_time"]

const EVENT_LABEL_ORDER = {
  comps:    ["Won HOH", "Won POV", "Won Blockbuster", "Won Safety", "Won 3+ Comps in a Row", "Made a Deal and Threw a Comp", "Won a Battle Back"],
  play:     ["Nominated", "Blindsided and Evicted", "Backdoored", "Survived the Block", "Used Veto on Themselves", "HOH Executed a Backdoor", "Evicted (Pre-Jury)", "Evicted (Post-Jury)", "Survived Double Eviction Week", "Selected for BB Time Capsule", "Time Capsule: Drew a Power", "Time Capsule: Drew a Punishment"],
  social:   ["Left Out of a Vote", "In a Named Alliance", "Backstabbed Own Alliance", "Cried in the Diary Room", "Got Busted in a Lie", "Got in a Fight", "Showmance Survived the Week", "Showmance Partner Evicted"],
  spirit:   ["Have-Not", "Volunteered as a Pawn", "Wore a Costume for the Week"],
  one_time: ["America's Favorite Player", "Floater Tax", "Kept a Life Secret", "Life Secret Was Exposed", "Made Jury", "Received a Jury Vote"],
}

// Events that can happen multiple times in a single episode
const MULTI_EVENT_LABELS = new Set([
  "Backstabbed Own Alliance",
  "Cried in the Diary Room",
  "Got Busted in a Lie",
  "Got in a Fight",
  "In a Named Alliance",
  "Received a Jury Vote",
])

const STATUS_OPTIONS = [
  { value: "hoh",      label: "HOH" },
  { value: "pov",      label: "POV" },
  { value: "nominee",  label: "Nominee" },
  { value: "active",   label: "Safe" },
  { value: "have_not", label: "Have-Not" },
  { value: "jury",     label: "Jury" },
  { value: "evicted",  label: "Evicted" },
  { value: "winner",   label: "Winner" },
]

// Priority order for saving single status to DB
const STATUS_PRIORITY = ["winner", "evicted", "jury", "hoh", "pov", "nominee", "have_not", "active"]

function primaryStatus(statuses) {
  for (const s of STATUS_PRIORITY) {
    if (statuses.includes(s)) return s
  }
  return "active"
}

function getInitials(name) {
  const parts = (name ?? "").trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name ?? "??").slice(0, 2).toUpperCase()
}

function formatWindowDate(dateStr) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  })
}

function toDatetimeLocal(date) {
  const pad = n => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// ---------------------------------------------------------------------------
// Score Tab
// ---------------------------------------------------------------------------
function ScoreTab({ houseguests, scoringEvents }) {
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [weekEpisodes, setWeekEpisodes] = useState([])          // [{id, episode_type, label}] for selectedWeek, in EPISODE_TYPES order
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(null)
  const [loadingEpisodes, setLoadingEpisodes] = useState(false) // loading the episode picker for selectedWeek
  const [creatingType, setCreatingType] = useState(null)        // episode_type currently being created, if any
  const [editingLabel, setEditingLabel]   = useState(false)
  const [labelDraft, setLabelDraft]       = useState("")
  const [savingLabel, setSavingLabel]     = useState(false)
  const [selectedEvents, setSelectedEvents] = useState({}) // hg_id → { event_id: count }
  const [statusMap, setStatusMap]         = useState({})   // hg_id → string[]
  const [openHgIds, setOpenHgIds]         = useState(new Set())
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState(null)
  const [saveSuccess, setSaveSuccess]     = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)

  // Initialise statusMap from current HG statuses
  useEffect(() => {
    const map = {}
    houseguests.forEach(hg => { map[hg.id] = hg.status ? hg.status.split(",") : ["active"] })
    setStatusMap(map)
  }, [houseguests])

  // Load current week from active draft window on mount
  useEffect(() => {
    async function loadCurrentWeek() {
      const now = new Date().toISOString()
      // Prefer open window, fall back to most recently closed
      const { data: open } = await supabase
        .from("draft_windows")
        .select("week_number")
        .gt("closes_at", now)
        .order("week_number")
        .limit(1)
        .single()

      if (open?.week_number) { setSelectedWeek(open.week_number); return }

      const { data: closed } = await supabase
        .from("draft_windows")
        .select("week_number")
        .lt("closes_at", now)
        .order("closes_at", { ascending: false })
        .limit(1)
        .single()

      setSelectedWeek(closed?.week_number ?? 1)
    }
    loadCurrentWeek()
  }, [])

  // Load this week's episodes whenever selected week changes
  const loadWeekEpisodes = useCallback(async (week) => {
    setLoadingEpisodes(true)
    setSaveSuccess(false)
    setSaveError(null)

    const { data } = await supabase
      .from("episodes")
      .select("id, episode_type, label")
      .eq("week_number", week)

    const eps = (data ?? []).slice().sort(
      (a, b) => EPISODE_TYPES.indexOf(a.episode_type) - EPISODE_TYPES.indexOf(b.episode_type)
    )
    setWeekEpisodes(eps)
    setSelectedEpisodeId(eps.length ? eps[eps.length - 1].id : null)
    setLoadingEpisodes(false)
  }, [])

  useEffect(() => { if (selectedWeek !== null) loadWeekEpisodes(selectedWeek) }, [selectedWeek, loadWeekEpisodes])

  // Load existing events whenever the selected episode changes
  const loadEpisodeEvents = useCallback(async (episodeId) => {
    if (!episodeId) { setSelectedEvents({}); return }
    setLoadingEvents(true)
    setSaveSuccess(false)
    setSaveError(null)

    const { data: events } = await supabase
      .from("houseguest_events")
      .select("houseguest_id, scoring_event_id")
      .eq("episode_id", episodeId)

    const map = {}
    events?.forEach(e => {
      if (!map[e.houseguest_id]) map[e.houseguest_id] = {}
      map[e.houseguest_id][e.scoring_event_id] = (map[e.houseguest_id][e.scoring_event_id] ?? 0) + 1
    })
    setSelectedEvents(map)
    setLoadingEvents(false)
  }, [])

  useEffect(() => { loadEpisodeEvents(selectedEpisodeId) }, [selectedEpisodeId, loadEpisodeEvents])
  useEffect(() => { setEditingLabel(false) }, [selectedEpisodeId])

  async function handleRenameEpisode() {
    const value = labelDraft.trim() || null
    setSavingLabel(true)
    setSaveError(null)

    const { error } = await supabase
      .from("episodes")
      .update({ label: value })
      .eq("id", selectedEpisodeId)

    setSavingLabel(false)

    if (error) {
      setSaveError("Failed to rename episode. Try again.")
      return
    }

    setWeekEpisodes(prev => prev.map(ep => ep.id === selectedEpisodeId ? { ...ep, label: value } : ep))
    setEditingLabel(false)
  }

  async function handleAddEpisode(type) {
    setCreatingType(type)
    setSaveError(null)

    // air_date is NOT NULL in the schema but isn't used for display/sorting
    // here (episode_type + week_number drive that) — default to today.
    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from("episodes")
      .insert({ league_id: LEAGUE_ID, week_number: selectedWeek, episode_type: type, air_date: today, is_locked: false })
      .select("id, episode_type, label")
      .single()

    setCreatingType(null)

    if (error) {
      setSaveError("Failed to create episode. Try again.")
      return
    }

    setWeekEpisodes(prev => [...prev, data].sort(
      (a, b) => EPISODE_TYPES.indexOf(a.episode_type) - EPISODE_TYPES.indexOf(b.episode_type)
    ))
    setSelectedEpisodeId(data.id)
  }

  function toggleHg(hgId) {
    setOpenHgIds(prev => {
      const next = new Set(prev)
      next.has(hgId) ? next.delete(hgId) : next.add(hgId)
      return next
    })
  }

  function toggleStatus(hgId, value) {
    setStatusMap(prev => {
      const current = prev[hgId] ?? []
      const next = current.includes(value)
        ? current.filter(s => s !== value)
        : [...current, value]
      return { ...prev, [hgId]: next.length ? next : ["active"] }
    })
  }

  function toggleEvent(hgId, eventId) {
    setSelectedEvents(prev => {
      const current = { ...(prev[hgId] ?? {}) }
      current[eventId] = current[eventId] ? 0 : 1
      return { ...prev, [hgId]: current }
    })
  }

  function stepEvent(hgId, eventId, delta) {
    setSelectedEvents(prev => {
      const current = { ...(prev[hgId] ?? {}) }
      current[eventId] = Math.max(0, (current[eventId] ?? 0) + delta)
      return { ...prev, [hgId]: current }
    })
  }

  async function handleSave() {
    if (!selectedEpisodeId) return

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    // Delete existing events for this episode
    const { error: deleteErr } = await supabase
      .from("houseguest_events")
      .delete()
      .eq("episode_id", selectedEpisodeId)

    if (deleteErr) {
      setSaveError("Failed to clear existing events. Try again.")
      setSaving(false)
      return
    }

    // Build new event rows
    const eventLookup = {}
    scoringEvents.forEach(e => { eventLookup[e.id] = e.points })

    const rows = []
    Object.entries(selectedEvents).forEach(([hgId, evCounts]) => {
      Object.entries(evCounts).forEach(([eventId, count]) => {
        for (let i = 0; i < count; i++) {
          rows.push({
            houseguest_id:    hgId,
            episode_id:       selectedEpisodeId,
            scoring_event_id: eventId,
            points_awarded:   eventLookup[eventId] ?? 0,
          })
        }
      })
    })

    if (rows.length > 0) {
      const { error: insertErr } = await supabase
        .from("houseguest_events")
        .insert(rows)
      if (insertErr) {
        setSaveError("Failed to save events. Try again.")
        setSaving(false)
        return
      }
    }

    // Update houseguest statuses — save all as comma-separated slugs.
    // Evicted houseguests are pulled from the draft pool automatically
    // (and restored if that status is ever cleared, e.g. a return twist).
    const statusUpdates = houseguests.map(hg => {
      const statuses = statusMap[hg.id] ?? ["active"]
      return supabase
        .from("houseguests")
        .update({ status: statuses.join(","), in_draft_pool: !statuses.includes("evicted") })
        .eq("id", hg.id)
    })
    await Promise.all(statusUpdates)

    setSaving(false)
    setSaveSuccess(true)
  }

  // Group and sort scoring events by category
  const eventsByCategory = {}
  scoringEvents.forEach(e => {
    if (!eventsByCategory[e.category]) eventsByCategory[e.category] = []
    eventsByCategory[e.category].push(e)
  })

  // Sort events within each category by the defined label order
  Object.keys(eventsByCategory).forEach(cat => {
    const order = EVENT_LABEL_ORDER[cat] ?? []
    eventsByCategory[cat].sort((a, b) => {
      const ai = order.indexOf(a.label)
      const bi = order.indexOf(b.label)
      if (ai === -1 && bi === -1) return a.label.localeCompare(b.label)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  })

  const categories = CATEGORY_ORDER.filter(cat => eventsByCategory[cat])

  const multiEventIds = new Set(
    scoringEvents.filter(e => MULTI_EVENT_LABELS.has(e.label)).map(e => e.id)
  )

  const selectedEpisode = weekEpisodes.find(ep => ep.id === selectedEpisodeId)
  const selectedEpisodeLabel = selectedEpisode ? (selectedEpisode.label || episodeTypeLabel(selectedEpisode.episode_type)) : null

  return (
    <div className="flex flex-col gap-3 px-4 pb-24">

      {/* Week selector */}
      <div className="flex items-center justify-between pt-4">
        <p className="text-headline font-semibold text-gray-900">Week {selectedWeek}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedWeek(w => Math.max(1, w - 1))}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-600"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setSelectedWeek(w => w + 1)}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-600"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Episode selector */}
      {loadingEpisodes ? (
        <p className="text-caption text-gray-400 text-center mt-2">Loading episodes…</p>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {weekEpisodes.map(ep => (
            <button
              key={ep.id}
              onClick={() => setSelectedEpisodeId(ep.id)}
              className={`px-3 py-1.5 rounded-pill text-caption font-semibold border transition-colors ${
                selectedEpisodeId === ep.id
                  ? "bg-brand-primary text-white border-brand-primary"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {ep.label || episodeTypeLabel(ep.episode_type)}
            </button>
          ))}
          {EPISODE_TYPES.filter(type =>
            (type !== "premiere" || selectedWeek === 1) &&
            !weekEpisodes.some(ep => ep.episode_type === type)
          ).map(type => (
            <button
              key={type}
              onClick={() => handleAddEpisode(type)}
              disabled={creatingType !== null}
              className="px-3 py-1.5 rounded-pill text-caption font-semibold border border-dashed border-gray-300 text-gray-500 disabled:opacity-30"
            >
              {creatingType === type ? "Adding…" : `+ ${episodeTypeLabel(type)}`}
            </button>
          ))}
        </div>
      )}

      {/* Rename the selected episode's display name */}
      {selectedEpisode && !editingLabel && (
        <div className="flex items-center gap-2">
          <p className="text-caption text-gray-400">
            Showing as "{selectedEpisode.label || episodeTypeLabel(selectedEpisode.episode_type)}"
          </p>
          <button
            onClick={() => { setLabelDraft(selectedEpisode.label ?? ""); setEditingLabel(true) }}
            className="text-caption text-brand-primary font-semibold"
          >
            Rename
          </button>
        </div>
      )}

      {selectedEpisode && editingLabel && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={labelDraft}
            onChange={e => setLabelDraft(e.target.value)}
            placeholder={episodeTypeLabel(selectedEpisode.episode_type)}
            className="flex-1 rounded-card border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button
            onClick={handleRenameEpisode}
            disabled={savingLabel}
            className="rounded-card bg-gray-900 px-4 py-2 text-caption font-semibold text-white disabled:opacity-30"
          >
            {savingLabel ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditingLabel(false)} className="text-caption text-gray-400">
            Cancel
          </button>
        </div>
      )}

      {loadingEvents ? (
        <p className="text-caption text-gray-400 text-center mt-8">Loading…</p>
      ) : !selectedEpisodeId ? (
        <p className="text-caption text-gray-400 text-center mt-8">Add a Nominations, POV, or Eviction episode above to start scoring this week.</p>
      ) : (
        houseguests.map(hg => {
          const hgCounts = selectedEvents[hg.id] ?? {}
          const statuses = statusMap[hg.id] ?? ["active"]
          const isOpen   = openHgIds.has(hg.id)
          const eventCount = Object.values(hgCounts).reduce((s, c) => s + c, 0)

          return (
            <Card key={hg.id} noPadding className="overflow-hidden">
              {/* HG header — tap to expand */}
              <button
                onClick={() => toggleHg(hg.id)}
                className="flex items-center gap-3 px-4 py-3 w-full text-left"
              >
                <Avatar src={hg.photo_url} initials={getInitials(hg.name)} size="sm" color="bg-brand-secondary" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-label font-semibold text-gray-900">{hg.nickname}</span>
                    {statuses.filter(s => s !== "active").length > 0 && (
                      <StatusBadge status={statuses.filter(s => s !== "active").join(",")} />
                    )}
                  </div>
                  {eventCount > 0 && (
                    <span className="text-caption text-brand-primary font-semibold">{eventCount} events</span>
                  )}
                </div>
                <ChevronDown
                  size={18}
                  className={`text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isOpen && (
                <>
                  {/* Multi-select status tags */}
                  <div className="flex flex-wrap gap-2 px-4 pb-3 border-b border-gray-100">
                    {STATUS_OPTIONS.map(opt => {
                      const selected = statuses.includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleStatus(hg.id, opt.value)}
                          className={`px-3 py-1 rounded-pill text-caption font-semibold border transition-colors ${
                            selected
                              ? "bg-brand-primary text-white border-brand-primary"
                              : "bg-white text-gray-500 border-gray-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Scoring events grouped by category */}
                  <div className="flex flex-col">
                    {categories.map(cat => (
                      <div key={cat}>
                        <p className="text-caption text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">
                          {CATEGORY_LABELS[cat] ?? cat}
                        </p>
                        {eventsByCategory[cat].map(ev => {
                          const count   = hgCounts[ev.id] ?? 0
                          const isMulti = multiEventIds.has(ev.id)
                          return (
                            <div
                              key={ev.id}
                              className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-100"
                            >
                              <span className="flex-1 text-body-1 text-gray-900">{ev.label}</span>
                              <span className={`text-body-1 font-semibold mr-2 ${ev.points >= 0 ? "text-brand-primary" : "text-status-nominee"}`}>
                                {ev.points >= 0 ? `+${ev.points}` : ev.points}
                              </span>

                              {isMulti ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => stepEvent(hg.id, ev.id, -1)}
                                    disabled={count === 0}
                                    className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 text-label disabled:opacity-30"
                                  >
                                    −
                                  </button>
                                  <span className="w-4 text-center text-label font-semibold text-gray-900">
                                    {count}
                                  </span>
                                  <button
                                    onClick={() => stepEvent(hg.id, ev.id, 1)}
                                    className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 text-label"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => toggleEvent(hg.id, ev.id)}
                                  className={`relative inline-flex w-11 h-6 shrink-0 rounded-full transition-colors duration-200 ${count ? "bg-brand-primary" : "bg-gray-200"}`}
                                >
                                  <span className={`inline-block w-4 h-4 mt-1 rounded-full bg-white shadow transition-transform duration-200 ${count ? "translate-x-6" : "translate-x-1"}`} />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )
        })
      )}

      {saveError && (
        <p className="text-caption text-status-nominee text-center">{saveError}</p>
      )}
      {saveSuccess && (
        <p className="text-caption text-status-safe text-center font-semibold">
          {selectedEpisodeLabel} saved ✓
        </p>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <button
          onClick={handleSave}
          disabled={saving || !selectedEpisodeId}
          className="w-full rounded-card bg-gray-900 py-3 text-label font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : selectedEpisodeLabel ? `Save ${selectedEpisodeLabel}` : "Save"}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Windows Tab
// ---------------------------------------------------------------------------
function SeasonWeekCard() {
  const [override, setOverride] = useState(null)   // number | null, as stored in DB
  const [draft, setDraft] = useState("")           // input field value
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const autoWeek = calculatedWeek()

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("leagues")
      .select("current_week_override")
      .eq("id", LEAGUE_ID)
      .single()
    setOverride(data?.current_week_override ?? null)
    setDraft(data?.current_week_override != null ? String(data.current_week_override) : "")
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    const value = draft === "" ? null : parseInt(draft, 10)
    setSaving(true)
    await supabase
      .from("leagues")
      .update({ current_week_override: value })
      .eq("id", LEAGUE_ID)
    await load()
    setSaving(false)
  }

  async function handleReset() {
    setSaving(true)
    await supabase
      .from("leagues")
      .update({ current_week_override: null })
      .eq("id", LEAGUE_ID)
    await load()
    setSaving(false)
  }

  if (loading) return null

  const displayedWeek = override ?? autoWeek

  return (
    <Card className="mb-1">
      <p className="text-label font-semibold text-gray-900 mb-1">Season week</p>
      <p className="text-caption text-gray-400 mb-3">
        "Week in BBL" is currently showing <strong className="text-gray-700">Week {displayedWeek}</strong>
        {" "}({override != null ? "manual override" : `auto-calculated, would be Week ${autoWeek}`}).
        Auto advances every 7 days from the season premiere — override it for double
        evictions or other weeks that break the normal cadence.
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={`Auto: ${autoWeek}`}
          className="w-24 rounded-card border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
        <button
          onClick={handleSave}
          disabled={saving || draft === ""}
          className="rounded-card bg-gray-900 px-4 py-2 text-caption font-semibold text-white disabled:opacity-30"
        >
          Save override
        </button>
        {override != null && (
          <button
            onClick={handleReset}
            disabled={saving}
            className="rounded-card border border-gray-200 px-4 py-2 text-caption font-semibold text-gray-700 disabled:opacity-30"
          >
            Reset to automatic
          </button>
        )}
      </div>
    </Card>
  )
}

function WeekSummaryCard() {
  const { session } = useAuth()
  const [weekNumber, setWeekNumber] = useState(null)
  const [draft, setDraft] = useState("")
  const [savedSummary, setSavedSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Default to the same week "Week in BBL" is currently showing
  useEffect(() => {
    async function initWeek() {
      const { data } = await supabase
        .from("leagues")
        .select("current_week_override")
        .eq("id", LEAGUE_ID)
        .single()
      setWeekNumber(data?.current_week_override ?? calculatedWeek())
    }
    initWeek()
  }, [])

  const loadSummary = useCallback(async (week) => {
    setLoading(true)
    setError(null)
    const { data } = await supabase
      .from("week_summaries")
      .select("summary")
      .eq("league_id", LEAGUE_ID)
      .eq("week_number", week)
      .maybeSingle()
    setSavedSummary(data?.summary ?? null)
    setDraft(data?.summary ?? "")
    setLoading(false)
  }, [])

  useEffect(() => { if (weekNumber !== null) loadSummary(weekNumber) }, [weekNumber, loadSummary])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/generate-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ weekNumber }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate summary")
      setDraft(data.summary)
    } catch (err) {
      setError(err.message)
    }
    setGenerating(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const { error: saveErr } = await supabase
      .from("week_summaries")
      .upsert(
        { league_id: LEAGUE_ID, week_number: weekNumber, summary: draft, updated_at: new Date().toISOString() },
        { onConflict: "league_id,week_number" }
      )
    if (saveErr) {
      setError("Failed to save summary. Try again.")
    } else {
      setSavedSummary(draft)
    }
    setSaving(false)
  }

  if (weekNumber === null) return null

  return (
    <Card className="mb-1">
      <div className="flex items-center justify-between mb-1">
        <p className="text-label font-semibold text-gray-900">Week summary</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekNumber(w => Math.max(0, w - 1))}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-600"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-caption text-gray-500">Week {weekNumber}</span>
          <button
            onClick={() => setWeekNumber(w => w + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-600"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <p className="text-caption text-gray-400 mb-3">
        This is the recap shown on the Game page for Week {weekNumber}. Generate a draft with Claude, edit as needed, then save.
      </p>
      {loading ? (
        <p className="text-caption text-gray-400">Loading…</p>
      ) : (
        <>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={6}
            placeholder="No summary yet for this week."
            className="w-full rounded-card border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary mb-2"
          />
          {error && <p className="text-caption text-status-nominee mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-card border border-gray-200 px-4 py-2 text-caption font-semibold text-gray-700 disabled:opacity-30"
            >
              {generating ? "Generating…" : "Generate with Claude"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || draft === (savedSummary ?? "")}
              className="rounded-card bg-gray-900 px-4 py-2 text-caption font-semibold text-white disabled:opacity-30"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}
    </Card>
  )
}

function WindowsTab() {
  const [windows, setWindows] = useState([])
  const [pickCounts, setPickCounts] = useState({}) // draft_window_id -> pick count
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(null)

  const [newWeekNumber, setNewWeekNumber] = useState("")
  const [newClosesAt, setNewClosesAt] = useState("")
  const [newPicksPerPlayer, setNewPicksPerPlayer] = useState("6")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const defaultsInitialized = useRef(false)

  const loadWindows = useCallback(async () => {
    await supabase
      .from("draft_windows")
      .update({ is_revealed: true })
      .lt("closes_at", new Date().toISOString())
      .eq("is_revealed", false)

    const { data } = await supabase
      .from("draft_windows")
      .select("*")
      .order("week_number")

    const rows = data ?? []
    setWindows(rows)

    if (rows.length) {
      const { data: picks } = await supabase
        .from("picks")
        .select("draft_window_id")
        .in("draft_window_id", rows.map(w => w.id))

      const counts = {}
      ;(picks ?? []).forEach(p => {
        counts[p.draft_window_id] = (counts[p.draft_window_id] ?? 0) + 1
      })
      setPickCounts(counts)
    } else {
      setPickCounts({})
    }

    setLoading(false)
  }, [])

  useEffect(() => { loadWindows() }, [loadWindows])

  // Seed the create-form defaults once windows have loaded, and again after
  // a successful create (defaultsInitialized is reset in handleCreate).
  useEffect(() => {
    if (loading || defaultsInitialized.current) return
    defaultsInitialized.current = true
    const nextWeek = windows.length ? Math.max(...windows.map(w => w.week_number)) + 1 : 1
    setNewWeekNumber(String(nextWeek))
    setNewClosesAt(toDatetimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)))
  }, [loading, windows])

  async function forceClose(id) {
    setWorking(id)
    await supabase
      .from("draft_windows")
      .update({ closes_at: new Date().toISOString(), is_revealed: true })
      .eq("id", id)
    await loadWindows()
    setWorking(null)
  }

  async function forceOpen(id) {
    setWorking(id)
    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from("draft_windows")
      .update({ closes_at: sevenDays, is_revealed: false })
      .eq("id", id)
    await loadWindows()
    setWorking(null)
  }

  async function handleDelete(id) {
    setWorking(id)
    await supabase.from("draft_windows").delete().eq("id", id)
    await loadWindows()
    setWorking(null)
  }

  async function handleCreate() {
    const weekNumber = parseInt(newWeekNumber, 10)
    const picksPerPlayer = parseInt(newPicksPerPlayer, 10)

    if (!Number.isInteger(weekNumber) || weekNumber < 1) {
      setCreateError("Enter a valid week number.")
      return
    }
    if (!newClosesAt) {
      setCreateError("Pick a close date/time.")
      return
    }
    if (!Number.isInteger(picksPerPlayer) || picksPerPlayer < 1) {
      setCreateError("Enter a valid picks-per-player count.")
      return
    }
    if (windows.some(w => w.week_number === weekNumber)) {
      setCreateError(`Week ${weekNumber} already has a draft window.`)
      return
    }

    setCreating(true)
    setCreateError(null)

    const { error } = await supabase.from("draft_windows").insert({
      league_id: LEAGUE_ID,
      week_number: weekNumber,
      phase: "pre_jury",
      picks_per_player: picksPerPlayer,
      opens_at: new Date().toISOString(),
      closes_at: new Date(newClosesAt).toISOString(),
      is_revealed: false,
    })

    if (error) {
      setCreateError(error.message)
      setCreating(false)
      return
    }

    setNewWeekNumber("")
    setNewClosesAt("")
    setNewPicksPerPlayer("6")
    defaultsInitialized.current = false
    await loadWindows()
    setCreating(false)
  }

  if (loading) return <p className="text-caption text-gray-400 text-center mt-8 px-4">Loading…</p>

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <SeasonWeekCard />
      <WeekSummaryCard />

      <Card>
        <p className="text-label font-semibold text-gray-900 mb-1">Create draft window</p>
        <p className="text-caption text-gray-400 mb-3">
          Opens immediately. No more per-week SQL scripts — this replaces them.
        </p>
        <div className="flex flex-col gap-2 mb-3">
          <label className="text-caption text-gray-500">
            Week number
            <input
              type="number"
              min={1}
              value={newWeekNumber}
              onChange={e => setNewWeekNumber(e.target.value)}
              className="w-full mt-1 rounded-card border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </label>
          <label className="text-caption text-gray-500">
            Closes
            <input
              type="datetime-local"
              value={newClosesAt}
              onChange={e => setNewClosesAt(e.target.value)}
              className="w-full mt-1 rounded-card border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </label>
          <label className="text-caption text-gray-500">
            Picks per player
            <input
              type="number"
              min={1}
              value={newPicksPerPlayer}
              onChange={e => setNewPicksPerPlayer(e.target.value)}
              className="w-full mt-1 rounded-card border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </label>
        </div>
        {createError && <p className="text-caption text-status-nominee mb-2">{createError}</p>}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="rounded-card bg-gray-900 px-4 py-2 text-caption font-semibold text-white disabled:opacity-30"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </Card>

      {windows.map(w => {
        const now = new Date()
        const closes = new Date(w.closes_at)
        const isOpen = closes > now
        const isBusy = working === w.id
        const hasPicks = (pickCounts[w.id] ?? 0) > 0

        return (
          <Card key={w.id}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-label font-semibold text-gray-900">Week {w.week_number}</p>
                <p className="text-caption text-gray-400 mt-0.5">
                  {isOpen ? "Open" : "Closed"} · {w.is_revealed ? "Picks revealed" : "Picks hidden"}
                </p>
              </div>
              <span className={`text-caption font-semibold px-2 py-0.5 rounded-pill ${
                isOpen ? "bg-status-safe-light text-status-safe" : "bg-gray-100 text-gray-500"
              }`}>
                {isOpen ? "Open" : "Closed"}
              </span>
            </div>

            <div className="flex flex-col gap-1 mb-4">
              <p className="text-caption text-gray-400">Opens: {formatWindowDate(w.opens_at)}</p>
              <p className="text-caption text-gray-400">Closes: {formatWindowDate(w.closes_at)}</p>
            </div>

            <div className="flex gap-2 mb-2">
              <button
                onClick={() => forceOpen(w.id)}
                disabled={isBusy || isOpen}
                className="flex-1 rounded-card border border-gray-200 py-2 text-caption font-semibold text-gray-700 disabled:opacity-30"
              >
                Force Open
              </button>
              <button
                onClick={() => forceClose(w.id)}
                disabled={isBusy || !isOpen}
                className="flex-1 rounded-card bg-gray-900 py-2 text-caption font-semibold text-white disabled:opacity-30"
              >
                Force Close
              </button>
            </div>
            <button
              onClick={() => handleDelete(w.id)}
              disabled={isBusy || hasPicks}
              title={hasPicks ? "Can't delete — players have already picked for this week" : "Delete this draft window"}
              className="w-full rounded-card border border-status-nominee py-2 text-caption font-semibold text-status-nominee disabled:opacity-30 disabled:border-gray-200 disabled:text-gray-400"
            >
              Delete
            </button>
          </Card>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function Commissioner() {
  const navigate = useNavigate()
  const { isCommissioner, loading: playerLoading } = useCurrentPlayer()
  const [activeTab, setActiveTab] = useState("Score")
  const [houseguests, setHouseguests] = useState([])
  const [scoringEvents, setScoringEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [hgRes, eventsRes] = await Promise.all([
        supabase.from("houseguests").select("*").order("nickname"),
        // entry_mode = 'auto' events (e.g. the HOH+POV sweep bonus) are
        // applied automatically by a DB trigger and shouldn't be offered
        // here as a manual checkbox.
        supabase.from("scoring_events").select("*").eq("entry_mode", "commissioner"),
      ])
      setHouseguests(hgRes.data ?? [])
      setScoringEvents(eventsRes.data ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (playerLoading) return null

  if (!isCommissioner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <p className="text-sm text-gray-400">You don't have access to this page.</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">

      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-0 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-headline font-semibold text-gray-900">Commissioner</p>
          <button onClick={() => navigate("/profile")} className="text-gray-500">
            <X size={24} />
          </button>
        </div>

        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-label transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-gray-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-caption text-gray-400 text-center mt-12">Loading…</p>
        ) : activeTab === "Score" ? (
          <ScoreTab houseguests={houseguests} scoringEvents={scoringEvents} />
        ) : (
          <WindowsTab />
        )}
      </div>

    </div>
  )
}
