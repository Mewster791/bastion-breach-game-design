import { Map as MapIcon, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { HudSnapshot } from '@/lib/game/engine'

const controls: [string, string][] = [
  ['W A S D / Stick', 'Move'],
  ['Mouse / Touch Drag', 'Look and aim'],
  ['Shift / Run Btn', 'Run'],
  ['Space / Jump Btn', 'Jump'],
  ['1 / 2 / 3 or Tap', 'Sword & shield / Gun / Bow'],
  ['4, H or Tap Med', 'Use med kit'],
  ['Esc or Pause Btn', 'Pause round (halts simulation)'],
  ['M or Sound Btn', 'Toggle music mute'],
  ['Left Click / Attack', 'Swing sword or fire'],
  ['Right Click, F / Shield', 'Raise shield (sword) · fire (gun, bow)'],
]

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0d1422]/78 p-4">
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1422]/96 p-6 text-white shadow-2xl sm:p-8">
        {children}
      </div>
    </div>
  )
}

function AudioButton({ muted, onToggleMute }: { muted: boolean; onToggleMute: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggleMute}
      aria-pressed={muted}
      aria-label={muted ? 'Unmute background music' : 'Mute background music'}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap"
    >
      {muted ? (
        <VolumeX className="size-3.5 text-red-300" aria-hidden="true" />
      ) : (
        <Volume2 className="size-3.5 text-amber-300" aria-hidden="true" />
      )}
      <span>{muted ? 'Muted' : 'Music On'}</span>
    </button>
  )
}

