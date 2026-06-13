import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { NavBar } from "./components"
import Game from "./pages/Game"
import Leaderboard from "./pages/Leaderboard"
import Stats from "./pages/Stats"
import Scoring from "./pages/Scoring"
import Profile from "./pages/Profile"
import Preview from "./pages/Preview"
import Draft from "./pages/Draft"

const NO_NAV_ROUTES = ["/draft"]

function AppShell() {
  const { pathname } = useLocation()
  const showNav = !NO_NAV_ROUTES.includes(pathname)

  return (
    <div className="min-h-screen bg-gray-50 text-foreground">
      <main className={showNav ? "pb-16" : ""}>
        <Routes>
          <Route path="/" element={<Game />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/scoring" element={<Scoring />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/draft" element={<Draft />} />
          <Route path="/preview" element={<Preview />} />
        </Routes>
      </main>
      {showNav && <NavBar />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
