import Avatar from "./Avatar"
import Card from "./Card"

export default function LeaderboardRow({ rank, username, initials, score, avatarUrl }) {
  return (
    <Card noPadding className="flex items-center gap-3 p-3">
      <span className="text-caption text-gray-400 w-5 shrink-0 text-right">#{rank}</span>
      <Avatar src={avatarUrl} initials={initials} size="sm" color="bg-gray-900" />
      <span className="text-label flex-1 text-gray-900">{username}</span>
      <span className="text-label font-semibold text-gray-900">{score}</span>
    </Card>
  )
}
