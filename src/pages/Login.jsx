import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Mail, KeyRound, Users, Target, Trophy } from "lucide-react"
import { supabase } from "@/lib/supabase"
import bblLogo from "@/assets/bbl-logo.png"

const FEATURES = [
  { label: "Join the Season 28 League", Icon: Users,  tint: "bg-brand-accent/10 text-brand-accent" },
  { label: "Make new picks every week", Icon: Target, tint: "bg-status-pov/10 text-status-pov" },
  { label: "Prove you're a superfan",   Icon: Trophy, tint: "bg-brand-accent/10 text-brand-accent" },
]

export default function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState("email") // "email" | "otp"
  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSend(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    if (error) setError(error.message)
    else setStep("otp")
    setLoading(false)
  }

  async function handleVerify(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-brand-midnight flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm flex flex-col items-center">
        <img src={bblLogo} alt="BB League" className="w-full object-contain" />

        <p className="text-center text-body-1 text-white/80 -mt-6 mb-8">
          A fun way to watch Big Brother together.<br />
          Draft houseguests, earn points for the chaos they cause, and see who actually called it.
        </p>

        {/* Feature row */}
        <div className="grid grid-cols-3 gap-3 w-full mb-8">
          {FEATURES.map(({ label, Icon, tint }) => (
            <div key={label} className="flex flex-col items-center text-center gap-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tint}`}>
                <Icon size={22} />
              </div>
              <p className="text-caption font-semibold text-white leading-snug">{label}</p>
            </div>
          ))}
        </div>

        {/* Auth card */}
        <div className="w-full rounded-2xl bg-white/10 border border-white/10 px-5 py-6">
          <h2 className="font-display text-3xl uppercase tracking-wide text-white mb-1">Welcome Back</h2>

          {step === "email" ? (
            <>
              <p className="text-caption text-white/60 mb-5">Sign in to your account</p>
              <form onSubmit={handleSend} className="flex flex-col gap-4">
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full rounded-xl bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-brand-primary to-brand-orange text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="text-caption text-white/60 mb-5">
                Enter the 6-digit code sent to <strong className="text-white">{email}</strong>.{" "}
                <button onClick={() => { setStep("email"); setError(null) }} className="text-brand-accent underline">
                  Change email
                </button>
              </p>
              <form onSubmit={handleVerify} className="flex flex-col gap-4">
                <div className="relative">
                  <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="123456"
                    className="w-full rounded-xl bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm tracking-widest text-center text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || token.length < 6}
                  className="w-full bg-gradient-to-r from-brand-primary to-brand-orange text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                >
                  {loading ? "Verifying…" : "Verify"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-sm text-white/60 text-center mt-6">
          New to BB League?{" "}
          <button onClick={() => navigate("/signup")} className="text-brand-accent underline">
            Create account
          </button>
        </p>
      </div>
    </div>
  )
}
