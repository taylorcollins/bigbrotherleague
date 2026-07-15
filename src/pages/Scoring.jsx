import { useState, useEffect } from "react"
import { PageHeader, Card } from "@/components"
import { supabase } from "@/lib/supabase"

const CATEGORY_ORDER = ["comps", "play", "social", "spirit", "one_time"]

const CATEGORY_LABELS = {
  comps:    "Competitions",
  play:     "Gameplay",
  social:   "Social Game",
  spirit:   "Spirit",
  one_time: "Finals",
}

const CATEGORY_DESCRIPTIONS = {
  comps:    "Points for winning or competing in competitions.",
  play:     "Points based on your houseguest's position in the game.",
  social:   "Points for social moves and moments inside the house.",
  spirit:   "Points for personality and character moments.",
  one_time: "End-of-season events and awards.",
}

const EVENT_LABEL_ORDER = {
  comps:    ["Won HOH", "Won POV", "Won Blockbuster", "Won Safety", "Won 3+ Comps in a Row", "Made a Deal and Threw a Comp", "Won a Battle Back"],
  play:     ["Nominated", "Blindsided and Evicted", "Backdoored", "Survived the Block", "Used Veto on Themselves", "HOH Executed a Backdoor", "Evicted (Pre-Jury)", "Evicted (Post-Jury)", "Survived Double Eviction Week", "Selected for BB Time Capsule", "Time Capsule: Drew a Power", "Time Capsule: Drew a Punishment"],
  social:   ["Left Out of a Vote", "In a Named Alliance", "Backstabbed Own Alliance", "Cried in the Diary Room", "Got Busted in a Lie", "Got in a Fight", "Showmance Survived the Week", "Showmance Partner Evicted"],
  spirit:   ["Have-Not", "Volunteered as a Pawn", "Wore a Costume for the Week"],
  one_time: ["America's Favorite Player", "Floater Tax", "Kept a Life Secret", "Life Secret Was Exposed", "Made Jury", "Received a Jury Vote"],
}

function PointPill({ points }) {
  const positive = points > 0
  return (
    <span
      className={`shrink-0 rounded-pill px-2 py-0.5 text-caption font-semibold ${
        positive
          ? "bg-brand-primary/10 text-brand-primary"
          : "bg-status-nominee-light text-status-nominee"
      }`}
    >
      {positive ? `+${points}` : points}
    </span>
  )
}

function ScoreRow({ label, description, points, isLast }) {
  return (
    <div className={`flex items-start gap-3 py-3 ${!isLast ? "border-b border-gray-100" : ""}`}>
      <div className="flex-1 min-w-0">
        <p className="text-label text-gray-900">{label}</p>
        <p className="text-caption text-gray-400 mt-0.5">{description}</p>
      </div>
      <PointPill points={points} />
    </div>
  )
}

export default function Scoring() {
  const [eventsByCategory, setEventsByCategory] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from("scoring_events")
        .select("label, points, description, category")
        .order("points", { ascending: false })

      if (error) {
        console.error("Error fetching scoring events:", error.message)
      } else {
        // Group by category
        const grouped = {}
        data.forEach(event => {
          if (!grouped[event.category]) grouped[event.category] = []
          grouped[event.category].push(event)
        })
        Object.keys(grouped).forEach(cat => {
          const order = EVENT_LABEL_ORDER[cat] ?? []
          grouped[cat].sort((a, b) => {
            const ai = order.indexOf(a.label)
            const bi = order.indexOf(b.label)
            if (ai === -1 && bi === -1) return a.label.localeCompare(b.label)
            if (ai === -1) return 1
            if (bi === -1) return -1
            return ai - bi
          })
        })
        setEventsByCategory(grouped)
      }
      setLoading(false)
    }

    fetchEvents()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="Scoring" />

      <div className="flex flex-col gap-6 px-4">

        {/* How it works */}
        <div>
          <p className="text-headline font-semibold text-gray-900 mb-3">How it works</p>
          <Card>
            <p className="text-body-1 text-gray-600">
              Each week, your drafted houseguests earn or lose points based on what happens in the house.
              Points are tallied after each episode and added to your season total.
              Draft wisely — competitions, strategy, and drama all count.
            </p>
          </Card>
        </div>

        {/* Point categories */}
        {loading ? (
          <p className="text-caption text-gray-400 text-center mt-4">Loading…</p>
        ) : (
          CATEGORY_ORDER.filter(cat => eventsByCategory[cat]).map(cat => (
            <div key={cat}>
              <p className="text-headline font-semibold text-gray-900 mb-1">
                {CATEGORY_LABELS[cat]}
              </p>
              <p className="text-caption text-gray-400 mb-3">
                {CATEGORY_DESCRIPTIONS[cat]}
              </p>
              <Card noPadding className="px-4">
                {eventsByCategory[cat].map((event, i) => (
                  <ScoreRow
                    key={event.label}
                    label={event.label}
                    description={event.description}
                    points={event.points}
                    isLast={i === eventsByCategory[cat].length - 1}
                  />
                ))}
              </Card>
            </div>
          ))
        )}

      </div>
    </div>
  )
}
