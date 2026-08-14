import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { LifeBuoy, HandCoins } from "lucide-react"
import { PageHeader, Card, StatPair } from "@/components"
import { supabase } from "@/lib/supabase"
import { useCurrentPlayer } from "@/hooks/useCurrentPlayer"
import { usePlayerStandings } from "@/hooks/usePlayerStandings"
import { useAuth } from "@/context/AuthContext"

const SUPPORT_EMAIL = "bigbroleague@gmail.com"
const INSTAGRAM_URL = "https://instagram.com/bbleague.official"
const VENMO_URL = "https://venmo.com/u/TayColli"

// lucide-react dropped brand glyphs, so the Instagram mark is inlined.
function InstagramIcon({ size = 24, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function Switch({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-pill transition-colors disabled:opacity-50 ${
        checked ? "bg-brand-primary" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}


export default function Profile() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { playerId, isCommissioner } = useCurrentPlayer()
  const { players: standings, loading } = usePlayerStandings()
  const [emailOptIn, setEmailOptIn] = useState(null)
  const [savingEmailOptIn, setSavingEmailOptIn] = useState(false)

  const me = standings.find(p => p.id === playerId) ?? null
  const displayName  = me?.displayName ?? null
  const seasonRank   = me?.rank ?? null
  const seasonPoints = me?.score ?? null
  const bestWeekly   = me?.bestWeekly ?? null

  useEffect(() => {
    if (!playerId) return
    supabase
      .from("players")
      .select("email_opt_in")
      .eq("id", playerId)
      .single()
      .then(({ data, error }) => {
        if (error) console.error("email_opt_in:", error.message)
        else setEmailOptIn(data?.email_opt_in ?? true)
      })
  }, [playerId])

  async function toggleEmailOptIn(next) {
    setEmailOptIn(next)
    setSavingEmailOptIn(true)
    const { error } = await supabase
      .from("players")
      .update({ email_opt_in: next })
      .eq("id", playerId)
    if (error) {
      console.error("email_opt_in update:", error.message)
      setEmailOptIn(!next)
    }
    setSavingEmailOptIn(false)
  }

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
            <Card>
              <p className="text-caption text-gray-400 mb-0.5">Email</p>
              <p className="text-label font-semibold text-gray-900">{session?.user?.email ?? "—"}</p>
            </Card>
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
            {isCommissioner && (
              <button
                onClick={() => navigate("/commissioner")}
                className="rounded-card bg-white border border-gray-100 px-4 py-5 text-left"
              >
                <p className="text-label font-semibold text-gray-900">Commissioner panel</p>
                <p className="text-caption text-gray-400 mt-0.5">Score episodes, manage draft windows</p>
              </button>
            )}
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-label font-semibold text-gray-900">Weekly draft email</p>
                  <p className="text-caption text-gray-400 mt-0.5">Get notified when a new draft window opens</p>
                </div>
                <Switch
                  checked={emailOptIn ?? true}
                  disabled={emailOptIn === null || savingEmailOptIn}
                  onChange={toggleEmailOptIn}
                />
              </div>
            </Card>
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-card bg-white border border-gray-100 px-4 py-5 text-left w-full"
            >
              <p className="text-label font-semibold text-red-600">Sign out</p>
            </button>
          </div>
        </div>

        {/* Support the project */}
        <div>
          <p className="text-headline font-semibold text-gray-900 mb-3">Support the project</p>
          <div className="flex flex-col gap-3">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-card bg-white border border-gray-100 px-4 py-5"
            >
              <InstagramIcon size={22} className="text-brand-primary shrink-0" />
              <p className="text-label font-semibold text-gray-900">Follow on Instagram</p>
            </a>
            <a
              href={VENMO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-card bg-white border border-gray-100 px-4 py-5"
            >
              <HandCoins size={22} className="text-brand-primary shrink-0" />
              <p className="text-label font-semibold text-gray-900">Venmo a tip</p>
            </a>
          </div>
        </div>

        {/* Help */}
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=BB%20League%20bug%20report`}
          className="flex items-start gap-3 rounded-card bg-gradient-to-br from-brand-primary to-brand-secondary px-4 py-5 text-left shadow-sm"
        >
          <LifeBuoy size={22} className="text-brand-bright shrink-0 mt-0.5" />
          <div>
            <p className="text-label font-semibold text-white">Found a bug? Need help?</p>
            <p className="text-caption text-white/80 mt-0.5">
              Email us at <span className="underline">{SUPPORT_EMAIL}</span> and we'll sort it out.
            </p>
            <p className="text-caption text-white/60 mt-2">
              This app is in beta and built solo as a hobby project — thanks for your patience (and kindness) while we squash bugs!
            </p>
          </div>
        </a>

      </div>
    </div>
  )
}
