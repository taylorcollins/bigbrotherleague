import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"

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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-brand-secondary mb-1">BB League</h1>

        {step === "email" ? (
          <>
            <p className="text-sm text-gray-500 mb-8">Sign in to your account</p>
            <form onSubmit={handleSend} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-primary text-white font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-8">
              Enter the 6-digit code sent to <strong>{email}</strong>.{" "}
              <button onClick={() => { setStep("email"); setError(null) }} className="text-brand-primary underline">
                Change email
              </button>
            </p>
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="123456"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || token.length < 6}
                className="w-full bg-brand-primary text-white font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify"}
              </button>
            </form>
          </>
        )}
        <p className="text-sm text-gray-400 text-center mt-6">
          New to BB League?{" "}
          <button onClick={() => navigate("/signup")} className="text-brand-primary underline">
            Create account
          </button>
        </p>
      </div>
    </div>
  )
}
