import Avatar from "./Avatar"
import StatusBadge from "./StatusBadge"

function getInitials(name) {
  const parts = (name ?? "").trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name ?? "??").slice(0, 2).toUpperCase()
}

export default function PowerRankingRow({ rank, houseguest, predictedPoints, reason }) {
  if (!houseguest) return null

  return (
    <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
      <span className="w-6 shrink-0 text-label font-semibold text-gray-400 text-center">{rank}</span>
      <Avatar src={houseguest.photo_url} initials={getInitials(houseguest.nickname)} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-label text-gray-900">{houseguest.nickname}</span>
          <StatusBadge status={houseguest.status} />
        </div>
        <p className="text-caption text-gray-400 mt-0.5">{reason}</p>
      </div>
      <span className="text-label font-semibold text-brand-primary w-12 text-right shrink-0">
        {predictedPoints >= 0 ? "+" : ""}{predictedPoints}
      </span>
    </div>
  )
}
