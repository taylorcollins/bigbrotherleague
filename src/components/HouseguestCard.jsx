import Avatar from "./Avatar"
import Card from "./Card"
import StatusBadge from "./StatusBadge"

function ScoreDelta({ score }) {
  if (score == null) return null
  const positive = score >= 0
  return (
    <span className={`text-label font-semibold ${positive ? "text-brand-primary" : "text-status-nominee"}`}>
      {positive ? `+${score}` : `−${Math.abs(score)}`}
    </span>
  )
}

function PointPills({ positivePoints, negativePoints }) {
  const hasPositive = positivePoints > 0
  const hasNegative = negativePoints < 0
  if (!hasPositive && !hasNegative) return null
  return (
    <div className="flex gap-1 mt-0.5">
      {hasPositive && (
        <span className="rounded-pill bg-brand-primary/10 text-brand-primary px-2 py-0.5 text-caption font-semibold">
          +{positivePoints}
        </span>
      )}
      {hasNegative && (
        <span className="rounded-pill bg-status-nominee-light text-status-nominee px-2 py-0.5 text-caption font-semibold">
          {negativePoints}
        </span>
      )}
    </div>
  )
}

export default function HouseguestCard({ name, status, seasonPoints, positivePoints, negativePoints, imageSrc, initials, weekScore, weekPoints, onProfilePress, avatarSize = "md" }) {
  return (
    <Card noPadding className="p-3">
      <div className="flex items-center gap-3">
        <Avatar src={imageSrc} initials={initials} size={avatarSize} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-label text-gray-900">{name}</span>
            <StatusBadge status={status} />
          </div>
          <span className="text-caption text-gray-400">{seasonPoints} season points</span>
          {weekPoints != null && (
            <p className="text-body-1 text-gray-600">
              Points this week: {weekPoints > 0 ? `+${weekPoints}` : weekPoints}
            </p>
          )}
          <PointPills positivePoints={positivePoints} negativePoints={negativePoints} />
        </div>
        {weekScore != null && (
          <div className="flex shrink-0 items-center">
            <ScoreDelta score={weekScore} />
          </div>
        )}
      </div>
      {onProfilePress && (
        <div className="flex justify-end mt-3">
          <button
            onClick={onProfilePress}
            className="rounded-card bg-gray-900 px-4 py-2 text-label font-semibold text-white"
          >
            Profile &amp; Scores
          </button>
        </div>
      )}
    </Card>
  )
}
