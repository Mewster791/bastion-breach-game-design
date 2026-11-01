import {
  BriefcaseMedical,
  Castle,
  Crosshair,
  Flag,
  Heart,
  Shield,
  Skull,
  Sword,
  Target,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { HudSnapshot } from '@/lib/game/engine'
import { cn } from '@/lib/utils'

const panel = 'rounded-xl border border-white/10 bg-[#0d1422]/85 shadow-lg'

export function Hud({
  s,
  muted,
  onToggleMute,
}: {
  s: HudSnapshot
  muted: boolean
  onToggleMute: () => void
}) {
  return (
    <div className="pointer-events-none absolute inset-0 select-none text-white" aria-live="polite">
      {s.damageAt > 0 && (
        <div
          key={`dmg-${s.damageAt}`}
          className="hud-fade absolute inset-0 shadow-[inset_0_0_120px_40px_rgba(200,20,20,0.6)]"
        />
      )}
      {s.hp > 0 && s.hp < 30 && (
        <div className="absolute inset-0 shadow-[inset_0_0_160px_30px_rgba(160,10,10,0.45)]" />
      )}

      <ObjectiveBar s={s} />
      <ForcesPanel s={s} />
      <SoundToggleButton muted={muted} onToggleMute={onToggleMute} />
      <Reticle s={s} />
      <Toasts s={s} />
      <HealthPanel s={s} />
      <WeaponBar s={s} />

      {s.insideRedFort && (
        <div className="absolute left-1/2 top-28 -translate-x-1/2 rounded-lg border border-emerald-400/30 bg-emerald-950/85 px-4 py-1.5 text-xs font-medium text-emerald-200">
          {"Inside the red walls — crossbows can't target you"}
        </div>
      )}
      {s.inResupply && (
        <div className="absolute left-1/2 top-28 -translate-x-1/2 rounded-lg border border-sky-400/30 bg-sky-950/85 px-4 py-1.5 text-xs font-medium text-sky-200">
          Resupply ring — restocking ammo, med kits and health
        </div>
      )}

      <p className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 text-[11px] text-white/60 lg:block whitespace-nowrap">
        WASD move · Shift run · Space jump · 1–3 weapons · 4/H med kit · M mute · Left click attack · Right click / F shield
      </p>
    </div>
  )
}

function SoundToggleButton({ muted, onToggleMute }: { muted: boolean; onToggleMute: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggleMute()
      }}
      onMouseDown={(e) => e.stopPropagation()}
      aria-pressed={muted}
      aria-label={muted ? 'Unmute background music' : 'Mute background music'}
      title={muted ? 'Unmute music (M)' : 'Mute music (M)'}
      className={cn(
        panel,
        'pointer-events-auto absolute right-4 top-4 flex h-10 items-center gap-2 px-3.5 text-xs font-semibold transition-colors whitespace-nowrap',
        muted ? 'text-white/65 hover:bg-white/10 hover:text-white' : 'text-amber-200 hover:bg-white/10 hover:text-amber-100',
      )}
    >
      {muted ? <VolumeX className="size-4 text-red-300" aria-hidden="true" /> : <Volume2 className="size-4 text-amber-300" aria-hidden="true" />}
      <span>{muted ? 'Sound Off' : 'Sound On'}</span>
      <span className="hidden font-mono text-[10px] text-white/45 sm:inline">(M)</span>
    </button>
  )
}

