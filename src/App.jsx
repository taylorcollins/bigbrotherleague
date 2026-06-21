import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { useCurrentPlayer } from "./hooks/useCurrentPlayer"
import { NavBar } from "./components"
import Game from "./pages/Game"
import Leaderboard from "./pages/Leaderboard"
import Stats from "./pages/Stats"
import Scoring from "./pages/Scoring"
import Profile from "./pages/Profile"
import Preview from "./pages/Preview"
import Draft from "./pages/Draft"
import Commissioner from "./pages/Commissioner"
import PreSeason from "./pages/PreSeason"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Onboarding from "./pages/Onboarding"

const NO_NAV_ROUTES = ["/draft", "/commissioner"]

function AppShell() {
  const { session } = useAuth()
  const { needsOnboarding, loading: playerLoading, refetch } = useCurrentPlayer()
  const { pathname } = useLocation()
  const showNav = !NO_NAV_ROUTES.includes(pathname)

  // Still loading session or player lookup
  if (session === undefined || (session && playerLoading)) return null

  // Not signed in — show login or signup
  if (session === null) {
    return (
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  // Signed in but no player row yet — onboard them
  if (needsOnboarding) {
    return <Onboarding onComplete={refetch} />
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground">
      <main className={showNav ? "pb-16" : ""}>
        <Routes>
          <Route path="/" element={<Game />} />
          <Route path="/preseason" element={<PreSeason />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/scoring" element={<Scoring />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/draft" element={<Draft />} />
          <Route path="/commissioner" element={<Commissioner />} />
          <Route path="/preview" element={<Preview />} />
          <Route path="*" element={<Navigate to="/preseason" replace />} />
        </Routes>
      </main>
      {showNav && <NavBar />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}
