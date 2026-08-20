import { useState, useEffect, useMemo } from "react"
import { PageHeader, PowerRankingList, Card } from "@/components"
import { supabase } from "@/lib/supabase"
import { usePowerRankings } from "@/hooks/usePowerRankings"

export default function PowerRankings() {
  const [houseguests, setHouseguests] = useState([])
  const { nextWeek, restOfSeason, loading, notEnoughData, error } = usePowerRankings()

  useEffect(() => {
    supabase
      .from("houseguests")
      .select("id, nickname, photo_url, status")
      .eq("in_draft_pool", true)
      .then(({ data }) => setHouseguests(data ?? []))
  }, [])

  const houseguestsById = useMemo(() => {
    const map = {}
    houseguests.forEach(hg => { map[hg.id] = hg })
    return map
  }, [houseguests])

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="Power rankings" backTo="/stats" />

      <div className="px-4 pt-4">
        <p className="text-headline font-semibold text-gray-900 mb-3">How it works</p>
        <Card>
          <p className="text-body-1 text-gray-600">
            Claude ranks the active houseguests by predicted fantasy points, split into two views: Next week (who's
            set up to score well in the week ahead) and Rest of season (who's likely to keep producing through
            finale). Predictions are built from real season stats — scoring trends, competition wins, social game
            activity, how often someone's already been targeted, and which competitions someone's actually eligible
            to play — not just raw point totals.
          </p>
          <p className="text-caption text-gray-400 mt-3">
            Big Brother is unpredictable. Competitions are heavily luck-driven, alliances shift, and eviction
            targets change week to week — treat these as informed guesses, not guarantees.
          </p>
        </Card>
      </div>

      {loading ? (
        <p className="text-caption text-gray-400 text-center mt-8">Loading…</p>
      ) : notEnoughData ? (
        <p className="text-caption text-gray-400 text-center px-8 mt-8">
          Power rankings will be available once Week 1 results are in.
        </p>
      ) : error ? (
        <p className="text-caption text-gray-400 text-center px-8 mt-8">
          Couldn't load power rankings. Try again shortly.
        </p>
      ) : (
        <div className="pt-4">
          <PowerRankingList nextWeek={nextWeek} restOfSeason={restOfSeason} houseguestsById={houseguestsById} />
        </div>
      )}
    </div>
  )
}
