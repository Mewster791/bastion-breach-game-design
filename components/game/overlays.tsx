import { Button } from '@/components/ui/button'
import type { HudSnapshot } from '@/lib/game/engine'

const controls: [string, string][] = [
  ['W A S D', 'Move'],
  ['Mouse', 'Look and aim'],
  ['Shift', 'Run'],
  ['Space', 'Jump'],
  ['1 / 2 / 3', 'Sword & shield / Gun / Bow'],
  ['4 or H', 'Use med kit'],
  ['Left click', 'Swing sword or fire'],
  ['Right click or F', 'Raise shield (sword) · fire (gun, bow)'],
]

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0d1422]/75 p-4">
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1422]/95 p-6 text-white shadow-2xl sm:p-8">
        {children}
      </div>
    </div>
  )
}

export function StartOverlay({ s, onStart }: { s: HudSnapshot; onStart: () => void }) {
  return (
    <Shell>
      <p className="text-xs font-semibold tracking-wide text-amber-300">
        Blue vs Red <span aria-hidden="true">·</span> 3 Battlefields in Rotation
      </p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-wide text-balance sm:text-5xl">Bastion Breach</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/80 text-pretty">
        Your blue army marches on the red fort. Fight through 22 defenders, knock out the crossbows on the walls, then
        stand in the gold circle in the red courtyard until the blue banner flies. Crossbows only face outward, so once
        you are inside the walls they cannot touch you.
      </p>

      <div className="mt-4 border-y border-white/10 py-3 text-xs">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-semibold text-amber-200">{s.mapName}</span>
          <span className="text-white/55">1/3 chance per round</span>
        </div>
        <p className="mt-1 text-white/75">{s.mapSubtitle}</p>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {controls.map(([key, action]) => (
          <div key={key} className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-1.5">
            <dt className="font-mono text-xs font-semibold text-amber-200">{key}</dt>
            <dd className="text-right text-white/75">{action}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-white/60">
        Swinging while your shield is up deals 25% less damage. Step into the blue ring in your fort to restock.
      </p>
      <Button onClick={onStart} className="mt-6 h-11 w-full bg-amber-400 text-base font-semibold text-[#1a1408] hover:bg-amber-300">
        Start Battle
      </Button>
    </Shell>
  )
}

export function PausedOverlay({
  s,
  onResume,
  onRestart,
}: {
  s: HudSnapshot
  onResume: () => void
  onRestart: () => void
}) {
  return (
    <Shell>
      <p className="text-xs font-medium text-amber-300">
        {s.mapName} <span aria-hidden="true">·</span> {s.mapSubtitle}
      </p>
      <h2 className="mt-1 font-display text-3xl font-extrabold text-balance">Paused</h2>
      <p className="mt-2 text-sm text-white/75">The battle is waiting for you.</p>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Button onClick={onResume} className="h-11 flex-1 bg-amber-400 text-base font-semibold text-[#1a1408] hover:bg-amber-300">
          Resume
        </Button>
        <Button
          variant="outline"
          onClick={onRestart}
          className="h-11 flex-1 border-white/20 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
        >
          New Round (Random Map)
        </Button>
      </div>
    </Shell>
  )
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function EndOverlay({ s, onRestart }: { s: HudSnapshot; onRestart: () => void }) {
  const won = s.state === 'victory'
  return (
    <Shell>
      <p className={won ? 'text-xs font-semibold tracking-wide text-sky-300' : 'text-xs font-semibold tracking-wide text-red-300'}>
        {won ? 'Victory' : 'Defeat'} <span aria-hidden="true">·</span> {s.mapName}
      </p>
      <h2 className="mt-2 font-display text-4xl font-extrabold text-balance">
        {won ? 'The blue banner flies' : 'The assault has failed'}
      </h2>
      <p className="mt-3 text-sm text-white/75">
        {won
          ? 'The red fort is conquered. Your army holds the courtyard.'
          : 'You fell with no med kits left. Regroup and try again.'}
      </p>
      <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
        <Stat label="Time" value={formatTime(s.elapsed)} />
        <Stat label="Your kills" value={`${s.kills}`} />
        <Stat label="Crossbows left" value={`${s.crossbowsAlive}/${s.crossbowsTotal}`} />
      </dl>
      <p className="mt-4 text-center text-xs text-white/60">
        Next round randomly selects Verdant Valley, Frostspire Crossing, or Scorched Basalt (1/3 chance each).
      </p>
      <Button onClick={onRestart} className="mt-4 h-11 w-full bg-amber-400 text-base font-semibold text-[#1a1408] hover:bg-amber-300">
        Next Round (R)
      </Button>
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
