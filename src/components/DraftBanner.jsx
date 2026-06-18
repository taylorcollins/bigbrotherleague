import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCurrentPlayer } from "@/hooks/useCurrentPlayer"

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

export default function DraftBanner() {
  const navigate = useNavigate()
  const { playerId } = useCurrentPlayer()
  const [deadline, setDeadline] = useState(null)
  const [hasPicks, setHasPicks] = useState(false)

  useEffect(() => {
    if (!playerId) return

    async function fetchData() {
      const { data: window } = await supabase
        .from("draft_windows")
        .select("id, closes_at")
        .gt("closes_at", new Date().toISOString())
        .order("closes_at", { ascending: true })
        .limit(1)
        .single()

      if (!window) return

      if (window.closes_at) setDeadline(formatDeadline(window.closes_at))

      const { count } = await supabase
        .from("picks")
        .select("id", { count: "exact", head: true })
        .eq("player_id", playerId)
        .eq("draft_window_id", window.id)

      setHasPicks((count ?? 0) > 0)
    }

    fetchData()

    // Refetch when the user returns to this tab/page (e.g. after confirming picks)
    function onVisible() {
      if (document.visibilityState === "visible") fetchData()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [playerId])

  return (
    <div className={`rounded-card px-5 py-5 border-b-4 ${
      hasPicks
        ? "bg-status-safe-light border-green-600"
        : "bg-status-pov border-amber-600"
    }`}>
      {hasPicks ? (
        <div className="flex items-center justify-center gap-2">
          <CheckCircle size={20} className="text-status-safe shrink-0" />
          <p className="text-subheadline font-semibold text-gray-900">Your picks are set!</p>
        </div>
      ) : (
        <p className="text-subheadline font-semibold text-center text-gray-900">
          It's draft time!
        </p>
      )}

      <p className="text-body-1 text-center text-gray-700 mt-1">
        {deadline ? `Draft closes ${deadline}` : "Draft window open"}
      </p>

      <button
        onClick={() => navigate("/draft")}
        className={`mt-4 block w-full max-w-xs mx-auto rounded-card px-6 py-2 text-label font-semibold ${
          hasPicks
            ? "bg-white text-gray-900 border border-gray-200"
            : "bg-brand-primary text-white"
        }`}
      >
        {hasPicks ? "Revise picks" : "Draft houseguests"}
      </button>
    </div>
  )
}
