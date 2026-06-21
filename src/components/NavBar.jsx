import { useNavigate, useLocation } from "react-router-dom"
import { Home, Award, BarChart2, BookOpen } from "lucide-react"

const TABS = [
  { label: "Game",        path: "/preseason",   Icon: Home },
  { label: "Leaderboard", path: "/leaderboard", Icon: Award },
  { label: "Stats",       path: "/stats",       Icon: BarChart2 },
  { label: "Scoring",     path: "/scoring",     Icon: BookOpen },
]

export default function NavBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex bg-white border-t border-gray-100">
      {TABS.map(({ label, path, Icon }) => {
        const active = pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-caption transition-colors ${
              active ? "text-brand-primary" : "text-gray-400"
            }`}
          >
            <Icon size={24} strokeWidth={active ? 2.5 : 1.75} />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
