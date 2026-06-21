import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"

export default function Onboarding({ onComplete }) {
  const { session } = useAuth()
  const [displayName, setDisplayName] = useState(
    localStorage.getItem("bb_pending_display_name") ?? ""
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.from("players").insert({
      user_id: session.user.id,
      display_name: displayName.trim(),
      league_id: "aaaaaaaa-0000-0000-0000-000000000001",
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      localStorage.removeItem("bb_pending_display_name")
      onComplete()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-brand-secondary mb-1">Welcome to BB League</h1>
        <p className="text-sm text-gray-500 mb-8">Confirm your display name to get started.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !displayName.trim()}
            className="w-full bg-brand-primary text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "Setting up…" : "Let's go"}
          </button>
        </form>

        <p className="text-sm text-gray-400 text-center mt-6">
          Wrong account?{" "}
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-brand-primary underline"
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  )
}
