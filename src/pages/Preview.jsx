import { useState } from "react"
import {
  Avatar,
  BottomSheet,
  Card,
  DraftBanner,
  EpisodeBreakdownSheet,
  EpisodeCard,
  HouseguestCard,
  HouseguestProfileSheet,
  HouseguestRow,
  LeaderboardRow,
  NavBar,
  PageHeader,
  RankCard,
  StatPair,
  StatusBadge,
} from "@/components"
import { Button } from "@/components/ui/button"

const ALL_STATUSES = ["HOH", "POV Holder", "Nominee", "Safe", "Have-Not", "Jury", "Evicted", "Winner"]

const SAMPLE_HOUSEGUEST = {
  name: "Makensy",
  initials: "MK",
  imageSrc: "https://i.pravatar.cc/150?img=1",
  instagramHandle: "makensymabel",
  episodes: [
    { episodeNumber: 7, totalPoints: 18, events: [{ name: "HOH Win", points: 10 }, { name: "Nominated", points: -5 }, { name: "Survived the Block", points: 3 }] },
    { episodeNumber: 6, totalPoints: 12, events: [{ name: "POV Win", points: 8 }, { name: "POV Used", points: 4 }] },
    { episodeNumber: 5, totalPoints: 0,  events: [] },
    { episodeNumber: 4, totalPoints: -5, events: [{ name: "Nominated", points: -5 }] },
  ],
}

const SAMPLE_EPISODE = {
  episodeNumber: 7, yourScore: 42, topScore: 61, topScorers: ["Jamie"],
  houseguests: [
    { name: "Makensy", initials: "MK", color: "bg-status-hoh-light",     episodePoints: 18,  events: ["HOH Win", "Nominated"] },
    { name: "Chelsie",  initials: "CH", color: "bg-status-safe-light",    episodePoints: 12,  events: ["POV Win"] },
    { name: "Tucker",   initials: "TU", color: "bg-status-nominee-light", episodePoints: -8,  events: ["Nominated", "Backdoor"] },
    { name: "Leah",     initials: "LE", color: "bg-status-safe-light",    episodePoints: 9,   events: ["Safe"] },
    { name: "Rubina",   initials: "RU", color: "bg-status-safe-light",    episodePoints: 6,   events: ["POV Used"] },
    { name: "Joseph",   initials: "JO", color: "bg-status-evicted-light", episodePoints: -15, events: ["Evicted"] },
  ],
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <p className="text-caption text-gray-400 mb-3 uppercase tracking-wide">{title}</p>
      {children}
    </section>
  )
}

function SheetTrigger({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-card bg-gray-900 px-4 py-2 text-label font-semibold text-white"
    >
      {label}
    </button>
  )
}

