import { useState } from "react"
import { ChevronDown, MapPin, AtSign } from "lucide-react"
import Avatar from "./Avatar"
import BottomSheet from "./BottomSheet"
import Card from "./Card"

function EpisodeAccordionRow({ episode, isOpen, onToggle }) {
  const pts = episode.totalPoints
  const ptsColor =
    pts > 0 ? "text-brand-primary" :
    pts < 0 ? "text-status-nominee" :
    "text-gray-400"

  return (
    <Card noPadding className="mb-2 overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={onToggle}
        className="flex items-center w-full gap-3 px-4 py-3"
      >
        <span className="text-label font-semibold text-gray-900 flex-1 text-left truncate">
          {episode.label}
        </span>
        <span className={`text-label font-semibold shrink-0 ${ptsColor}`}>
          {pts > 0 ? `+${pts}` : pts} pts
        </span>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="border-t border-gray-100 px-4 pt-3 pb-1">
          {episode.events.length === 0 ? (
            <p className="text-caption text-gray-400 py-1">No points this episode</p>
          ) : (
            episode.events.map((ev, i) => (
              <div key={i} className="flex justify-between py-1.5">
                <span className="text-body-1 text-gray-600">{ev.name}</span>
                <span className={`text-body-1 font-semibold ${ev.points >= 0 ? "text-brand-primary" : "text-status-nominee"}`}>
                  {ev.points >= 0 ? `+${ev.points}` : ev.points}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  )
}

export default function HouseguestProfileSheet({ isOpen, onClose, houseguest }) {
  const [activeEpisode, setActiveEpisode] = useState(null)

  if (!houseguest) return null

  const sorted = [...houseguest.episodes].sort((a, b) => b.sortKey - a.sortKey)

  function toggleEpisode(id) {
    setActiveEpisode(prev => (prev === id ? null : id))
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} showClose>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-8">
        {/* Name */}
        <p className="text-headline font-semibold text-gray-900">{houseguest.name}</p>

        {/* Age / Hometown */}
        {(houseguest.age || houseguest.hometown) && (
          <div className="flex items-center gap-1 text-body-1 text-gray-400 mt-0.5">
            {houseguest.age && <span>{houseguest.age}</span>}
            {houseguest.age && houseguest.hometown && <span>•</span>}
            {houseguest.hometown && (
              <span className="flex items-center gap-1">
                <MapPin size={14} className="shrink-0" />
                {houseguest.hometown}
              </span>
            )}
          </div>
        )}

        {/* Photo */}
        <div className="flex justify-center mt-4">
          {houseguest.imageSrc ? (
            <img
              src={houseguest.imageSrc}
              alt={houseguest.name}
              className="w-32 h-32 rounded-2xl object-cover"
            />
          ) : (
            <Avatar initials={houseguest.initials} size="lg" color="bg-brand-secondary" />
          )}
        </div>

        {/* Instagram */}
        {houseguest.instagramHandle && (
          <a
            href={`https://instagram.com/${houseguest.instagramHandle}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1 text-body-1 text-brand-primary text-center mt-2"
          >
            <AtSign size={16} className="shrink-0" />
            {houseguest.instagramHandle}
          </a>
        )}

        {/* Divider */}
        <div className="border-b border-gray-100 mt-4 mb-2" />

        {/* Episode accordion */}
        {sorted.map(ep => (
          <EpisodeAccordionRow
            key={ep.id}
            episode={ep}
            isOpen={activeEpisode === ep.id}
            onToggle={() => toggleEpisode(ep.id)}
          />
        ))}
      </div>
    </BottomSheet>
  )
}