function ObjectiveBar({ s }: { s: HudSnapshot }) {
  const stagePct = Math.round((s.cityCaptured ? s.capture : s.cityCapture) * 100)
  const activeStatus = s.cityCaptured ? s.captureStatus : s.cityCaptureStatus

  const status = !s.cityCaptured
    ? activeStatus === 'capturing'
      ? `Stage 1/2 · Capturing ${s.cityName} — ${stagePct}%`
      : activeStatus === 'contested'
        ? `Stage 1/2 · Contested — clear red garrison from ${s.cityName}`
        : stagePct > 0
          ? `Stage 1/2 · ${s.cityName} ${stagePct}% — return to the town square`
          : `Stage 1/2 · Secure ${s.cityName} in the center`
    : activeStatus === 'capturing'
      ? `Stage 2/2 · Raising blue banner in Red Fort — ${stagePct}%`
      : activeStatus === 'contested'
        ? 'Stage 2/2 · Contested — clear red defenders from the courtyard'
        : stagePct > 0
          ? `Stage 2/2 · Red Fort ${stagePct}% — return to the gold circle`
          : 'Stage 2/2 · City secured — storm the Red Fort courtyard'

  return (
    <div className={cn(panel, 'absolute left-1/2 top-4 w-[min(92vw,490px)] -translate-x-1/2 px-4 py-3')}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-sky-300">
          <Flag className="size-3.5" aria-hidden="true" /> Blue
        </span>
        <span className="truncate text-xs font-medium text-amber-200">
          <span className="font-display text-sm font-semibold tracking-wide">{s.mapName}</span>
          <span className="mx-1.5 text-white/40" aria-hidden="true">
            ·
          </span>
          <span className="text-white/80">{s.cityName}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-red-300">
          Red <Flag className="size-3.5" aria-hidden="true" />
        </span>
      </div>
      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-red-700/80"
        role="progressbar"
        aria-label="Siege objective progress"
        aria-valuenow={stagePct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-[width] duration-150',
            s.cityCaptured ? 'from-sky-500 to-blue-400' : 'from-amber-400 to-sky-400',
          )}
          style={{ width: `${stagePct}%` }}
        />
      </div>
      <p
        className={cn(
          'mt-2 text-center text-xs',
          activeStatus === 'contested' ? 'text-red-300' : activeStatus === 'capturing' ? 'text-sky-200' : 'text-white/75',
        )}
      >
        {status}
      </p>
    </div>
  )
}

function ForcesPanel({ s }: { s: HudSnapshot }) {
  return (
    <div className={cn(panel, 'absolute left-4 top-4 hidden w-56 space-y-2 px-4 py-3 text-xs sm:block')}>
      <Row icon={<Users className="size-3.5 text-sky-300" aria-hidden="true" />} label="Blue allies" value={`${s.blueAlive}`} />
      <Row icon={<Skull className="size-3.5 text-red-300" aria-hidden="true" />} label="Red garrison" value={`${s.redAlive}`} />
      <Row
        icon={<Castle className="size-3.5 text-amber-200" aria-hidden="true" />}
        label="Fort crossbows"
        value={`${s.crossbowsAlive}/${s.crossbowsTotal}`}
      />
      <div className="border-t border-white/10 pt-2">
        <Row icon={<Target className="size-3.5 text-white/70" aria-hidden="true" />} label="Your kills" value={`${s.kills}`} />
        <p className="mt-1.5 text-[11px] text-white/55">
          {s.cityCaptured ? 'City muster' : 'Reinforcements'} in {s.nextReinforcement}s
        </p>
      </div>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-white/80">
        {icon}
        {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function Reticle({ s }: { s: HudSnapshot }) {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      {s.weapon === 'sword' ? (
        <div className="size-1.5 rounded-full bg-white/90 shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
      ) : s.weapon === 'gun' ? (
        <div className="relative size-6">
          <span className="absolute left-1/2 top-0 h-2 w-0.5 -translate-x-1/2 bg-white shadow" />
          <span className="absolute bottom-0 left-1/2 h-2 w-0.5 -translate-x-1/2 bg-white shadow" />
          <span className="absolute left-0 top-1/2 h-0.5 w-2 -translate-y-1/2 bg-white shadow" />
          <span className="absolute right-0 top-1/2 h-0.5 w-2 -translate-y-1/2 bg-white shadow" />
        </div>
      ) : (
        <div className="relative size-7 rounded-full border-2 border-white/85 shadow">
          <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      )}
      {s.hitAt > 0 && (
        <div key={`hit-${s.hitAt}`} className="hud-pop absolute left-1/2 top-1/2 size-8">
          <span className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-amber-300" />
          <span className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-amber-300" />
        </div>
      )}
      {s.killAt > 0 && (
        <span
          key={`kill-${s.killAt}`}
          className="hud-fade absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-red-300"
        >
          Defender down
        </span>
      )}
    </div>
  )
}

function Toasts({ s }: { s: HudSnapshot }) {
  return (
    <ul className="absolute left-1/2 top-[62%] flex -translate-x-1/2 flex-col items-center gap-1.5">
      {s.toasts.map((t) => (
        <li
          key={t.id}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium shadow',
            t.tone === 'good' && 'bg-sky-950/90 text-sky-100',
            t.tone === 'bad' && 'bg-red-950/90 text-red-100',
            t.tone === 'info' && 'bg-black/75 text-white',
          )}
        >
          {t.text}
        </li>
      ))}
    </ul>
  )
}

