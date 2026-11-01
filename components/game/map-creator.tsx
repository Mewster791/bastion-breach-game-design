'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Check,
  Copy,
  Crosshair,
  Eraser,
  Flag,
  Play,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CELL_SIZE_X,
  CELL_SIZE_Z,
  GRID_COLS,
  GRID_ROWS,
  REQUIRED_CROSSBOWS,
  computeOutwardCrossbowDir,
  createStarterCustomMap,
  getValidTownSquareBounds,
  isInsideRedCourtyardInterior,
  isValidBlueSpawnCell,
  isValidCrossbowCell,
  isValidWallCell,
  parseCustomMap,
  serializeCustomMap,
  validateCustomMap,
  type CellKind,
  type CustomMapLayout,
} from '@/lib/game/custom-map'
import { MAP_IDS, MAP_SPECS, type MapId } from '@/lib/game/world'
import { cn } from '@/lib/utils'

interface MapCreatorProps {
  initialLayout: CustomMapLayout | null
  hasSavedCustomMap: boolean
  onSaveToRotation: (layout: CustomMapLayout, playImmediately: boolean) => void
  onRemoveCustomMap: () => void
  onClose: () => void
}

function OutwardArrowIcon({ dirX, dirZ }: { dirX: number; dirZ: number }) {
  const angle = Math.atan2(dirZ, dirX) * (180 / Math.PI)
  // Map 2D world direction (+X = East/Right, +Z = South/Down on grid) to 8-way arrow icon
  if (angle >= -22.5 && angle < 22.5) return <ArrowRight className="size-3.5" aria-hidden="true" />
  if (angle >= 22.5 && angle < 67.5) return <ArrowDownRight className="size-3.5" aria-hidden="true" />
  if (angle >= 67.5 && angle < 112.5) return <ArrowDown className="size-3.5" aria-hidden="true" />
  if (angle >= 112.5 && angle < 157.5) return <ArrowDownLeft className="size-3.5" aria-hidden="true" />
  if (angle >= 157.5 || angle < -157.5) return <ArrowLeft className="size-3.5" aria-hidden="true" />
  if (angle >= -157.5 && angle < -112.5) return <ArrowUpLeft className="size-3.5" aria-hidden="true" />
  if (angle >= -112.5 && angle < -67.5) return <ArrowUp className="size-3.5" aria-hidden="true" />
  return <ArrowUpRight className="size-3.5" aria-hidden="true" />
}

