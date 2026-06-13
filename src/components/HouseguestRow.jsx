import Avatar from "./Avatar"
import StatusBadge from "./StatusBadge"

export default function HouseguestRow({ name, points, status, avatarUrl, initials }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
      <Avatar src={avatarUrl} initials={initials} size="sm" />
      <span className="text-label flex-1 text-gray-900">{name}</span>
      <StatusBadge status={status} />
      <span className="text-label font-semibold text-gray-900 w-10 text-right">{points}</span>
    </div>
  )
}
