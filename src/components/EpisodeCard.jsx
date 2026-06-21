import Card from "./Card"
import StatPair from "./StatPair"

export default function EpisodeCard({ episodeNumber, totalPoints, yourPoints, onViewBreakdown }) {
  return (
    <Card>
      <p className="text-label text-gray-900">Episode {episodeNumber}</p>

      <div className="flex gap-6 mt-2">
        <StatPair label="Best possible" value={totalPoints} />
        <StatPair label="Your score" value={yourPoints} valueColor="text-brand-primary" />
      </div>

      <div className="flex justify-end mt-3">
        <button
          onClick={() => onViewBreakdown(episodeNumber)}
          className="rounded-card bg-gray-900 px-4 py-2 text-label font-semibold text-white"
        >
          View breakdown
        </button>
      </div>
    </Card>
  )
}
