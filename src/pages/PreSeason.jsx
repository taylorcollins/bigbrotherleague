import { useState, useEffect } from "react"
import { PageHeader, Card } from "@/components"
import { supabase } from "@/lib/supabase"

const PREMIERE = new Date("2025-07-09T20:00:00-04:00")

function useCountdown(target) {
  const [timeLeft, setTimeLeft] = useState(() => target - Date.now())

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(target - Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])

  if (timeLeft <= 0) return null

  const totalSeconds = Math.floor(timeLeft / 1000)
  const days    = Math.floor(totalSeconds / 86400)
  const hours   = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds }
}

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl font-bold text-brand-primary tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-caption text-gray-400 uppercase tracking-wide">{label}</span>
    </div>
  )
}

export default function PreSeason() {
  const [picksOpenAt, setPicksOpenAt] = useState(null)
  const countdown = useCountdown(PREMIERE.getTime())

  useEffect(() => {
    supabase
      .from("draft_windows")
      .select("opens_at")
      .gt("opens_at", new Date().toISOString())
      .order("opens_at")
      .limit(1)
      .single()
      .then(({ data }) => { if (data?.opens_at) setPicksOpenAt(data.opens_at) })
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="BB League" />

      <div className="px-4 flex flex-col gap-4">
        <Card>
          <p className="text-label font-semibold text-gray-900 mb-1">Big Brother is back</p>
          <p className="text-body-1 text-gray-600 mb-3">
            The new cast hasn't been announced yet. Once the houseguests are revealed, picks will open and you'll be able to draft your team.
          </p>
          {picksOpenAt && (
            <p className="text-caption text-gray-400">
              Picks open{" "}
              <span className="font-semibold text-brand-primary">
                {new Date(picksOpenAt).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                })}
              </span>
            </p>
          )}
        </Card>

        <Card>
          <p className="text-label font-semibold text-gray-900 mb-4">
            BB28 premieres July 9 at 8/7c
          </p>
          {countdown ? (
            <div className="flex justify-around">
              <CountdownUnit value={countdown.days}    label="days" />
              <CountdownUnit value={countdown.hours}   label="hrs" />
              <CountdownUnit value={countdown.minutes} label="min" />
              <CountdownUnit value={countdown.seconds} label="sec" />
            </div>
          ) : (
            <p className="text-body-1 text-brand-primary font-semibold">It's happening! 🎉</p>
          )}
        </Card>
      </div>
    </div>
  )
}
