'use client'

import { useRef, useState } from 'react'
import {
  ArrowUp,
  BriefcaseMedical,
  Castle,
  Clock,
  Crosshair,
  Flag,
  Gamepad2,
  Heart,
  Pause,
  Shield,
  Skull,
  Sword,
  Target,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import type { HudSnapshot } from '@/lib/game/engine'
import type { Weapon } from '@/lib/game/models'
import { cn } from '@/lib/utils'

const panel = 'rounded-xl border border-white/10 bg-[#0d1422]/88 shadow-lg'

export interface HudActions {
  onPause: () => void
  onSelectWeapon: (weapon: Weapon) => void
  onUseMedkit: () => void
  onMoveVector: (right: number, forward: number) => void
  onPrimaryAction: (active: boolean) => void
  onSecondaryAction: (active: boolean) => void
  onJump: () => void
  onSprintAction: (active: boolean) => void
  onEnableTouch: () => void
}

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function Hud({
  s,
  muted,
  onToggleMute,
  actions,
}: {
  s: HudSnapshot
  muted: boolean
  onToggleMute: () => void
  actions: HudActions
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
      <TopRightControls s={s} muted={muted} onToggleMute={onToggleMute} actions={actions} />
      <Reticle s={s} />
      <Toasts s={s} />
      <HealthPanel s={s} />
      <WeaponBar s={s} actions={actions} />

      {s.touchMode && <TouchControls s={s} actions={actions} />}

      {s.insideRedFort && (
        <div className="absolute left-1/2 top-32 -translate-x-1/2 rounded-lg border border-emerald-400/30 bg-emerald-950/88 px-4 py-1.5 text-xs font-medium text-emerald-200 whitespace-nowrap">
          {"Inside the red walls — crossbows can't target you"}
        </div>
      )}
      {s.inResupply && (
        <div className="absolute left-1/2 top-32 -translate-x-1/2 rounded-lg border border-sky-400/30 bg-sky-950/88 px-4 py-1.5 text-xs font-medium text-sky-200 whitespace-nowrap">
          Resupply ring — restocking ammo, med kits and health
        </div>
      )}

      {!s.touchMode && (
        <p className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 text-[11px] text-white/60 xl:block whitespace-nowrap">
          WASD move · Shift run · Space jump · 1–3 weapons · 4/H med kit · M mute · Esc pause · Left click attack · Right click / F shield
        </p>
      )}
    </div>
  )
}

function TopRightControls({
  s,
  muted,
  onToggleMute,
  actions,
}: {
  s: HudSnapshot
  muted: boolean
  onToggleMute: () => void
  actions: HudActions
}) {
  return (
    <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2">
      {!s.touchMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            actions.onEnableTouch()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Enable on-screen touch controls"
          aria-label="Enable on-screen touch controls"
          className={cn(
            panel,
            'hidden h-10 items-center gap-1.5 px-3 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white md:flex whitespace-nowrap',
          )}
        >
          <Gamepad2 className="size-4 text-sky-300" aria-hidden="true" />
          <span className="hidden lg:inline">Touch UI</span>
        </button>
      )}

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
          'flex h-10 items-center gap-1.5 px-3 text-xs font-semibold transition-colors whitespace-nowrap',
          muted ? 'text-white/65 hover:bg-white/10 hover:text-white' : 'text-amber-200 hover:bg-white/10 hover:text-amber-100',
        )}
      >
        {muted ? (
          <VolumeX className="size-4 text-red-300" aria-hidden="true" />
        ) : (
          <Volume2 className="size-4 text-amber-300" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{muted ? 'Sound Off' : 'Sound On'}</span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          actions.onPause()
        }}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label="Pause battle"
        title="Pause battle (Esc)"
        className={cn(
          panel,
          'flex h-10 items-center gap-1.5 px-3 text-xs font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap',
        )}
      >
        <Pause className="size-4 text-amber-300" aria-hidden="true" />
        <span className="hidden sm:inline">Pause</span>
      </button>
    </div>
  )
}