export default function Preview() {
  const [profileOpen, setProfileOpen] = useState(false)
  const [episodeOpen, setEpisodeOpen] = useState(false)
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)

  return (
    <div className="bg-gray-100 min-h-screen px-4 pt-8 pb-20">
      <p className="text-headline text-gray-900 mb-6">Component Preview</p>

      <Section title="StatusBadge — all variants">
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map(s => <StatusBadge key={s} status={s} />)}
        </div>
      </Section>

      <Section title="Avatar — sizes + colors">
        <div className="flex items-end gap-4">
          <div className="flex flex-col items-center gap-1">
            <Avatar initials="PB" size="sm" color="bg-brand-accent" />
            <span className="text-caption text-gray-400">sm</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Avatar initials="PB" size="md" color="bg-brand-accent" />
            <span className="text-caption text-gray-400">md</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Avatar initials="PB" size="lg" color="bg-brand-accent" />
            <span className="text-caption text-gray-400">lg</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Avatar initials="MW" size="md" color="bg-brand-primary" />
            <span className="text-caption text-gray-400">primary</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Avatar initials="DC" size="md" color="bg-status-jury" />
            <span className="text-caption text-gray-400">jury</span>
          </div>
        </div>
      </Section>

      <Section title="Button — variants">
        <div className="flex flex-wrap gap-3">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <p className="text-label text-gray-900">Card title</p>
          <p className="text-caption text-gray-400 mt-1">White surface with rounded-card and border.</p>
        </Card>
      </Section>

      <Section title="StatPair">
        <div className="flex gap-6">
          <StatPair label="Total points" value={84} />
          <StatPair label="Your score" value={42} valueColor="text-brand-primary" />
          <StatPair label="Rank" value="#6" />
        </div>
      </Section>

      <Section title="PageHeader">
        <div className="rounded-card overflow-hidden max-w-sm">
          <PageHeader title="BB League" />
        </div>
      </Section>

      <Section title="NavBar">
        <div className="relative max-w-sm h-16 rounded-card overflow-hidden border border-gray-200">
          <NavBar />
        </div>
      </Section>

      <Section title="HouseguestCard">
        <div className="flex flex-col gap-3 max-w-sm">
          <HouseguestCard name="Paige Brooks" status="HOH"     seasonPoints={142} positivePoints={30} negativePoints={-5}  initials="PB" weekScore={18}  onProfilePress={() => setProfileOpen(true)} />
          <HouseguestCard name="Marcus Webb"  status="Nominee" seasonPoints={87}  positivePoints={10} negativePoints={-15} initials="MW" weekScore={-5}  onProfilePress={() => setProfileOpen(true)} />
          <HouseguestCard name="Destiny Cruz" status="Safe"    seasonPoints={115} initials="DC" onProfilePress={() => setProfileOpen(true)} />
          <HouseguestCard name="Jordan Ellis" status="Evicted" seasonPoints={44}  initials="JE" />
        </div>
      </Section>

      <Section title="HouseguestRow">
        <div className="bg-white rounded-card overflow-hidden max-w-sm">
          <HouseguestRow name="Paige Brooks" points={142} status="HOH"     initials="PB" />
          <HouseguestRow name="Marcus Webb"  points={87}  status="Nominee" initials="MW" />
        </div>
      </Section>

      <Section title="LeaderboardRow">
        <div className="flex flex-col gap-3 max-w-sm">
          <LeaderboardRow rank={1} username="Janellestan99" initials="JS" score={312} />
          <LeaderboardRow rank={2} username="HoHunter"      initials="HH" score={289} />
          <LeaderboardRow rank={3} username="VetoKing"      initials="VK" score={271} />
        </div>
      </Section>

      <Section title="EpisodeCard">
        <div className="flex flex-col gap-3 max-w-sm">
          <EpisodeCard episodeNumber={7} totalPoints={84} yourPoints={42} onViewBreakdown={() => setEpisodeOpen(true)} />
          <EpisodeCard episodeNumber={6} totalPoints={91} yourPoints={38} onViewBreakdown={() => setEpisodeOpen(true)} />
        </div>
      </Section>

      <Section title="DraftBanner">
        <div className="max-w-sm">
          <DraftBanner />
        </div>
      </Section>

      <Section title="RankCard">
        <div className="max-w-sm">
          <RankCard rank={6} upDown="Up 2 this week" />
        </div>
      </Section>

      <Section title="Bottom sheets">
        <div className="flex gap-3 flex-wrap">
          <SheetTrigger label="HouseguestProfileSheet" onClick={() => setProfileOpen(true)} />
          <SheetTrigger label="EpisodeBreakdownSheet"  onClick={() => setEpisodeOpen(true)} />
          <SheetTrigger label="BottomSheet (base)"     onClick={() => setBottomSheetOpen(true)} />
        </div>
      </Section>

      {/* Sheets — rendered outside flow so they don't disrupt layout */}
      <HouseguestProfileSheet
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        houseguest={SAMPLE_HOUSEGUEST}
      />

      <EpisodeBreakdownSheet
        isOpen={episodeOpen}
        onClose={() => setEpisodeOpen(false)}
        episode={SAMPLE_EPISODE}
      />

      <BottomSheet isOpen={bottomSheetOpen} onClose={() => setBottomSheetOpen(false)} showClose>
        <div className="px-4 pt-2 pb-8">
          <p className="text-label font-semibold text-gray-900">BottomSheet base component</p>
          <p className="text-body-1 text-gray-400 mt-1">
            Shared overlay + slide-up shell used by both sheet components.
          </p>
        </div>
      </BottomSheet>
    </div>
  )
}
