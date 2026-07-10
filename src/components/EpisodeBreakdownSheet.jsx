import BottomSheet from "./BottomSheet"
import StatPair from "./StatPair"
import Avatar from "./Avatar"

function leaderText(topScorers) {
  if (topScorers.length === 1) return `${topScorers[0]} is leading this week`
  if (topScorers.length === 2) return `${topScorers[0]} & ${topScorers[1]} are tied for the lead`
  return `${topScorers.slice(0, -1).join(", ")} & ${topScorers[topScorers.length - 1]} are tied for the lead`
}

function HouseguestBreakdownRow({ name, initials, color, episodePoints, events }) {
  const ptsColor =
    episodePoints > 0 ? "text-brand-primary" :
    episodePoints < 0 ? "text-status-nominee" :
    "text-gray-400"
  return (
    <div className="border-b border-gray-100 px-4 py-3 last:border-b-0">
      {/* Name row */}
      <div className="flex items-center gap-3 mb-2">
        <Avatar initials={initials} size="sm" color={color} />
        <p className="text-label font-semibold text-gray-900 flex-1">{name}</p>
        <span className={`text-label font-semibold ${ptsColor}`}>
          {episodePoints > 0 ? `+${episodePoints}` : episodePoints} pts
        </span>
      </div>
      {/* Event list */}
      <div className="flex flex-col gap-1 pl-9">
        {events.map((e, i) => (
          <div key={i} className="flex justify-between items-center">
            <span className="text-body-1 text-gray-600">{e.label}</span>
            <span className={`text-body-1 font-semibold ${e.points >= 0 ? "text-brand-primary" : "text-status-nominee"}`}>
              {e.points >= 0 ? `+${e.points}` : e.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EpisodeBreakdownSheet({ isOpen, onClose, episode }) {
  if (!episode) return null

  const sorted = [...episode.houseguests].sort((a, b) => b.episodePoints - a.episodePoints)

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="px-4 pt-2 pb-4 border-b border-gray-100 shrink-0">
        <p className="text-subheadline font-semibold text-gray-900">{episode.label}</p>
        <p className="text-caption text-gray-400 mt-0.5">{leaderText(episode.topScorers)}</p>
        <div className="flex gap-6 mt-3">
          <StatPair label="Your score" value={episode.yourScore} valueColor="text-brand-primary" />
          <StatPair label="Top score" value={episode.topScore} />
        </div>
      </div>

      {/* Scrollable houseguest list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.map(hg => (
          <HouseguestBreakdownRow key={hg.name} {...hg} />
        ))}
        <div className="pb-6" />
      </div>
    </BottomSheet>
  )
}
