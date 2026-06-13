import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"

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
  const [deadline, setDeadline] = useState(null)

  useEffect(() => {
    supabase
      .from("draft_windows")
      .select("closes_at")
      .gt("closes_at", new Date().toISOString())
      .order("closes_at", { ascending: true })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.closes_at) setDeadline(formatDeadline(data.closes_at))
      })
  }, [])

  return (
    <div className="rounded-card bg-status-pov px-5 py-5 border-b-4 border-amber-600">
      <p className="text-subheadline font-semibold text-center text-gray-900">
        It's draft time!
      </p>
      <p className="text-body-1 text-center text-gray-700 mt-1">
        {deadline ? `Draft closes ${deadline}` : "Draft window open"}
      </p>
      <button
        onClick={() => navigate("/draft")}
        className="mt-4 block w-full max-w-xs mx-auto rounded-card bg-brand-primary px-6 py-2 text-label font-semibold text-white"
      >
        Draft houseguests
      </button>
    </div>
  )
}
