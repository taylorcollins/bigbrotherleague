import Avatar from "./Avatar"
import StatusBadge from "./StatusBadge"

export default function HouseguestRow({ name, points, status, avatarUrl, initials }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
      <Avatar src={avatarUrl} initials={initials} size="sm" />
      <div className="flex flex-1 min-w-0 items-center gap-2 flex-wrap">
        <span className="text-label text-gray-900">{name}</span>
        <StatusBadge status={status} />
      </div>
      <span className="text-label font-semibold text-gray-900 w-10 text-right shrink-0">{points}</span>
    </div>
  )
}