function HealthPanel({ s }: { s: HudSnapshot }) {
  const pct = (s.hp / s.maxHp) * 100
  const color = pct > 55 ? 'from-emerald-500 to-emerald-400' : pct > 25 ? 'from-amber-500 to-amber-400' : 'from-red-600 to-red-500'
  return (
    <div className={cn(panel, 'absolute bottom-4 left-4 w-[min(80vw,300px)] px-4 py-3')}>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold">
          <Heart className="size-3.5 text-red-400" aria-hidden="true" /> Health
        </span>
        <span className="tabular-nums">
          {s.hp} / {s.maxHp}
        </span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label="Health"
        aria-valuenow={s.hp}
        aria-valuemin={0}
        aria-valuemax={s.maxHp}
      >
        <div className={cn('h-full rounded-full bg-gradient-to-r transition-[width] duration-150', color)} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-white/80">
        <span className="flex items-center gap-1.5">
          <BriefcaseMedical className="size-3.5 text-emerald-300" aria-hidden="true" />
          Med kits: <span className="font-semibold text-white tabular-nums">{s.medkits}</span>
        </span>
        {s.healing !== null ? (
          <span className="text-emerald-300">Healing…</span>
        ) : s.blocking ? (
          <span className="text-sky-300">Shield up</span>
        ) : s.running ? (
          <span className="text-amber-200">Running</span>
        ) : null}
      </div>
    </div>
  )
}

function WeaponBar({ s }: { s: HudSnapshot }) {
  const slots = [
    { key: '1', id: 'sword', label: 'Sword & shield', icon: <Sword className="size-4" aria-hidden="true" />, detail: s.blocking ? 'Blocking' : 'Melee' },
    { key: '2', id: 'gun', label: 'Gun', icon: <Crosshair className="size-4" aria-hidden="true" />, detail: `${s.bullets} rounds` },
    { key: '3', id: 'bow', label: 'Bow', icon: <Target className="size-4" aria-hidden="true" />, detail: `${s.arrows} arrows` },
    { key: '4', id: 'medkit', label: 'Med kit', icon: <BriefcaseMedical className="size-4" aria-hidden="true" />, detail: `${s.medkits} left` },
  ] as const
  return (
    <div className="absolute bottom-4 right-4 flex gap-2">
      {slots.map((slot) => {
        const active = slot.id === s.weapon
        const empty =
          (slot.id === 'gun' && s.bullets === 0) || (slot.id === 'bow' && s.arrows === 0) || (slot.id === 'medkit' && s.medkits === 0)
        return (
          <div
            key={slot.id}
            className={cn(
              panel,
              'relative w-[84px] px-2.5 py-2 transition-colors',
              active && 'border-amber-300/70 bg-amber-950/60',
              empty && 'opacity-50',
            )}
          >
            <span className="absolute right-1.5 top-1 text-[10px] font-bold text-white/50">{slot.key}</span>
            <div className={cn('mb-1', active ? 'text-amber-200' : 'text-white/80')}>
              {slot.id === 'sword' && s.blocking ? <Shield className="size-4" aria-hidden="true" /> : slot.icon}
            </div>
            <p className="text-[11px] font-semibold leading-tight">{slot.label}</p>
            <p className="text-[10px] tabular-nums text-white/65">{slot.detail}</p>
          </div>
        )
      })}
    </div>
  )
}
