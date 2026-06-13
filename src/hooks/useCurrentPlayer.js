// Temporary stub — returns a hardcoded player ID until Supabase Auth is wired up.
// To connect auth, replace this with:
//
//   import { useEffect, useState } from "react"
//   import { supabase } from "@/lib/supabase"
//
//   export function useCurrentPlayer() {
//     const [playerId, setPlayerId] = useState(null)
//     useEffect(() => {
//       supabase.auth.getSession()
//         .then(({ data }) => setPlayerId(data.session?.user?.id ?? null))
//     }, [])
//     return { playerId }
//   }

export function useCurrentPlayer() {
  return { playerId: "bbbbbbbb-0001-0000-0000-000000000001" }
}
