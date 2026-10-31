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
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0d1422]/70 p-4 backdrop-blur-[2px]">
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1422]/90 p-6 text-white shadow-2xl sm:p-8">
        {children}
      </div>
    </div>
  )
}

export function StartOverlay({ onStart }: { onStart: () => void }) {
  return (
    <Shell>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">Blue vs Red</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-wide text-balance sm:text-5xl">Bastion Breach</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/80 text-pretty">
        Your blue army marches on the red fort. Fight through 22 defenders, knock out the crossbows on the walls, then
        stand in the gold circle in the red courtyard until the blue banner flies. Crossbows only face outward, so once
        you are inside the walls they cannot touch you.
      </p>
      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
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
        Begin the assault
      </Button>
    </Shell>
  )
}

export function PausedOverlay({ onResume }: { onResume: () => void }) {
  return (
    <Shell>
      <h2 className="font-display text-3xl font-extrabold">Paused</h2>
      <p className="mt-2 text-sm text-white/75">The battle is waiting for you.</p>
      <Button onClick={onResume} className="mt-6 h-11 w-full bg-amber-400 text-base font-semibold text-[#1a1408] hover:bg-amber-300">
        Resume
      </Button>
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
      <p className={won ? 'text-xs font-semibold uppercase tracking-[0.25em] text-sky-300' : 'text-xs font-semibold uppercase tracking-[0.25em] text-red-300'}>
        {won ? 'Victory' : 'Defeat'}
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
      <Button onClick={onRestart} className="mt-6 h-11 w-full bg-amber-400 text-base font-semibold text-[#1a1408] hover:bg-amber-300">
        Play again (R)
      </Button>
    </Shell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-3">
      <dt className="text-[11px] uppercase tracking-wider text-white/55">{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}
