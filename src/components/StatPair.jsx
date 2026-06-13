export default function StatPair({ label, value, valueColor = "text-gray-900" }) {
  return (
    <div>
      <p className="text-caption text-gray-400">{label}</p>
      <p className={`text-label font-semibold ${valueColor}`}>{value}</p>
    </div>
  )
}
