import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import Avatar from "./Avatar"
import { supabase } from "@/lib/supabase"
import { useCurrentPlayer } from "@/hooks/useCurrentPlayer"

function getInitials(name) {
  const parts = (name ?? "").trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name ?? "??").slice(0, 2).toUpperCase()
}

export default function PageHeader({ title, backTo }) {
  const navigate = useNavigate()
  const { playerId } = useCurrentPlayer()
  const [initials, setInitials] = useState("…")

  useEffect(() => {
    if (!playerId) return
    supabase
      .from("players")
      .select("display_name")
      .eq("id", playerId)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setInitials(getInitials(data.display_name))
      })
  }, [playerId])

  return (
    <div className="flex items-center justify-between px-5 pt-12 pb-4">
      {backTo ? (
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-1 font-bold text-brand-secondary text-[28px]"
        >
          <ChevronLeft size={26} strokeWidth={2.5} />
          {title}
        </button>
      ) : (
        <span className="font-bold text-brand-secondary text-[28px]">
          {title}
        </span>
      )}
      <button onClick={() => navigate("/profile")}>
        <Avatar initials={initials} size="md" color="bg-brand-secondary" />
      </button>
    </div>
  )
}
