import Avatar from "./Avatar"
import Card from "./Card"

const MEDAL_STYLES = {
  gold:   "bg-amber-400 text-amber-900",
  silver: "bg-gray-300 text-gray-700",
  bronze: "bg-orange-400 text-orange-900",
}

export default function LeaderboardRow({ rank, username, initials, score, avatarUrl, medal, detail }) {
  return (
    <Card noPadding className="flex items-center gap-3 p-3">
      {medal ? (
        <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${MEDAL_STYLES[medal]}`}>
          {rank}
        </span>
      ) : (
        <span className="text-caption text-gray-400 w-6 shrink-0 text-right">#{rank}</span>
      )}
      <Avatar src={avatarUrl} initials={initials} size="sm" color="bg-gray-900" />
      <div className="flex-1 min-w-0">
        <p className="text-label text-gray-900 truncate">{username}</p>
        {detail && <p className="text-caption text-gray-400">{detail}</p>}
      </div>
      <span className="text-label font-semibold text-gray-900">{score}</span>
    </Card>
  )
}
