import { useMemo } from "react"
import BottomSheet from "./BottomSheet"
import PowerRankingList from "./PowerRankingList"
import { usePowerRankings } from "@/hooks/usePowerRankings"

export default function PowerRankingsSheet({ isOpen, onClose, houseguests }) {
  const { nextWeek, restOfSeason, loading, notEnoughData, error } = usePowerRankings()

  const houseguestsById = useMemo(() => {
    const map = {}
    ;(houseguests ?? []).forEach(hg => { map[hg.id] = hg })
    return map
  }, [houseguests])

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} showClose>
      <div className="flex-1 overflow-y-auto pt-2 pb-8">
        <p className="text-headline font-semibold text-gray-900 px-4">Power rankings</p>

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
          <div className="mt-2">
            <PowerRankingList nextWeek={nextWeek} restOfSeason={restOfSeason} houseguestsById={houseguestsById} />
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
