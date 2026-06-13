import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { X, Check } from "lucide-react"
import { Avatar, Card, StatusBadge } from "@/components"
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

function getInitials(name) {
  const parts = name.trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function dbStatusToBadge(status) {
  const map = {
    hoh:      "HOH",
    pov:      "POV Holder",
    nominee:  "Nominee",
    active:   "Safe",
    jury:     "Jury",
    evicted:  "Evicted",
    winner:   "Winner",
    have_not: "Have-Not",
  }
  return map[status] ?? "Safe"
}

export default function Draft() {
  const navigate = useNavigate()
  const [houseguests, setHouseguests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [deadline, setDeadline] = useState(null)

  useEffect(() => {
    async function fetchData() {
      const [hgRes, windowRes] = await Promise.all([
        supabase
          .from("houseguests")
          .select("*")
          .eq("in_draft_pool", true)
          .order("name"),
        supabase
          .from("draft_windows")
          .select("closes_at")
          .gt("closes_at", new Date().toISOString())
          .order("closes_at", { ascending: true })
          .limit(1)
          .single(),
      ])

      if (hgRes.error) console.error("houseguests:", hgRes.error.message)
      setHouseguests(hgRes.data ?? [])
      if (windowRes.data?.closes_at) setDeadline(formatDeadline(windowRes.data.closes_at))
      setLoading(false)
    }

    fetchData()
  }, [])

  function toggleSelect(id) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(s => s !== id))
    } else {
      if (selectedIds.length >= 5) return
      setSelectedIds([...selectedIds, id])
    }
  }

  const count = selectedIds.length
  const canConfirm = count === 5

  return (
    <div className="fixed inset-0 flex flex-col bg-white">

      {/* Fixed header */}
      <div className="px-4 pt-6 pb-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-headline font-semibold text-gray-900">Draft houseguests</p>
          <button onClick={() => navigate("/")} className="text-gray-500">
            <X size={24} />
          </button>
        </div>
        {deadline && (
          <p className="mt-2 text-caption text-gray-400">Draft closes {deadline}</p>
        )}
        <p className="mt-3 text-subheadline text-gray-900 text-center">
          {count} of 5 selected
        </p>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {loading ? (
          <p className="text-caption text-gray-400 text-center mt-8">Loading houseguests…</p>
        ) : (
          houseguests.map(hg => {
            const selected = selectedIds.includes(hg.id)
            return (
              <button
                key={hg.id}
                onClick={() => toggleSelect(hg.id)}
                className="text-left w-full"
              >
                <Card noPadding className="flex items-center gap-3 p-3">
                  <Avatar initials={getInitials(hg.name)} size="md" color="bg-brand-accent" />
                  <div className="flex-1 min-w-0">
                    <p className="text-label text-gray-900">{hg.nickname}</p>
                    <div className="mt-1">
                      <StatusBadge status={dbStatusToBadge(hg.status)} />
                    </div>
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

      {/* Fixed footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 flex gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex-1 bg-gray-100 text-gray-900 text-label font-semibold rounded-card py-3"
        >
          Discard changes
        </button>
        <button
          disabled={!canConfirm}
          onClick={() => console.log("Selected:", selectedIds)}
          className={`flex-1 text-label font-semibold rounded-card py-3 ${
            canConfirm
              ? "bg-gray-900 text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Confirm picks
        </button>
      </div>
    </div>
  )
}