export function MapCreatorModal({
  initialLayout,
  hasSavedCustomMap,
  onSaveToRotation,
  onRemoveCustomMap,
  onClose,
}: MapCreatorProps) {
  const [layout, setLayout] = useState<CustomMapLayout>(() => initialLayout ?? createStarterCustomMap())
  const [tool, setTool] = useState<CellKind>('wall')
  const [ruleFeedback, setRuleFeedback] = useState<{ text: string; tone: 'info' | 'warn' | 'good' } | null>(null)
  const [jsonDraft, setJsonDraft] = useState<string>(() => serializeCustomMap(initialLayout ?? createStarterCustomMap()))
  const [jsonEditedManually, setJsonEditedManually] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pointerDragging, setPointerDragging] = useState(false)

  useEffect(() => {
    if (!jsonEditedManually) {
      setJsonDraft(serializeCustomMap(layout))
    }
  }, [layout, jsonEditedManually])

  useEffect(() => {
    const stopDrag = () => setPointerDragging(false)
    window.addEventListener('pointerup', stopDrag)
    return () => window.removeEventListener('pointerup', stopDrag)
  }, [])

  const validation = useMemo(() => validateCustomMap(layout), [layout])
  const townBounds = useMemo(() => getValidTownSquareBounds(layout.blueSpawn), [layout.blueSpawn])

  const wallLookup = useMemo(() => {
    const set = new Set<string>()
    for (const w of layout.walls) set.add(`${w.col},${w.row}`)
    return set
  }, [layout.walls])

  const crossbowLookup = useMemo(() => {
    const map = new Map<string, { dirX: number; dirZ: number; index: number }>()
    layout.crossbows.forEach((c, index) => {
      map.set(`${c.col},${c.row}`, { dirX: c.dirX, dirZ: c.dirZ, index })
    })
    return map
  }, [layout.crossbows])

  const applyCellAction = (col: number, row: number, isDrag = false) => {
    const key = `${col},${row}`
    setJsonEditedManually(false)

    if (tool === 'empty') {
      const hadWall = wallLookup.has(key)
      const hadCrossbow = crossbowLookup.has(key)
      if (!hadWall && !hadCrossbow) return
      setLayout((prev) => ({
        ...prev,
        walls: prev.walls.filter((w) => !(w.col === col && w.row === row)),
        crossbows: prev.crossbows.filter((c) => !(c.col === col && c.row === row)),
      }))
      setRuleFeedback({ text: 'Cleared grid cell.', tone: 'info' })
      return
    }

    if (tool === 'wall') {
      if (wallLookup.has(key)) {
        if (!isDrag) {
          setLayout((prev) => ({
            ...prev,
            walls: prev.walls.filter((w) => !(w.col === col && w.row === row)),
          }))
          setRuleFeedback({ text: 'Removed wall segment.', tone: 'info' })
        }
        return
      }
      const check = isValidWallCell(col, row, layout)
      if (!check.ok) {
        if (!isDrag) setRuleFeedback({ text: check.reason ?? 'Invalid wall cell.', tone: 'warn' })
        return
      }
      setLayout((prev) => ({
        ...prev,
        walls: [...prev.walls, { col, row }],
      }))
      setRuleFeedback({ text: `Placed fortified wall at (${col + 1}, ${row + 1}).`, tone: 'good' })
      return
    }

    if (isDrag) return

    if (tool === 'blue_spawn') {
      const check = isValidBlueSpawnCell(col, row)
      if (!check.ok) {
        setRuleFeedback({ text: check.reason ?? 'Invalid Blue Ring Spawn location.', tone: 'warn' })
        return
      }
      setLayout((prev) => {
        const nextBlue = { col, row }
        const nextBounds = getValidTownSquareBounds(nextBlue)
        const clampedTown = {
          col: Math.max(nextBounds.minCol, Math.min(nextBounds.maxCol, prev.townSquare.col)),
          row: Math.max(nextBounds.minRow, Math.min(nextBounds.maxRow, prev.townSquare.row)),
        }
        return {
          ...prev,
          blueSpawn: nextBlue,
          townSquare: clampedTown,
          walls: prev.walls.filter(
            (w) => !(w.col === col && w.row === row) && !(w.col === clampedTown.col && w.row === clampedTown.row),
          ),
        }
      })
      setRuleFeedback({
        text: `Moved Blue Ring Spawn to (${col + 1}, ${row + 1}) and kept Town Square aligned between spawns.`,
        tone: 'good',
      })
      return
    }

    if (tool === 'town_square') {
      if (
        col < townBounds.minCol ||
        col > townBounds.maxCol ||
        row < townBounds.minRow ||
        row > townBounds.maxRow
      ) {
        setRuleFeedback({
          text: `Rule enforced: Town Square Circle must sit directly between Red and Blue spawns (highlighted corridor cols ${townBounds.minCol + 1}–${townBounds.maxCol + 1}, rows ${townBounds.minRow + 1}–${townBounds.maxRow + 1}).`,
          tone: 'warn',
        })
        return
      }
      setLayout((prev) => ({
        ...prev,
        townSquare: { col, row },
        walls: prev.walls.filter((w) => !(w.col === col && w.row === row)),
      }))
      setRuleFeedback({ text: `Placed Town Square Circle at (${col + 1}, ${row + 1}) directly between spawns.`, tone: 'good' })
      return
    }

    if (tool === 'crossbow') {
      if (crossbowLookup.has(key)) {
        setLayout((prev) => ({
          ...prev,
          crossbows: prev.crossbows.filter((c) => !(c.col === col && c.row === row)),
        }))
        setRuleFeedback({ text: `Removed crossbow at (${col + 1}, ${row + 1}).`, tone: 'info' })
        return
      }
      const check = isValidCrossbowCell(col, row)
      if (!check.ok) {
        setRuleFeedback({ text: check.reason ?? 'Invalid crossbow cell.', tone: 'warn' })
        return
      }
      if (layout.crossbows.length >= REQUIRED_CROSSBOWS) {
        setRuleFeedback({
          text: `Rule enforced: Maximum of ${REQUIRED_CROSSBOWS} outward-facing crossbows reached. Click an existing crossbow to remove it first.`,
          tone: 'warn',
        })
        return
      }
      const outward = computeOutwardCrossbowDir(col, row)
      setLayout((prev) => ({
        ...prev,
        crossbows: [...prev.crossbows, { col, row, ...outward }],
        walls: prev.walls.filter((w) => !(w.col === col && w.row === row)),
      }))
      setRuleFeedback({
        text: `Placed outward-facing crossbow (${layout.crossbows.length + 1}/${REQUIRED_CROSSBOWS}) oriented away from the Red Fort walls.`,
        tone: 'good',
      })
    }
  }

  const handleAutoPlaceCrossbows = () => {
    const starter = createStarterCustomMap()
    setJsonEditedManually(false)
    setLayout((prev) => ({
      ...prev,
      crossbows: starter.crossbows,
      walls: prev.walls.filter((w) => !starter.crossbows.some((c) => c.col === w.col && c.row === w.row)),
    }))
    setRuleFeedback({
      text: 'Placed all 8 outward-facing crossbows along the Red Fort walls and towers.',
      tone: 'good',
    })
  }

  const handleResetStarter = () => {
    const starter = createStarterCustomMap()
    setJsonEditedManually(false)
    setLayout(starter)
    setRuleFeedback({ text: 'Reset grid to balanced starter siege layout.', tone: 'info' })
  }

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(serializeCustomMap(layout))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setRuleFeedback({ text: 'Select and copy the JSON text from the box.', tone: 'info' })
    }
  }

  const handleImportJson = () => {
    const result = parseCustomMap(jsonDraft)
    if (!result.layout) {
      setRuleFeedback({ text: result.error ?? 'Failed to parse JSON layout.', tone: 'warn' })
      return
    }
    setLayout(result.layout)
    setJsonEditedManually(false)
    setRuleFeedback({ text: `Loaded "${result.layout.name}" from JSON successfully.`, tone: 'good' })
  }

  const tools: { id: CellKind; label: string; sub: string; icon: React.ReactNode; activeCls: string }[] = [
    {
      id: 'wall',
      label: 'Wall',
      sub: `${layout.walls.length} segments`,
      icon: <Shield className="size-4 text-stone-300" aria-hidden="true" />,
      activeCls: 'border-amber-300 bg-amber-950/50 text-white',
    },
    {
      id: 'blue_spawn',
      label: 'Blue Ring Spawn',
      sub: `(${layout.blueSpawn.col + 1}, ${layout.blueSpawn.row + 1})`,
      icon: <Flag className="size-4 text-sky-400" aria-hidden="true" />,
      activeCls: 'border-sky-400 bg-sky-950/60 text-white',
    },
    {
      id: 'town_square',
      label: 'Town Square Circle',
      sub: `(${layout.townSquare.col + 1}, ${layout.townSquare.row + 1})`,
      icon: <Flag className="size-4 text-amber-300" aria-hidden="true" />,
      activeCls: 'border-amber-400 bg-amber-950/60 text-white',
    },
    {
      id: 'crossbow',
      label: 'Outward Crossbows',
      sub: `${layout.crossbows.length}/${REQUIRED_CROSSBOWS} placed`,
      icon: <Crosshair className="size-4 text-red-400" aria-hidden="true" />,
      activeCls: 'border-red-400 bg-red-950/60 text-white',
    },
    {
      id: 'empty',
      label: 'Erase Cell',
      sub: 'Clear wall / bow',
      icon: <Eraser className="size-4 text-white/75" aria-hidden="true" />,
      activeCls: 'border-white/50 bg-white/10 text-white',
    },
  ]

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-[#090e18]/90 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-creator-heading"
    >
      <div className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0d1422] text-white shadow-2xl">
        {/* Mandatory Top Safety Warning Box */}
        <div
          role="alert"
          className="flex items-start gap-3 border-b border-amber-400/35 bg-amber-950/85 px-4 py-3 text-amber-100 sm:px-6"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden="true" />
          <p className="text-xs font-medium leading-relaxed sm:text-sm">
            ⚠️ &ldquo;DEVELOPER WARNING: The Map Creator is currently in active development. Creating complex layouts may
            break the game environment. If you encounter bugs or asset clipping, a simple browser page reload will fix your
            instance.&rdquo;
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Map Creator"
            className="ml-auto shrink-0 rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Workspace Body */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto p-4 sm:p-6 lg:grid-cols-12">
          {/* Left Column: Palette, Metadata & Rules */}
          <div className="flex flex-col gap-4 lg:col-span-4">
            <div>
              <h2 id="map-creator-heading" className="font-display text-2xl font-extrabold tracking-wide text-balance">
                Siege Map Creator
              </h2>
              <p className="mt-1 text-xs text-white/65">
                {GRID_COLS} × {GRID_ROWS} tactical grid ({CELL_SIZE_X}m × {CELL_SIZE_Z}m per cell) · Custom layouts join the
                10 default battlefields in rotation.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              <label className="block text-xs">
                <span className="text-white/70">Battlefield Name</span>
                <input
                  type="text"
                  maxLength={32}
                  value={layout.name}
                  onChange={(e) => {
                    setJsonEditedManually(false)
                    setLayout((prev) => ({ ...prev, name: e.target.value }))
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-amber-300 focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs">
                  <span className="text-white/70">Central City Name</span>
                  <input
                    type="text"
                    maxLength={28}
                    value={layout.cityName}
                    onChange={(e) => {
                      setJsonEditedManually(false)
                      setLayout((prev) => ({ ...prev, cityName: e.target.value }))
                    }}
                    className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2.5 text-sm text-white focus:border-amber-300 focus:outline-none"
                  />
                </label>

                <label className="block text-xs">
                  <span className="text-white/70">Environment Biome</span>
                  <select
                    value={layout.biome}
                    onChange={(e) => {
                      setJsonEditedManually(false)
                      setLayout((prev) => ({ ...prev, biome: e.target.value as MapId }))
                    }}
                    className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-[#131d31] px-2 text-sm text-white focus:border-amber-300 focus:outline-none"
                  >
                    {MAP_IDS.map((id) => (
                      <option key={id} value={id}>
                        {MAP_SPECS[id].name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Object Placement Tool Selector */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-white/80">Place Siege Objects</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
                {tools.map((item) => {
                  const active = tool === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTool(item.id)}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors whitespace-nowrap',
                        active
                          ? item.activeCls
                          : 'border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25 hover:bg-white/[0.06]',
                      )}
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        {item.icon}
                        {item.label}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-white/60">{item.sub}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Enforced Siege Rules Status */}
            <div className="space-y-2 border-t border-white/10 pt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white/85">Enforced Siege Rules</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoPlaceCrossbows}
                    className="text-[11px] font-medium text-amber-300 underline-offset-2 hover:underline whitespace-nowrap"
                  >
                    Auto-place 8 bows
                  </button>
                  <span className="text-white/30" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={handleResetStarter}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-white/65 underline-offset-2 hover:text-white hover:underline whitespace-nowrap"
                  >
                    <RotateCcw className="size-3" aria-hidden="true" /> Reset
                  </button>
                </div>
              </div>

              <ul className="space-y-1 text-[11px] leading-snug text-white/75">
                <li className="flex items-center justify-between gap-2">
                  <span>8 outward-facing crossbows away from fort walls</span>
                  <span
                    className={cn(
                      'font-mono font-semibold tabular-nums',
                      layout.crossbows.length === REQUIRED_CROSSBOWS ? 'text-emerald-300' : 'text-amber-300',
                    )}
                  >
                    {layout.crossbows.length}/{REQUIRED_CROSSBOWS}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>Town Square Circle directly between spawns</span>
                  <span className="font-mono font-semibold text-emerald-300">Active</span>
                </li>
              </ul>

              {ruleFeedback && (
                <p
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-[11px] leading-relaxed',
                    ruleFeedback.tone === 'warn' && 'border-red-400/35 bg-red-950/50 text-red-200',
                    ruleFeedback.tone === 'good' && 'border-emerald-400/35 bg-emerald-950/50 text-emerald-200',
                    ruleFeedback.tone === 'info' && 'border-white/15 bg-white/5 text-white/80',
                  )}
                >
                  {ruleFeedback.text}
                </p>
              )}

              {!validation.valid && (
                <p className="rounded-lg border border-amber-400/35 bg-amber-950/50 px-2.5 py-1.5 text-[11px] text-amber-200">
                  {validation.errors[0]}
                </p>
              )}
            </div>
          </div>

          {/* Center Column: Interactive 15x25 Tactical Siege Grid */}
          <div className="flex flex-col items-center justify-between lg:col-span-5">
            <div className="mb-2 flex w-full items-center justify-between text-[11px] text-white/65">
              <span className="font-semibold text-red-300">North: Red Fort &amp; Courtyard</span>
              <span>Center: Contested City</span>
              <span className="font-semibold text-sky-300">South: Blue Fort</span>
            </div>

            <div
              className="select-none rounded-xl border border-white/15 bg-[#09101c] p-2 shadow-inner"
              onContextMenu={(e) => e.preventDefault()}
            >
              <div
                className="grid gap-[2px]"
                style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: GRID_ROWS }).map((_, row) =>
                  Array.from({ length: GRID_COLS }).map((__, col) => {
                    const key = `${col},${row}`
                    const isBlueSpawn = layout.blueSpawn.col === col && layout.blueSpawn.row === row
                    const isTownSquare = layout.townSquare.col === col && layout.townSquare.row === row
                    const crossbow = crossbowLookup.get(key)
                    const isWall = wallLookup.has(key)

                    const isRedFortWall =
                      ((row === 0 || row === 3) && col >= 4 && col <= 10 && !(row === 3 && col === 7)) ||
                      ((col === 4 || col === 10) && row >= 0 && row <= 3)
                    const isRedCourtyard = isInsideRedCourtyardInterior(col, row)
                    const isRedBanner = col === 7 && row === 2

                    const isBlueFortWall =
                      ((row === 21 || row === 24) && col >= 4 && col <= 10 && !(row === 21 && col === 7)) ||
                      ((col === 4 || col === 10) && row >= 21 && row <= 24)
                    const isBlueCourtyard = col >= 5 && col <= 9 && row >= 22 && row <= 23

                    const inValidTownCorridor =
                      col >= townBounds.minCol &&
                      col <= townBounds.maxCol &&
                      row >= townBounds.minRow &&
                      row <= townBounds.maxRow

                    const inCityZone = row >= 9 && row <= 15 && col >= 2 && col <= 12

                    return (
                      <button
                        key={key}
                        type="button"
                        title={`Col ${col + 1}, Row ${row + 1}`}
                        onPointerDown={() => {
                          setPointerDragging(true)
                          applyCellAction(col, row, false)
                        }}
                        onPointerEnter={() => {
                          if (pointerDragging && (tool === 'wall' || tool === 'empty')) {
                            applyCellAction(col, row, true)
                          }
                        }}
                        className={cn(
                          'flex size-[18px] items-center justify-center rounded-[3px] border text-[9px] font-bold transition-colors sm:size-[20px]',
                          // Base zone tinting
                          'border-white/[0.06] bg-white/[0.03] hover:border-white/40',
                          inCityZone && 'bg-amber-200/[0.05]',
                          isRedCourtyard && 'bg-red-950/45 border-red-500/20',
                          isBlueCourtyard && 'bg-sky-950/45 border-sky-500/20',
                          (isRedFortWall || isBlueFortWall) && 'bg-stone-600/45 border-stone-400/35',
                          // Highlight valid Town Square corridor when placing Town Square Circle
                          tool === 'town_square' && inValidTownCorridor && 'border-amber-300/45 bg-amber-400/15',
                          // Placed objects
                          isWall && 'border-stone-300/70 bg-stone-400/75 text-[#111827]',
                          isRedBanner && 'border-red-400/70 bg-red-600/40 text-red-100',
                          isBlueSpawn && 'border-sky-300 bg-sky-500 text-[#071324] shadow-sm',
                          isTownSquare && 'border-amber-200 bg-amber-400 text-[#1b1305] shadow-sm',
                          crossbow && 'border-red-300 bg-red-600 text-white shadow-sm',
                        )}
                      >
                        {isBlueSpawn ? (
                          'B'
                        ) : isTownSquare ? (
                          'T'
                        ) : crossbow ? (
                          <OutwardArrowIcon dirX={crossbow.dirX} dirZ={crossbow.dirZ} />
                        ) : isWall ? (
                          '■'
                        ) : isRedBanner ? (
                          'R'
                        ) : null}
                      </button>
                    )
                  }),
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-white/65">
              <span>
                <strong className="text-red-300">R</strong> Red Keep
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-red-400">↗</strong> Outward Crossbow
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-amber-300">T</strong> Town Square Circle
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-sky-300">B</strong> Blue Ring Spawn
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-stone-300">■</strong> Wall
              </span>
            </div>
          </div>

          {/* Right Column: Clean JSON Serialization & Actions */}
          <div className="flex flex-col justify-between gap-3 lg:col-span-3">
            <div className="flex flex-1 flex-col">
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="custom-map-json" className="text-xs font-semibold text-white/85">
                  Serialized Layout JSON
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10 hover:text-white whitespace-nowrap"
                  >
                    {copied ? <Check className="size-3 text-emerald-300" /> : <Copy className="size-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={handleImportJson}
                    className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10 hover:text-white whitespace-nowrap"
                  >
                    <Upload className="size-3" />
                    Apply JSON
                  </button>
                </div>
              </div>

              <textarea
                id="custom-map-json"
                spellCheck={false}
                value={jsonDraft}
                onChange={(e) => {
                  setJsonEditedManually(true)
                  setJsonDraft(e.target.value)
                }}
                className="min-h-[220px] flex-1 resize-none rounded-xl border border-white/12 bg-[#080d17] p-3 font-mono text-[11px] leading-relaxed text-amber-100/90 focus:border-amber-300 focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-white/55">
                Saved custom JSON maps join the 10 default battlefields in automatic round rotation (1/11 equal chance).
              </p>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-3">
              <Button
                type="button"
                disabled={!validation.valid}
                onClick={() => onSaveToRotation(layout, true)}
                className="h-10 w-full bg-amber-400 text-sm font-semibold text-[#1a1408] hover:bg-amber-300 disabled:opacity-45 whitespace-nowrap"
              >
                <Play className="mr-1.5 size-4" aria-hidden="true" />
                Save &amp; Play Custom Map
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!validation.valid}
                  onClick={() => onSaveToRotation(layout, false)}
                  className="h-9 flex-1 border-white/20 bg-white/5 text-xs font-semibold text-white hover:bg-white/10 hover:text-white disabled:opacity-45 whitespace-nowrap"
                >
                  <Save className="mr-1.5 size-3.5" aria-hidden="true" />
                  Save to Rotation
                </Button>

                {hasSavedCustomMap && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onRemoveCustomMap}
                    title="Remove custom map from round rotation"
                    className="h-9 border-red-400/30 bg-red-950/40 px-3 text-xs font-semibold text-red-200 hover:bg-red-950/70 hover:text-red-100 whitespace-nowrap"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
