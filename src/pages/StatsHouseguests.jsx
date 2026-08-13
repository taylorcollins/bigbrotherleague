import { useState } from "react"
import { PageHeader, HouseguestCard, HouseguestProfileSheet } from "@/components"
import { useSeasonEvents } from "@/hooks/useSeasonEvents"
import { episodeSortKey } from "@/lib/season"

function getInitials(name) {
  const parts = name.trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function StatsHouseguests() {
  const {
    houseguests,
    seasonTotals,
    positiveTotals,
    negativeTotals,
    episodeMeta,
    eventsByEpisode,
    eventsByHG,
    loading,
  } = useSeasonEvents()

  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false)
  const [activeHouseguest, setActiveHouseguest] = useState(null)

  function openProfile(hg) {
    const hgEvents = eventsByHG[hg.id] ?? []

    // Group events by episode
    const byEp = {}
    hgEvents.forEach(e => {
      const epId = e.episode_id
      const meta = episodeMeta[epId]
      if (!byEp[epId]) {
        byEp[epId] = {
          id: epId,
          label: meta?.label ?? "Episode",
          sortKey: episodeSortKey(meta?.weekNumber ?? 0, meta?.episodeType),
          totalPoints: 0,
          positivePoints: 0,
          negativePoints: 0,
          events: [],
        }
      }
      byEp[epId].events.push({ name: e.scoring_events.label, points: e.points_awarded })
      byEp[epId].totalPoints += e.points_awarded
      if (e.points_awarded > 0) byEp[epId].positivePoints += e.points_awarded
      if (e.points_awarded < 0) byEp[epId].negativePoints += e.points_awarded
    })

    // Show every episode recorded so far, filling in 0-pt entries
    const allEpisodeIds = Object.keys(eventsByEpisode)
    const hgEpisodes = allEpisodeIds.map(epId => {
      const meta = episodeMeta[epId]
      return byEp[epId] ?? {
        id: epId,
        label: meta?.label ?? "Episode",
        sortKey: episodeSortKey(meta?.weekNumber ?? 0, meta?.episodeType),
        totalPoints: 0,
        positivePoints: 0,
        negativePoints: 0,
        events: [],
      }
    }).sort((a, b) => b.sortKey - a.sortKey)

    setActiveHouseguest({
      name: hg.nickname,
      initials: getInitials(hg.name),
      imageSrc: hg.photo_url ?? null,
      age: hg.age ?? null,
      hometown: hg.hometown ?? null,
      instagramHandle: hg.instagram_handle ?? null,
      episodes: hgEpisodes,
    })
    setIsProfileSheetOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <PageHeader title="Houseguests" backTo="/stats" />

      <div className="px-4 pt-4 flex flex-col gap-3">
        {loading ? (
          <p className="text-caption text-gray-400 text-center mt-8">Loading…</p>
        ) : (
          houseguests.map(hg => (
            <HouseguestCard
              key={hg.id}
              name={hg.nickname}
              status={hg.status}
              seasonPoints={seasonTotals[hg.id] ?? 0}
              positivePoints={positiveTotals[hg.id] ?? 0}
              negativePoints={negativeTotals[hg.id] ?? 0}
              initials={getInitials(hg.name)}
              imageSrc={hg.photo_url}
              onProfilePress={() => openProfile(hg)}
              avatarSize="xl"
            />
          ))
        )}
      </div>

      <HouseguestProfileSheet
        isOpen={isProfileSheetOpen}
        onClose={() => setIsProfileSheetOpen(false)}
        houseguest={activeHouseguest}
      />
    </div>
  )
}
