import { useState } from "react"
import { PageHeader, EpisodeCard, EpisodeBreakdownSheet } from "@/components"
import { useSeasonEvents } from "@/hooks/useSeasonEvents"

function getInitials(name) {
  const parts = name.trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function inferEpisodeColor(eventLabels) {
  if (eventLabels.some(l => l === "Won HOH"))            return "bg-status-hoh-light"
  if (eventLabels.some(l => l === "Won POV"))            return "bg-status-pov-light"
  if (eventLabels.some(l => l.startsWith("Evicted")))   return "bg-status-evicted-light"
  if (eventLabels.some(l => l === "Nominated"))          return "bg-status-nominee-light"
  return "bg-status-safe-light"
}

export default function StatsEpisodes() {
  const {
    houseguests,
    episodes,
    episodeMeta,
    myEpisodePts,
    playerEpisodeScores,
    eventsByEpisode,
    loading,
  } = useSeasonEvents()

  const [isEpisodeSheetOpen, setIsEpisodeSheetOpen] = useState(false)
  const [activeEpisode, setActiveEpisode] = useState(null)

  function openBreakdown(episodeId) {
    const events = eventsByEpisode[episodeId] ?? []

    // Group events by houseguest
    const byHG = {}
    events.forEach(e => {
      const id = e.houseguest_id
      if (!byHG[id]) {
        byHG[id] = {
          name: e.houseguests.nickname,
          initials: getInitials(e.houseguests.name ?? e.houseguests.nickname),
          events: [],
          totalPoints: 0,
        }
      }
      byHG[id].events.push({ label: e.scoring_events.label, points: e.points_awarded })
      byHG[id].totalPoints += e.points_awarded
    })

    // Include every houseguest, even ones with no events this episode, so
    // the breakdown always covers the full cast rather than just scorers.
    const hgList = houseguests.map(hg => {
      const entry = byHG[hg.id]
      const hgEvents = entry?.events ?? []
      return {
        name: hg.nickname,
        initials: getInitials(hg.name ?? hg.nickname),
        color: inferEpisodeColor(hgEvents.map(e => e.label)),
        episodePoints: entry?.totalPoints ?? 0,
        events: hgEvents,
      }
    }).sort((a, b) => b.episodePoints - a.episodePoints)

    const playerScores = playerEpisodeScores[episodeId] ?? []
    const topScore = playerScores[0]?.total ?? 0
    const topScorers = playerScores.filter(p => p.total === topScore).map(p => p.name)

    setActiveEpisode({
      label: episodeMeta[episodeId]?.label ?? "Episode",
      yourScore: myEpisodePts[episodeId] ?? 0,
      topScore,
      topScorers,
      houseguests: hgList,
    })
    setIsEpisodeSheetOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="Episodes" backTo="/stats" />

      <div className="px-4 pt-4 flex flex-col gap-3">
        {loading ? (
          <p className="text-caption text-gray-400 text-center mt-8">Loading…</p>
        ) : episodes.length === 0 ? (
          <p className="text-caption text-gray-400 text-center mt-8">No episodes yet.</p>
        ) : (
          episodes.map(ep => (
            <EpisodeCard
              key={ep.episodeId}
              episodeId={ep.episodeId}
              label={ep.label}
              totalPoints={ep.totalPoints}
              yourPoints={ep.yourPoints}
              onViewBreakdown={openBreakdown}
            />
          ))
        )}
      </div>

      <EpisodeBreakdownSheet
        isOpen={isEpisodeSheetOpen}
        onClose={() => setIsEpisodeSheetOpen(false)}
        episode={activeEpisode}
      />
    </div>
  )
}
