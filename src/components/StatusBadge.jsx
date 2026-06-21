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

const STATUS_LABELS = {
  hoh:      "HOH",
  pov:      "POV Holder",
  nominee:  "Nominee",
  active:   "Safe",
  jury:     "Jury",
  evicted:  "Evicted",
  winner:   "Winner",
  have_not: "Have-Not",
}

function parseStatuses(status) {
  if (!status) return []
  // Could be a comma-separated string of slugs ("hoh,have_not") or a display label ("HOH")
  return status.split(",").map(s => STATUS_LABELS[s.trim()] ?? s.trim())
}

function Badge({ label }) {
  const bg = STATUS_BG[label] ?? "bg-gray-200"
  return (
    <span className={`inline-flex items-center rounded-pill px-3 py-0.5 text-caption font-semibold text-gray-900 ${bg}`}>
      {label}
    </span>
  )
}

export default function StatusBadge({ status }) {
  const labels = parseStatuses(status)
  return (
    <div className="flex flex-wrap gap-1 justify-end">
      {labels.map(label => <Badge key={label} label={label} />)}
    </div>
  )
}
