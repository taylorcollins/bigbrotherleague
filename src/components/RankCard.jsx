import { useNavigate } from "react-router-dom"
import Card from "./Card"

export default function RankCard({ rank, upDown }) {
  const navigate = useNavigate()
  return (
    <Card>
      <p className="text-headline font-semibold text-gray-900">#{rank} in the league</p>
      <p className="text-body-1 text-gray-400 mt-1">{upDown}</p>
      <button
        onClick={() => navigate("/leaderboard")}
        className="mt-4 rounded-card bg-brand-primary px-5 py-2 text-label font-semibold text-white"
      >
        Leaderboard
      </button>
    </Card>
  )
}