export function StartOverlay({
  s,
  muted,
  onToggleMute,
  onOpenCreator,
  onStart,
}: {
  s: HudSnapshot
  muted: boolean
  onToggleMute: () => void
  onOpenCreator: () => void
  onStart: () => void
}) {
  const poolSize = s.hasCustomMap ? 11 : 10
  return (
    <Shell>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-amber-300">
          Blue vs Red <span aria-hidden="true">·</span> {poolSize} Battlefields in Rotation
          {s.hasCustomMap ? ' (Session)' : ''}
        </p>
        <AudioButton muted={muted} onToggleMute={onToggleMute} />
      </div>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-wide text-balance sm:text-5xl">Triterra Siege</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/80 text-pretty">
        Lead the blue army through the contested central city to raise your forward banner in the town square and unlock
        forward resupply. Then march on the red fort, knock out the 8 outward-facing crossbows, and hold the courtyard
        circle until the blue banner flies.
      </p>

      <div className="mt-4 border-y border-white/10 py-3 text-xs">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-semibold text-amber-200">
            {s.mapName} <span aria-hidden="true">·</span> {s.cityName}
            {s.isCustomMap ? ' (Custom)' : ''}
          </span>
          <span className="tabular-nums text-white/55">1/{poolSize} chance per round</span>
        </div>
        <p className="mt-1 text-white/75">{s.mapSubtitle}</p>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {controls.map(([key, action]) => (
          <div key={key} className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-1.5">
            <dt className="font-mono text-xs font-semibold text-amber-200 whitespace-nowrap">{key}</dt>
            <dd className="text-right text-xs text-white/75">{action}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-white/60">
        Swinging while your shield is up deals 25% less damage. Step into a blue ring in your fort or captured town
        square to restock.
      </p>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Button
          onClick={onStart}
          className="h-11 flex-1 bg-amber-400 text-base font-semibold text-[#1a1408] hover:bg-amber-300 whitespace-nowrap"
        >
          Start Battle
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onOpenCreator}
          className="h-11 border-white/20 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10 hover:text-white whitespace-nowrap"
        >
          <MapIcon className="mr-2 size-4 text-amber-300" aria-hidden="true" />
          Enter Map Creator
        </Button>
      </div>
    </Shell>
  )
}

export function PausedOverlay({
  s,
  muted,
  onToggleMute,
  onOpenCreator,
  onResume,
  onRestart,
}: {
  s: HudSnapshot
  muted: boolean
  onToggleMute: () => void
  onOpenCreator: () => void
  onResume: () => void
  onRestart: () => void
}) {
  const poolSize = s.hasCustomMap ? 11 : 10
  return (
    <Shell>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-amber-300">
          {s.mapName} <span aria-hidden="true">·</span> {s.cityName}
        </p>
        <AudioButton muted={muted} onToggleMute={onToggleMute} />
      </div>
      <h2 className="mt-1 font-display text-3xl font-extrabold text-balance">Paused</h2>
      <p className="mt-1.5 text-xs text-emerald-300/90">
        Battlefield loop halted — simulation &amp; incoming damage are frozen while paused.
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-2.5 text-center">
        <Stat label="Phase" value={`${s.phase}/2`} />
        <Stat label="Health" value={`${s.hp}/${s.maxHp}`} />
        <Stat label="Time" value={formatTime(s.elapsed)} />
      </dl>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Button
          onClick={onResume}
          className="h-11 flex-1 bg-amber-400 text-base font-semibold text-[#1a1408] hover:bg-amber-300 whitespace-nowrap"
        >
          Resume
        </Button>
        <Button
          variant="outline"
          onClick={onRestart}
          className="h-11 flex-1 border-white/20 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 hover:text-white whitespace-nowrap"
        >
          New Round (1/{poolSize} Map Roll)
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onOpenCreator}
        className="mt-2.5 h-10 w-full border-white/15 bg-white/[0.03] text-xs font-semibold text-white/90 hover:bg-white/10 hover:text-white whitespace-nowrap"
      >
        <MapIcon className="mr-2 size-4 text-amber-300" aria-hidden="true" />
        Enter Map Creator
      </Button>
    </Shell>
  )
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function EndOverlay({
  s,
  muted,
  onToggleMute,
  onOpenCreator,
  onRestart,
}: {
  s: HudSnapshot
  muted: boolean
  onToggleMute: () => void
  onOpenCreator: () => void
  onRestart: () => void
}) {
  const won = s.state === 'victory'
  const poolSize = s.hasCustomMap ? 11 : 10
  return (
    <Shell>
      <div className="flex items-center justify-between gap-3">
        <p className={won ? 'text-xs font-semibold tracking-wide text-sky-300' : 'text-xs font-semibold tracking-wide text-red-300'}>
          {won ? 'Victory' : 'Defeat'} <span aria-hidden="true">·</span> {s.mapName} ({s.cityName})
        </p>
        <AudioButton muted={muted} onToggleMute={onToggleMute} />
      </div>
      <h2 className="mt-2 font-display text-4xl font-extrabold text-balance">
        {won ? 'The blue banner flies' : 'The assault has failed'}
      </h2>
      <p className="mt-3 text-sm text-white/75">
        {won
          ? `Both ${s.cityName} and the Red Fort are conquered. Your army holds the courtyard.`
          : 'You fell with no med kits left. Regroup and try again.'}
      </p>
      <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
        <Stat label="Time" value={formatTime(s.elapsed)} />
        <Stat label="Your kills" value={`${s.kills}`} />
        <Stat label="Crossbows left" value={`${s.crossbowsAlive}/${s.crossbowsTotal}`} />
      </dl>
      <p className="mt-4 text-center text-xs text-white/60">
        Next round randomly selects 1 of {poolSize} battlefields (1/{poolSize} chance each
        {s.hasCustomMap ? ' · custom map active for this session' : ''}).
      </p>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <Button
          onClick={onRestart}
          className="h-11 flex-1 bg-amber-400 text-base font-semibold text-[#1a1408] hover:bg-amber-300 whitespace-nowrap"
        >
          Next Round (R)
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onOpenCreator}
          className="h-11 border-white/20 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10 hover:text-white whitespace-nowrap"
        >
          <MapIcon className="mr-2 size-4 text-amber-300" aria-hidden="true" />
          Enter Map Creator
        </Button>
      </div>
    </Shell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-3">
      <dt className="text-[11px] tracking-wide text-white/55">{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}
