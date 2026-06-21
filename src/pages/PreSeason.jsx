import { useState, useEffect } from "react"
import { PageHeader, Card } from "@/components"
import { supabase } from "@/lib/supabase"

export default function PreSeason() {
  const [picksOpenAt, setPicksOpenAt] = useState(null)

  useEffect(() => {
    supabase
      .from("draft_windows")
      .select("opens_at")
      .gt("opens_at", new Date().toISOString())
      .order("opens_at")
      .limit(1)
      .single()
      .then(({ data }) => { if (data?.opens_at) setPicksOpenAt(data.opens_at) })
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="BB League" />

      <div className="px-4">
        <Card>
          <p className="text-label font-semibold text-gray-900 mb-1">Big Brother is back</p>
          <p className="text-body-1 text-gray-600 mb-3">
            The new cast hasn't been announced yet. Once the houseguests are revealed, picks will open and you'll be able to draft your team.
          </p>
          {picksOpenAt && (
            <p className="text-caption text-gray-400">
              Picks open{" "}
              <span className="font-semibold text-brand-primary">
                {new Date(picksOpenAt).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                })}
              </span>
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
