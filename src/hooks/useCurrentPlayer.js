import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

export function useCurrentPlayer() {
  const { session } = useAuth()
  const [playerId, setPlayerId] = useState(null)
  const [isCommissioner, setIsCommissioner] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchPlayer = useCallback(async (userId) => {
    const { data } = await supabase
      .from("players")
      .select("id, is_commissioner")
      .eq("user_id", userId)
      .single()

    if (data) {
      setPlayerId(data.id)
      setIsCommissioner(data.is_commissioner ?? false)
      setNeedsOnboarding(false)
    } else {
      setPlayerId(null)
      setIsCommissioner(false)
      setNeedsOnboarding(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const userId = session?.user?.id
    if (session === undefined) return
    if (!userId) {
      setPlayerId(null)
      setIsCommissioner(false)
      setNeedsOnboarding(false)
      setLoading(false)
      return
    }
    fetchPlayer(userId)
  }, [session, fetchPlayer])

  return { playerId, isCommissioner, needsOnboarding, loading, refetch: () => fetchPlayer(session?.user?.id) }
}
