import { useState, useEffect, useMemo } from "react"
import { PageHeader, PowerRankingList } from "@/components"
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
