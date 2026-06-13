const STATUS_BG = {
  "HOH":        "bg-status-hoh-light",
  "POV Holder": "bg-status-pov-light",
  "Nominee":    "bg-status-nominee-light",
  "Safe":       "bg-status-safe-light",
  "Jury":       "bg-status-jury-light",
  "Evicted":    "bg-status-evicted-light",
  "Winner":     "bg-status-winner-light",
  "Have-Not":   "bg-status-have-not-light",
}

export default function StatusBadge({ status }) {
  const bg = STATUS_BG[status] ?? "bg-gray-200"
  return (
    <span className={`inline-flex items-center rounded-pill px-3 py-0.5 text-caption font-semibold text-gray-900 ${bg}`}>
      {status}
    </span>
  )
}
