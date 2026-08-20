import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"

export function usePowerRankings() {
  const { session } = useAuth()
  const [nextWeek, setNextWeek] = useState([])
  const [restOfSeason, setRestOfSeason] = useState([])
  const [weekNumber, setWeekNumber] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notEnoughData, setNotEnoughData] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!session?.access_token) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setNotEnoughData(false)
      try {
        const res = await fetch("/api/generate-power-rankings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const data = await res.json()
        if (cancelled) return

        if (res.status === 404) {
          setNotEnoughData(true)
        } else if (!res.ok) {
          throw new Error(data.error || "Failed to load power rankings")
        } else {
          setNextWeek(data.nextWeek ?? [])
          setRestOfSeason(data.restOfSeason ?? [])
          setWeekNumber(data.weekNumber ?? null)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [session?.access_token])

  return { nextWeek, restOfSeason, weekNumber, loading, notEnoughData, error }
}
