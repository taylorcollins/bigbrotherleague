import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { X, Check, BarChart3 } from "lucide-react"
import { Avatar, Card, PowerRankingsSheet } from "@/components"
import { supabase } from "@/lib/supabase"
import { useCurrentPlayer } from "@/hooks/useCurrentPlayer"
import { computeDraftHighlights } from "@/lib/draftStats"

function formatDeadline(closesAt) {
  if (!closesAt) return null
  const d = new Date(closesAt)
  return d.toLocaleString("en-US", {
    weekday: "long",
    month:   "short",
    day:     "numeric",
    hour:    "numeric",
    minute:  "2-digit",
    timeZoneName: "short",
  })
}

function getInitials(name) {
  const parts = name.trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}


export default function Draft() {
  const navigate = useNavigate()
  const { playerId } = useCurrentPlayer()

  const [houseguests, setHouseguests] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [selectedIds, setSelectedIds] = useState([])
  const [draftWindow, setDraftWindow] = useState(null)  // { id, closes_at, picks_per_player, week_number }
  const [highlights, setHighlights] = useState({})      // houseguest_id → { headline, baseline }
  const [rankingsOpen, setRankingsOpen] = useState(false)

  useEffect(() => {
    if (!playerId) return

    async function fetchData() {
      const [hgRes, windowRes] = await Promise.all([
        supabase
          .from("houseguests")
          .select("*")
          .eq("in_draft_pool", true)
          .order("nickname"),
        supabase
          .from("draft_windows")
          .select("id, closes_at, picks_per_player, week_number")
          .gt("closes_at", new Date().toISOString())
          .order("closes_at", { ascending: true })
          .limit(1)
          .single(),
      ])

      if (hgRes.error) console.error("houseguests:", hgRes.error.message)
      setHouseguests(hgRes.data ?? [])

      if (windowRes.data) {
        setDraftWindow(windowRes.data)

        // Pre-populate with any existing picks for this window,
        // filtered to only houseguests currently in the draft pool
        const { data: existingPicks, error: picksErr } = await supabase
          .from("picks")
          .select("houseguest_id")
          .eq("player_id", playerId)
          .eq("draft_window_id", windowRes.data.id)

        if (picksErr) console.error("existing picks:", picksErr.message)
        if (existingPicks?.length) {
          const validIds = new Set((hgRes.data ?? []).map(h => h.id))
          setSelectedIds(existingPicks.map(p => p.houseguest_id).filter(id => validIds.has(id)))
        }

        // Stat callouts are based on every completed week through the one
        // right before this draft window (the most recent finished week) —
        // includes all houseguests, not just the current pool, so season
        // records stay accurate after a record-holder is evicted.
        const priorWeek = windowRes.data.week_number - 1
        const [eventsRes, episodesRes] = await Promise.all([
          supabase
            .from("houseguest_events")
            .select("houseguest_id, episode_id, points_awarded, scoring_events(label, category)"),
          supabase
            .from("episodes")
            .select("id, week_number"),
        ])
        if (eventsRes.error) console.error("houseguest_events:", eventsRes.error.message)
        if (episodesRes.error) console.error("episodes:", episodesRes.error.message)
        setHighlights(computeDraftHighlights(eventsRes.data ?? [], episodesRes.data ?? [], priorWeek))
      }

      setLoading(false)
    }

    fetchData()
  }, [playerId])

  function toggleSelect(id) {
    const limit = draftWindow?.picks_per_player ?? 5
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(s => s !== id))
    } else {
      if (selectedIds.length >= limit) return
      setSelectedIds([...selectedIds, id])
    }
  }

  async function handleConfirm() {
    if (!draftWindow || !playerId) return
    setSubmitting(true)
    setError(null)

    // Delete existing picks for this player + window, then insert the new set
    const { error: deleteErr } = await supabase
      .from("picks")
      .delete()
      .eq("player_id", playerId)
      .eq("draft_window_id", draftWindow.id)

    if (deleteErr) {
      console.error("delete picks:", deleteErr.message)
      setError("Something went wrong. Please try again.")
      setSubmitting(false)
      return
    }

    const newPicks = selectedIds.map(houseguest_id => ({
      player_id: playerId,
      houseguest_id,
      draft_window_id: draftWindow.id,
      picked_at: new Date().toISOString(),
    }))

    const { error: insertErr } = await supabase
      .from("picks")
      .insert(newPicks)

    if (insertErr) {
      console.error("insert picks:", insertErr.message)
      setError("Something went wrong. Please try again.")
      setSubmitting(false)
      return
    }

    navigate("/")
  }

  const limit = draftWindow?.picks_per_player ?? 5
  const count = selectedIds.length
  const canConfirm = count === limit && !submitting
  const draftClosed = !loading && !draftWindow

  return (
    <div className="fixed inset-0 flex flex-col bg-white">

      {/* Fixed header */}
      <div className="px-4 pt-6 pb-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-headline font-semibold text-gray-900">
            {draftWindow?.week_number != null ? `Week ${draftWindow.week_number} draft` : "Draft houseguests"}
          </p>
          <div className="flex items-center gap-3">
            {!draftClosed && (
              <button onClick={() => setRankingsOpen(true)} className="text-gray-500">
                <BarChart3 size={22} />
              </button>
            )}
            <button onClick={() => navigate("/")} className="text-gray-500">
              <X size={24} />
            </button>
          </div>
        </div>
        {draftWindow?.closes_at && (
          <p className="mt-2 text-caption text-gray-400">
            Draft closes {formatDeadline(draftWindow.closes_at)}
          </p>
        )}
        {!draftClosed && (
          <p className="mt-3 text-subheadline text-gray-900 text-center">
            {count} of {limit} selected
          </p>
        )}
      </div>

      {/* Draft closed state */}
      {draftClosed && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-3">
          <p className="text-headline font-semibold text-gray-900 text-center">Draft is closed</p>
          <p className="text-body-1 text-gray-400 text-center">
            The next draft window isn't open yet. Check back soon.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-2 rounded-card bg-gray-900 px-6 py-2 text-label font-semibold text-white"
          >
            Back to home
          </button>
        </div>
      )}

      {/* Scrollable list — only when draft is open */}
      {!draftClosed && (
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 flex flex-col gap-3">
          {loading ? (
            <p className="text-caption text-gray-400 text-center mt-8">Loading houseguests…</p>
          ) : (
            houseguests.map(hg => {
              const selected = selectedIds.includes(hg.id)
              const atLimit = count >= limit && !selected
              const stats = highlights[hg.id]
              return (
                <button
                  key={hg.id}
                  onClick={() => toggleSelect(hg.id)}
                  disabled={atLimit}
                  className={`text-left w-full ${atLimit ? "opacity-40" : ""}`}
                >
                  <Card noPadding className="flex items-center gap-3 p-3">
                    <Avatar src={hg.photo_url} initials={getInitials(hg.name)} size="md" color="bg-brand-secondary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-label text-gray-900">{hg.nickname}</p>
                      {stats?.headline && (
                        <p className="text-caption text-brand-primary font-semibold mt-0.5">{stats.headline}</p>
                      )}
                      {stats?.baseline && (
                        <p className="text-caption text-gray-400 mt-0.5">{stats.baseline}</p>
                      )}
                    </div>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? "border-gray-900 bg-gray-900" : "border-gray-300"
                    }`}>
                      {selected && <Check size={16} color="white" strokeWidth={2.5} />}
                    </div>
                  </Card>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* Fixed footer — only when draft is open */}
      {!draftClosed && (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        {error && (
          <p className="text-caption text-status-nominee text-center mb-3">{error}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/")}
            disabled={submitting}
            className="flex-1 bg-gray-100 text-gray-900 text-label font-semibold rounded-card py-3 disabled:opacity-40"
          >
            Discard changes
          </button>
          <button
            disabled={!canConfirm}
            onClick={handleConfirm}
            className={`flex-1 text-label font-semibold rounded-card py-3 ${
              canConfirm
                ? "bg-gray-900 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {submitting ? "Saving…" : "Confirm picks"}
          </button>
        </div>
      </div>
      )}

      <PowerRankingsSheet
        isOpen={rankingsOpen}
        onClose={() => setRankingsOpen(false)}
        houseguests={houseguests}
      />

    </div>
  )
}