function ObjectiveBar({ s }: { s: HudSnapshot }) {
  const stagePct = Math.round((s.cityCaptured ? s.capture : s.cityCapture) * 100)
  const activeStatus = s.cityCaptured ? s.captureStatus : s.cityCaptureStatus

  const status = !s.cityCaptured
    ? activeStatus === 'capturing'
      ? `Capturing ${s.cityName} — ${stagePct}%`
      : activeStatus === 'contested'
        ? `Contested — clear red garrison from ${s.cityName}`
        : stagePct > 0
          ? `${s.cityName} ${stagePct}% — return to the town square`
          : `Secure ${s.cityName} in the center`
    : activeStatus === 'capturing'
      ? `Raising blue banner in Red Fort — ${stagePct}%`
      : activeStatus === 'contested'
        ? 'Contested — clear red defenders from the courtyard'
        : stagePct > 0
          ? `Red Fort ${stagePct}% — return to the gold circle`
          : 'City secured — storm the Red Fort courtyard'

  return (
    <div className={cn(panel, 'absolute left-4 top-4 w-[min(64vw,490px)] px-3.5 py-2.5 sm:left-1/2 sm:w-[min(92vw,500px)] sm:-translate-x-1/2 sm:px-4 sm:py-3')}>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] sm:text-xs">
        <span className="flex shrink-0 items-center gap-1.5 font-semibold text-amber-300">
          <Flag className="size-3.5 text-sky-300" aria-hidden="true" />
          Phase {s.phase}/2 <span className="hidden text-white/70 sm:inline">· {s.phaseLabel}</span>
        </span>

        <div className="flex shrink-0 items-center gap-2.5 font-mono text-[11px] tabular-nums text-white/85">
          <span className="flex items-center gap-1" title="Elapsed round time">
            <Clock className="size-3 text-white/60" aria-hidden="true" />
            {formatClock(s.elapsed)}
          </span>
          <span className="text-white/30" aria-hidden="true">
            ·
          </span>
          <span className="text-sky-200" title="Next reinforcement wave countdown">
            Wave {s.nextReinforcement}s
          </span>
        </div>
      </div>

      <div className="mb-1.5 hidden items-center justify-between gap-3 text-xs sm:flex">
        <span className="truncate font-medium text-amber-200">
          <span className="font-display font-semibold tracking-wide">{s.mapName}</span>
          <span className="mx-1.5 text-white/40" aria-hidden="true">
            ·
          </span>
          <span className="text-white/80">{s.cityName}</span>
        </span>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/70">{stagePct}%</span>
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
          'mt-1.5 truncate text-center text-[11px] sm:text-xs',
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
    <div className={cn(panel, 'absolute left-4 top-4 hidden w-56 space-y-2 px-4 py-3 text-xs xl:block')}>
      <Row icon={<Users className="size-3.5 text-sky-300" aria-hidden="true" />} label="Blue allies" value={`${s.blueAlive}`} />
      <Row
        icon={<Skull className="size-3.5 text-red-300" aria-hidden="true" />}
        label="Red garrison"
        value={`${s.redAlive}/${s.redTotal}`}
      />
      <Row
        icon={<Castle className="size-3.5 text-amber-200" aria-hidden="true" />}
        label="Fort crossbows"
        value={`${s.crossbowsAlive}/${s.crossbowsTotal}`}
      />
      <div className="border-t border-white/10 pt-2">
        <Row icon={<Target className="size-3.5 text-white/70" aria-hidden="true" />} label="Your kills" value={`${s.kills}`} />
        <p className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums text-white/60">
          <span>{s.cityCaptured ? 'City muster' : 'Blue wave'}</span>
          <span className="font-mono text-sky-200">{s.nextReinforcement}s</span>
        </p>
        <p className="mt-0.5 flex items-center justify-between text-[11px] tabular-nums text-white/50">
          <span>Red garrison wave</span>
          <span className="font-mono text-red-200">{s.nextRedWave}s</span>
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
    <ul className="absolute left-1/2 top-[60%] flex -translate-x-1/2 flex-col items-center gap-1.5">
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
  const color =
    pct > 55 ? 'from-emerald-500 to-emerald-400' : pct > 25 ? 'from-amber-500 to-amber-400' : 'from-red-600 to-red-500'
  return (
    <div
      className={cn(
        panel,
        'absolute left-4 px-3.5 py-2.5 sm:px-4 sm:py-3',
        s.touchMode ? 'bottom-44 w-56 sm:w-64' : 'bottom-4 w-[min(78vw,290px)]',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold">
          <Heart className="size-3.5 text-red-400" aria-hidden="true" /> Health
        </span>
        <span className="font-mono tabular-nums">
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
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-[width] duration-150', color)}
          style={{ width: `${pct}%` }}
        />
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

function WeaponBar({ s, actions }: { s: HudSnapshot; actions: HudActions }) {
  const slots = [
    {
      key: '1',
      id: 'sword',
      label: 'Sword',
      icon: <Sword className="size-4" aria-hidden="true" />,
      detail: s.blocking ? 'Blocking' : 'Melee',
    },
    {
      key: '2',
      id: 'gun',
      label: 'Gun',
      icon: <Crosshair className="size-4" aria-hidden="true" />,
      detail: `${s.bullets} rds`,
    },
    {
      key: '3',
      id: 'bow',
      label: 'Bow',
      icon: <Target className="size-4" aria-hidden="true" />,
      detail: `${s.arrows} arr`,
    },
    {
      key: '4',
      id: 'medkit',
      label: 'Med kit',
      icon: <BriefcaseMedical className="size-4" aria-hidden="true" />,
      detail: `${s.medkits} left`,
    },
  ] as const

  return (
    <div
      className={cn(
        'pointer-events-auto absolute flex gap-1.5 sm:gap-2',
        s.touchMode ? 'bottom-4 left-1/2 -translate-x-1/2' : 'bottom-4 right-4',
      )}
    >
      {slots.map((slot) => {
        const active = slot.id === s.weapon
        const empty =
          (slot.id === 'gun' && s.bullets === 0) ||
          (slot.id === 'bow' && s.arrows === 0) ||
          (slot.id === 'medkit' && s.medkits === 0)
        return (
          <button
            key={slot.id}
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              if (slot.id === 'medkit') actions.onUseMedkit()
              else actions.onSelectWeapon(slot.id)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            aria-label={`${slot.label} (${slot.detail})`}
            className={cn(
              panel,
              'relative w-[68px] px-2 py-2 text-left transition-colors hover:border-white/30 sm:w-[82px] sm:px-2.5',
              active && 'border-amber-300/75 bg-amber-950/65',
              empty && 'opacity-50',
            )}
          >
            <span className="absolute right-1.5 top-1 text-[10px] font-bold text-white/50">{slot.key}</span>
            <div className={cn('mb-1', active ? 'text-amber-200' : 'text-white/80')}>
              {slot.id === 'sword' && s.blocking ? <Shield className="size-4" aria-hidden="true" /> : slot.icon}
            </div>
            <p className="truncate text-[11px] font-semibold leading-tight">{slot.label}</p>
            <p className="text-[10px] tabular-nums text-white/65">{slot.detail}</p>
          </button>
        )
      })}
    </div>
  )
}

function TouchControls({ s, actions }: { s: HudSnapshot; actions: HudActions }) {
  const padRef = useRef<HTMLDivElement>(null)
  const activePointer = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [sprintLocked, setSprintLocked] = useState(false)

  const maxRadius = 42

  const updateStick = (clientX: number, clientY: number) => {
    const el = padRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = clientX - cx
    let dy = clientY - cy
    const dist = Math.hypot(dx, dy)
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius
      dy = (dy / dist) * maxRadius
    }
    setKnob({ x: dx, y: dy })
    // Screen Y up (-dy) maps to forward (+1); screen X right (+dx) maps to strafe right (+1)
    actions.onMoveVector(dx / maxRadius, -dy / maxRadius)
  }

  const resetStick = () => {
    activePointer.current = null
    setKnob({ x: 0, y: 0 })
    actions.onMoveVector(0, 0)
  }

  return (
    <>
      {/* Left Virtual Thumbstick (Capacitor / Mobile Movement) */}
      <div
        ref={padRef}
        role="group"
        aria-label="Movement thumbstick"
        onPointerDown={(e) => {
          e.stopPropagation()
          e.currentTarget.setPointerCapture(e.pointerId)
          activePointer.current = e.pointerId
          updateStick(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (activePointer.current !== e.pointerId) return
          e.stopPropagation()
          updateStick(e.clientX, e.clientY)
        }}
        onPointerUp={(e) => {
          if (activePointer.current !== e.pointerId) return
          e.stopPropagation()
          resetStick()
        }}
        onPointerCancel={(e) => {
          if (activePointer.current !== e.pointerId) return
          e.stopPropagation()
          resetStick()
        }}
        className="pointer-events-auto touch-none absolute bottom-5 left-5 flex size-28 items-center justify-center rounded-full border border-white/20 bg-[#0d1422]/70 shadow-xl"
      >
        <div className="size-16 rounded-full border border-white/10 bg-white/[0.03]" />
        <div
          className="absolute size-12 rounded-full border-2 border-amber-300/80 bg-amber-400/35 shadow-md"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* Right Tactical Action Cluster (Mapped to Unified Engine Triggers) */}
      <div className="pointer-events-auto touch-none absolute bottom-5 right-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          aria-pressed={sprintLocked}
          aria-label="Toggle sprint"
          onPointerDown={(e) => {
            e.stopPropagation()
            const next = !sprintLocked
            setSprintLocked(next)
            actions.onSprintAction(next)
          }}
          className={cn(
            'flex size-14 flex-col items-center justify-center rounded-2xl border text-[10px] font-bold shadow-lg transition-colors',
            sprintLocked || s.running
              ? 'border-amber-300 bg-amber-500/35 text-amber-100'
              : 'border-white/20 bg-[#0d1422]/85 text-white/80',
          )}
        >
          <Zap className="size-4 text-amber-300" aria-hidden="true" />
          <span>Run</span>
        </button>

        <button
          type="button"
          aria-label="Jump"
          onPointerDown={(e) => {
            e.stopPropagation()
            actions.onJump()
          }}
          className="flex size-14 flex-col items-center justify-center rounded-2xl border border-white/20 bg-[#0d1422]/85 text-[10px] font-bold text-white/85 shadow-lg active:border-sky-300 active:bg-sky-500/30"
        >
          <ArrowUp className="size-4 text-sky-300" aria-hidden="true" />
          <span>Jump</span>
        </button>

        <button
          type="button"
          aria-label={s.weapon === 'sword' ? 'Hold shield' : 'Aim fire'}
          onPointerDown={(e) => {
            e.stopPropagation()
            e.currentTarget.setPointerCapture(e.pointerId)
            actions.onSecondaryAction(true)
          }}
          onPointerUp={(e) => {
            e.stopPropagation()
            actions.onSecondaryAction(false)
          }}
          onPointerCancel={(e) => {
            e.stopPropagation()
            actions.onSecondaryAction(false)
          }}
          className={cn(
            'flex size-16 flex-col items-center justify-center rounded-2xl border text-[11px] font-bold shadow-lg transition-colors',
            s.blocking
              ? 'border-sky-300 bg-sky-500/40 text-sky-100'
              : 'border-white/20 bg-[#0d1422]/88 text-white/90 active:border-sky-300 active:bg-sky-500/30',
          )}
        >
          <Shield className="size-5 text-sky-300" aria-hidden="true" />
          <span>{s.weapon === 'sword' ? 'Shield' : 'Alt'}</span>
        </button>

        <button
          type="button"
          aria-label={s.weapon === 'sword' ? 'Swing sword' : 'Fire weapon'}
          onPointerDown={(e) => {
            e.stopPropagation()
            e.currentTarget.setPointerCapture(e.pointerId)
            actions.onPrimaryAction(true)
          }}
          onPointerUp={(e) => {
            e.stopPropagation()
            actions.onPrimaryAction(false)
          }}
          onPointerCancel={(e) => {
            e.stopPropagation()
            actions.onPrimaryAction(false)
          }}
          className="flex size-16 flex-col items-center justify-center rounded-2xl border-2 border-amber-300/85 bg-amber-400 text-[11px] font-extrabold text-[#1a1408] shadow-xl active:bg-amber-300"
        >
          {s.weapon === 'sword' ? (
            <Sword className="size-5" aria-hidden="true" />
          ) : (
            <Crosshair className="size-5" aria-hidden="true" />
          )}
          <span>{s.weapon === 'sword' ? 'Attack' : 'Fire'}</span>
        </button>
      </div>
    </>
  )
}
