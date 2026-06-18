import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Avatar, Card } from "@/components"
import { supabase } from "@/lib/supabase"

const TABS = ["Score", "Windows"]

const CATEGORY_LABELS = {
  comps:    "Competitions",
  play:     "Gameplay",
  social:   "Social Game",
  spirit:   "Spirit",
  one_time: "One Time Only",
}

const CATEGORY_ORDER = ["comps", "play", "social", "spirit", "one_time"]

// Events that can happen multiple times in a single episode
const MULTI_EVENT_LABELS = new Set([
  "Backstabbed Own Alliance",
  "Cried in the Diary Room",
  "Got Busted in a Lie",
  "Got in a Fight",
  "In a Named Alliance",
])

const STATUS_OPTIONS = [
  { value: "active",   label: "Safe" },
  { value: "hoh",      label: "HOH" },
  { value: "pov",      label: "POV Holder" },
  { value: "nominee",  label: "Nominee" },
  { value: "have_not", label: "Have-Not" },
  { value: "jury",     label: "Jury" },
  { value: "evicted",  label: "Evicted" },
  { value: "winner",   label: "Winner" },
]

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

// ---------------------------------------------------------------------------
// Score Tab
// ---------------------------------------------------------------------------
function ScoreTab({ houseguests, scoringEvents }) {
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [selectedEvents, setSelectedEvents] = useState({}) // hg_id → { event_id: count }
  const [statusMap, setStatusMap]         = useState({})   // hg_id → status string
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState(null)
  const [saveSuccess, setSaveSuccess]     = useState(false)
  const [loadingWeek, setLoadingWeek]     = useState(false)

  // Initialise statusMap from current HG statuses
  useEffect(() => {
    const map = {}
    houseguests.forEach(hg => { map[hg.id] = hg.status ?? "active" })
    setStatusMap(map)
  }, [houseguests])

  // Load existing events whenever selected week changes
  const loadWeek = useCallback(async (week) => {
    setLoadingWeek(true)
    setSaveSuccess(false)
    setSaveError(null)

    const { data: episodes } = await supabase
      .from("episodes")
      .select("id")
      .eq("week_number", week)

    if (!episodes?.length) {
      // No episodes for this week yet — clear selections
      setSelectedEvents({})
      setLoadingWeek(false)
      return
    }

    const episodeIds = episodes.map(e => e.id)

    const { data: events } = await supabase
      .from("houseguest_events")
      .select("houseguest_id, scoring_event_id")
      .in("episode_id", episodeIds)

    const map = {}
    events?.forEach(e => {
      if (!map[e.houseguest_id]) map[e.houseguest_id] = {}
      map[e.houseguest_id][e.scoring_event_id] = (map[e.houseguest_id][e.scoring_event_id] ?? 0) + 1
    })
    setSelectedEvents(map)
    setLoadingWeek(false)
  }, [])

  useEffect(() => { loadWeek(selectedWeek) }, [selectedWeek, loadWeek])

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

  function setStatus(hgId, status) {
    setStatusMap(prev => ({ ...prev, [hgId]: status }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    // Find or create an episode for this week
    let episodeId
    const { data: existing } = await supabase
      .from("episodes")
      .select("id")
      .eq("week_number", selectedWeek)
      .limit(1)
      .single()

    if (existing?.id) {
      episodeId = existing.id
    } else {
      const { data: created, error: createErr } = await supabase
        .from("episodes")
        .insert({ week_number: selectedWeek, episode_type: "scoring", is_locked: false })
        .select("id")
        .single()
      if (createErr) {
        setSaveError("Failed to create episode. Try again.")
        setSaving(false)
        return
      }
      episodeId = created.id
    }

    // Delete existing events for this episode
    const { error: deleteErr } = await supabase
      .from("houseguest_events")
      .delete()
      .eq("episode_id", episodeId)

    if (deleteErr) {
      setSaveError("Failed to clear existing events. Try again.")
      setSaving(false)
      return
    }

    // Build new events rows
    const eventLookup = {}
    scoringEvents.forEach(e => { eventLookup[e.id] = e.points })

    const rows = []
    Object.entries(selectedEvents).forEach(([hgId, evCounts]) => {
      Object.entries(evCounts).forEach(([eventId, count]) => {
        for (let i = 0; i < count; i++) {
          rows.push({
            houseguest_id:    hgId,
            episode_id:       episodeId,
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

    // Update houseguest statuses
    const statusUpdates = houseguests.map(hg =>
      supabase
        .from("houseguests")
        .update({ status: statusMap[hg.id] ?? "active" })
        .eq("id", hg.id)
    )
    await Promise.all(statusUpdates)

    setSaving(false)
    setSaveSuccess(true)
  }

  // Group scoring events by category, preserving CATEGORY_ORDER
  const eventsByCategory = {}
  scoringEvents.forEach(e => {
    if (!eventsByCategory[e.category]) eventsByCategory[e.category] = []
    eventsByCategory[e.category].push(e)
  })
  const categories = CATEGORY_ORDER.filter(cat => eventsByCategory[cat])

  // IDs of events that can fire multiple times per episode
  const multiEventIds = new Set(
    scoringEvents.filter(e => MULTI_EVENT_LABELS.has(e.label)).map(e => e.id)
  )

  return (
    <div className="flex flex-col gap-4 px-4 pb-24">

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

      {loadingWeek ? (
        <p className="text-caption text-gray-400 text-center mt-8">Loading…</p>
      ) : (
        houseguests.map(hg => {
          const hgCounts = selectedEvents[hg.id] ?? {}
          return (
            <Card key={hg.id} noPadding className="overflow-hidden">
              {/* HG header row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <Avatar initials={getInitials(hg.name)} size="sm" color="bg-brand-accent" />
                <span className="text-label font-semibold text-gray-900 flex-1">{hg.nickname}</span>
                <select
                  value={statusMap[hg.id] ?? "active"}
                  onChange={e => setStatus(hg.id, e.target.value)}
                  className="text-caption text-gray-600 border border-gray-200 rounded-lg px-2 py-1 bg-white"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Scoring event rows grouped by category */}
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
                            /* Stepper */
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
                            /* Toggle */
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
            </Card>
          )
        })
      )}

      {/* Save feedback */}
      {saveError && (
        <p className="text-caption text-status-nominee text-center">{saveError}</p>
      )}
      {saveSuccess && (
        <p className="text-caption text-status-safe text-center font-semibold">Week {selectedWeek} saved ✓</p>
      )}

      {/* Fixed save button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-card bg-gray-900 py-3 text-label font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : `Save week ${selectedWeek}`}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Windows Tab
// ---------------------------------------------------------------------------
function WindowsTab() {
  const [windows, setWindows] = useState([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(null) // window id currently being updated

  const loadWindows = useCallback(async () => {
    // Auto-reveal any expired windows first
    await supabase
      .from("draft_windows")
      .update({ is_revealed: true })
      .lt("closes_at", new Date().toISOString())
      .eq("is_revealed", false)

    const { data } = await supabase
      .from("draft_windows")
      .select("*")
      .order("week_number")

    setWindows(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadWindows() }, [loadWindows])

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

  if (loading) return <p className="text-caption text-gray-400 text-center mt-8 px-4">Loading…</p>

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {windows.map(w => {
        const now = new Date()
        const closes = new Date(w.closes_at)
        const isOpen = closes > now
        const isBusy = working === w.id

        return (
          <Card key={w.id}>
            {/* Window info */}
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
              <p className="text-caption text-gray-400">
                Opens: {formatWindowDate(w.opens_at)}
              </p>
              <p className="text-caption text-gray-400">
                Closes: {formatWindowDate(w.closes_at)}
              </p>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
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
  const [activeTab, setActiveTab] = useState("Score")
  const [houseguests, setHouseguests] = useState([])
  const [scoringEvents, setScoringEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [hgRes, eventsRes] = await Promise.all([
        supabase.from("houseguests").select("*").order("name"),
        supabase.from("scoring_events").select("*").order("category").order("label"),
      ])
      setHouseguests(hgRes.data ?? [])
      setScoringEvents(eventsRes.data ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

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

        {/* Tabs */}
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

      {/* Tab content */}
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
