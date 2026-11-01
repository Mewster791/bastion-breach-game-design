'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CustomMapLayout } from '@/lib/game/custom-map'
import { GameEngine, type HudSnapshot } from '@/lib/game/engine'
import { MusicManager, type MusicTrackId } from '@/lib/game/music'
import { Hud } from './hud'
import { MapCreatorModal } from './map-creator'
import { EndOverlay, PausedOverlay, StartOverlay } from './overlays'

const noopSubscribe = () => () => {}
const nullSnapshot = () => null
const falseSnapshot = () => false

export function TriterraGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [engine, setEngine] = useState<GameEngine | null>(null)
  const [music, setMusic] = useState<MusicManager | null>(null)
  const [creatorOpen, setCreatorOpen] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    const musicInstance = new MusicManager()
    const engineInstance = new GameEngine(containerRef.current, {
      onToggleMute: () => musicInstance.toggleMute(),
    })
    setMusic(musicInstance)
    setEngine(engineInstance)
    return () => {
      engineInstance.dispose()
      musicInstance.dispose()
      setEngine(null)
      setMusic(null)
    }
  }, [])

  const snapshot: HudSnapshot | null = useSyncExternalStore(
    engine ? engine.subscribe : noopSubscribe,
    engine ? engine.getSnapshot : nullSnapshot,
    nullSnapshot,
  )

  const muted: boolean = useSyncExternalStore(
    music ? music.subscribe : noopSubscribe,
    music ? music.getMuted : falseSnapshot,
    falseSnapshot,
  )

  const gameState = snapshot?.state ?? 'ready'
  const cityCaptured = snapshot?.cityCaptured ?? false

  // Dynamically adapt cinematic background music track to current siege stage
  useEffect(() => {
    if (!music) return
    let targetTrack: MusicTrackId = 'architect'
    if (!creatorOpen && gameState === 'playing') {
      targetTrack = cityCaptured ? 'assault' : 'march'
    }
    music.setTrack(targetTrack)
  }, [music, creatorOpen, gameState, cityCaptured])

  const handleStart = () => {
    if (!engine) return
    const track: MusicTrackId = snapshot?.cityCaptured ? 'assault' : 'march'
    music?.unlockAndPlay(track)
    engine.start()
  }

  const handleRestart = () => {
    if (!engine) return
    music?.unlockAndPlay('march')
    engine.restart()
  }

  const handleOpenCreator = () => {
    if (!engine) return
    music?.unlockAndPlay('architect')
    engine.pauseForOverlay()
    setCreatorOpen(true)
  }

  const handleSaveCustomMap = (layout: CustomMapLayout, playImmediately: boolean) => {
    if (!engine) return
    music?.unlockAndPlay(playImmediately ? 'march' : 'architect')
    setCreatorOpen(false)
    engine.saveCustomMap(layout, playImmediately)
  }

  const handleRemoveCustomMap = () => {
    if (!engine) return
    engine.removeCustomMap()
  }

  const handleToggleMute = () => {
    music?.toggleMute()
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0d1422]">
      <div ref={containerRef} className="absolute inset-0" />
      {!snapshot && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Raising the forts…</div>
      )}
      {snapshot && engine && (
        <>
          {snapshot.state === 'playing' && !creatorOpen && (
            <Hud s={snapshot} muted={muted} onToggleMute={handleToggleMute} />
          )}
          {snapshot.state === 'ready' && !creatorOpen && (
            <StartOverlay
              s={snapshot}
              muted={muted}
              onToggleMute={handleToggleMute}
              onOpenCreator={handleOpenCreator}
              onStart={handleStart}
            />
          )}
          {snapshot.state === 'paused' && !creatorOpen && (
            <PausedOverlay
              s={snapshot}
              muted={muted}
              onToggleMute={handleToggleMute}
              onOpenCreator={handleOpenCreator}
              onResume={handleStart}
              onRestart={handleRestart}
            />
          )}
          {(snapshot.state === 'victory' || snapshot.state === 'defeat') && !creatorOpen && (
            <EndOverlay
              s={snapshot}
              muted={muted}
              onToggleMute={handleToggleMute}
              onOpenCreator={handleOpenCreator}
              onRestart={handleRestart}
            />
          )}
          {creatorOpen && (
            <MapCreatorModal
              initialLayout={engine.getCustomMap()}
              hasSavedCustomMap={snapshot.hasCustomMap}
              onSaveToRotation={handleSaveCustomMap}
              onRemoveCustomMap={handleRemoveCustomMap}
              onClose={() => setCreatorOpen(false)}
            />
          )}
        </>
      )}
    </main>
  )
}
