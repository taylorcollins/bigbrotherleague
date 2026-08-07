import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import BottomSheet from "./BottomSheet"
import Avatar from "./Avatar"
import AiInsight from "./AiInsight"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"

function ptsColor(pts) {
  if (pts > 0) return "text-brand-primary"
  if (pts < 0) return "text-status-nominee"
  return "text-gray-400"
}

const VIEWS = ["Houseguests", "Episodes"]

function HouseguestRow({ nickname, initials, imageSrc, points, positivePts, negativePts, events, isOpen, onToggle }) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button onClick={onToggle} className="flex items-center w-full gap-3 px-4 py-3">
        <Avatar src={imageSrc} initials={initials} size="sm" />
        <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
          <span className="text-label font-semibold text-gray-900">{nickname}</span>
          {(positivePts > 0 || negativePts < 0) && (
            <div className="flex gap-1">
              {positivePts > 0 && (
                <span className="rounded-pill bg-brand-primary/10 text-brand-primary px-2 py-0.5 text-caption font-semibold">
                  +{positivePts}
                </span>
              )}
              {negativePts < 0 && (
                <span className="rounded-pill bg-status-nominee-light text-status-nominee px-2 py-0.5 text-caption font-semibold">
                  {negativePts}
                </span>
              )}
            </div>
          )}
        </div>
        <span className={`text-label font-semibold ${ptsColor(points)}`}>
          {points > 0 ? `+${points}` : points} pts
        </span>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 px-4 pt-3 pb-2 pl-[52px]">
          {events.length === 0 ? (
            <p className="text-caption text-gray-400 py-1">No points this week</p>
          ) : (
            events.map((e, i) => (
              <div key={i} className="flex justify-between py-1.5">
                <span className="text-body-1 text-gray-600">{e.label}</span>
                <span className={`text-body-1 font-semibold ${e.points >= 0 ? "text-brand-primary" : "text-status-nominee"}`}>
                  {e.points >= 0 ? `+${e.points}` : e.points}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function EpisodeRow({ label, totalPoints, houseguests, isOpen, onToggle }) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button onClick={onToggle} className="flex items-center w-full gap-3 px-4 py-3">
        <span className="text-label font-semibold text-gray-900 flex-1 text-left">{label}</span>
        <span className={`text-label font-semibold ${ptsColor(totalPoints)}`}>
          {totalPoints > 0 ? `+${totalPoints}` : totalPoints} pts
        </span>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 px-4 pt-3 pb-2 flex flex-col gap-3">
          {houseguests.map(hg => (
            <div key={hg.nickname}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-body-1 font-semibold text-gray-900">{hg.nickname}</span>
                <span className={`text-body-1 font-semibold ${ptsColor(hg.points)}`}>
                  {hg.points > 0 ? `+${hg.points}` : hg.points}
                </span>
              </div>
              <div className="flex flex-col gap-1 pl-3">
                {hg.events.length === 0 ? (
                  <span className="text-caption text-gray-400">No events this episode</span>
                ) : (
                  hg.events.map((e, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-caption text-gray-600">{e.label}</span>
                      <span className={`text-caption font-semibold ${e.points >= 0 ? "text-brand-primary" : "text-status-nominee"}`}>
                        {e.points >= 0 ? `+${e.points}` : e.points}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InsightCard({ insight, loading, error }) {
  if (loading) {
    return <p className="px-4 pt-3 pb-4 text-caption text-gray-400 border-b border-gray-100">Generating your recap…</p>
  }
  if (error) {
    return <p className="px-4 pt-3 pb-4 text-caption text-gray-400 border-b border-gray-100">Couldn't load an insight for this week.</p>
  }
  if (!insight) return null

  return <AiInsight text={insight} className="px-4 pt-3 pb-4 border-b border-gray-100" />
}

export default function WeekHistorySheet({ isOpen, onClose, week, playerId }) {
  const { session } = useAuth()
  const [view, setView] = useState("Houseguests")
  const [openHgId, setOpenHgId] = useState(null)
  const [openEpisodeId, setOpenEpisodeId] = useState(null)
  const [insight, setInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightError, setInsightError] = useState(false)

  // Reset accordion/tab state whenever a different week is opened
  useEffect(() => {
    setView("Houseguests")
    setOpenHgId(null)
    setOpenEpisodeId(null)
  }, [week?.weekNumber])

  // Fetch (or generate) the Claude recap for this week, once per open
  useEffect(() => {
    if (!isOpen || !week || !playerId) return
    let cancelled = false

    async function loadInsight() {
      setInsight(null)
      setInsightError(false)
      setInsightLoading(true)

      const { data: cachedRow } = await supabase
        .from("week_insights")
        .select("insight")
        .eq("player_id", playerId)
        .eq("week_number", week.weekNumber)
        .maybeSingle()

      if (cancelled) return

      if (cachedRow?.insight) {
        setInsight(cachedRow.insight)
        setInsightLoading(false)
        return
      }

      try {
        const res = await fetch("/api/generate-week-insight", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ weekNumber: week.weekNumber }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to generate insight")
        if (!cancelled) setInsight(data.insight)
      } catch (err) {
        console.error("week insight:", err.message)
        if (!cancelled) setInsightError(true)
      }
      if (!cancelled) setInsightLoading(false)
    }

    loadInsight()
    return () => { cancelled = true }
  }, [isOpen, week?.weekNumber, playerId, session])

  if (!week) return null

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="px-4 pt-2 pb-3 border-b border-gray-100 shrink-0 flex items-center justify-between">
        <p className="text-subheadline font-semibold text-gray-900">Week {week.weekNumber}</p>
        <span className="text-label font-semibold">
          <span className={ptsColor(week.totalPoints)}>{week.totalPoints > 0 ? `+${week.totalPoints}` : week.totalPoints} pts</span>
          {week.maxPossible != null && (
            <span className="text-gray-400 font-normal"> out of +{week.maxPossible} pts possible</span>
          )}
        </span>
      </div>

      {/* Houseguests / Episodes view toggle */}
      <div className="flex gap-4 px-4 pt-2 border-b border-gray-100 shrink-0">
        {VIEWS.map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`pb-2 text-caption font-semibold transition-colors ${
              view === v ? "text-brand-primary border-b-2 border-brand-primary" : "text-gray-400"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <InsightCard insight={insight} loading={insightLoading} error={insightError} />

        {view === "Houseguests" ? (
          week.houseguests.map(hg => (
            <HouseguestRow
              key={hg.houseguestId}
              {...hg}
              isOpen={openHgId === hg.houseguestId}
              onToggle={() => setOpenHgId(prev => (prev === hg.houseguestId ? null : hg.houseguestId))}
            />
          ))
        ) : week.episodes.length === 0 ? (
          <p className="text-caption text-gray-400 text-center py-6">No episodes recorded for this week yet.</p>
        ) : (
          week.episodes.map(ep => (
            <EpisodeRow
              key={ep.id}
              label={ep.label}
              totalPoints={ep.totalPoints}
              houseguests={ep.houseguests}
              isOpen={openEpisodeId === ep.id}
              onToggle={() => setOpenEpisodeId(prev => (prev === ep.id ? null : ep.id))}
            />
          ))
        )}
        <div className="pb-6" />
      </div>
    </BottomSheet>
  )
}
