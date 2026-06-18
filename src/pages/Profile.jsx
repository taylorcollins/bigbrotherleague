import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { PageHeader, Card, StatPair } from "@/components"
import { supabase } from "@/lib/supabase"
import { useCurrentPlayer } from "@/hooks/useCurrentPlayer"

function PlaceholderBlock({ label }) {
  return (
    <div className="rounded-card border border-dashed border-gray-300 bg-white px-4 py-5">
      <p className="text-label text-gray-400">{label}</p>
    </div>
  )
}


export default function Profile() {
  const navigate = useNavigate()
  const { playerId } = useCurrentPlayer()
  const [displayName, setDisplayName]   = useState(null)
  const [seasonRank, setSeasonRank]     = useState(null)
  const [seasonPoints, setSeasonPoints] = useState(null)
  const [bestWeekly, setBestWeekly]     = useState(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    if (!playerId) return
    async function fetchData() {
      const [playerRes, scoresRes] = await Promise.all([
        supabase
          .from("players")
          .select("display_name")
          .eq("id", playerId)
          .single(),

        supabase
          .from("scores")
          .select("season_points, season_rank, weekly_points, draft_windows(week_number)")
          .eq("player_id", playerId),
      ])

      if (playerRes.error) console.error("player:", playerRes.error.message)
      if (scoresRes.error) console.error("scores:", scoresRes.error.message)

      setDisplayName(playerRes.data?.display_name ?? null)

      let latest = null
      let maxWeekly = null
      scoresRes.data?.forEach(s => {
        const wn = s.draft_windows?.week_number ?? 0
        if (!latest || wn > latest.weekNumber) {
          latest = { seasonPoints: s.season_points, seasonRank: s.season_rank, weekNumber: wn }
        }
        if (s.weekly_points != null && (maxWeekly === null || s.weekly_points > maxWeekly)) {
          maxWeekly = s.weekly_points
        }
      })
      if (latest) {
        setSeasonRank(latest.seasonRank)
        setSeasonPoints(latest.seasonPoints)
      }
      setBestWeekly(maxWeekly)

      setLoading(false)
    }

    fetchData()
  }, [playerId])

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="Profile" />

      <div className="flex flex-col gap-6 px-4">

        {/* Account */}
        <div>
          <p className="text-headline font-semibold text-gray-900 mb-3">Account</p>
          <div className="flex flex-col gap-3">
            <Card>
              <p className="text-caption text-gray-400 mb-0.5">Display name</p>
              {loading ? (
                <p className="text-label text-gray-300">—</p>
              ) : (
                <p className="text-label font-semibold text-gray-900">{displayName ?? "—"}</p>
              )}
            </Card>
            <PlaceholderBlock label="Username — coming with auth" />
            <PlaceholderBlock label="Email — coming with auth" />
          </div>
        </div>

        {/* Season stats */}
        <div>
          <p className="text-headline font-semibold text-gray-900 mb-3">Season stats</p>
          <Card>
            {loading ? (
              <p className="text-caption text-gray-400">Loading…</p>
            ) : (
              <div className="flex gap-8">
                <StatPair
                  label="Overall rank"
                  value={seasonRank != null ? `#${seasonRank}` : "—"}
                />
                <StatPair
                  label="Total points"
                  value={seasonPoints ?? "—"}
                  valueColor="text-brand-primary"
                />
                <StatPair
                  label="Best week"
                  value={bestWeekly != null ? `+${bestWeekly}` : "—"}
                />
              </div>
            )}
          </Card>
        </div>

        {/* Settings */}
        <div>
          <p className="text-headline font-semibold text-gray-900 mb-3">Settings</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/commissioner")}
              className="rounded-card bg-white border border-gray-100 px-4 py-5 text-left"
            >
              <p className="text-label font-semibold text-gray-900">Commissioner panel</p>
              <p className="text-caption text-gray-400 mt-0.5">Score episodes, manage draft windows</p>
            </button>
            <PlaceholderBlock label="Notifications — coming soon" />
            <PlaceholderBlock label="Sign out — coming with auth" />
          </div>
        </div>

      </div>
    </div>
  )
}
