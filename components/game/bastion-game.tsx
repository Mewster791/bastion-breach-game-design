'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { GameEngine, type HudSnapshot } from '@/lib/game/engine'
import { Hud } from './hud'
import { EndOverlay, PausedOverlay, StartOverlay } from './overlays'

const noopSubscribe = () => () => {}
const nullSnapshot = () => null

export function BastionGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [engine, setEngine] = useState<GameEngine | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const instance = new GameEngine(containerRef.current)
    setEngine(instance)
    return () => {
      instance.dispose()
      setEngine(null)
    }
  }, [])

  const snapshot: HudSnapshot | null = useSyncExternalStore(
    engine ? engine.subscribe : noopSubscribe,
    engine ? engine.getSnapshot : nullSnapshot,
    nullSnapshot,
  )

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0d1422]">
      <div ref={containerRef} className="absolute inset-0" />
      {!snapshot && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Raising the forts…</div>
      )}
      {snapshot && engine && (
        <>
          {snapshot.state === 'playing' && <Hud s={snapshot} />}
          {snapshot.state === 'ready' && <StartOverlay s={snapshot} onStart={() => engine.start()} />}
          {snapshot.state === 'paused' && (
            <PausedOverlay s={snapshot} onResume={() => engine.start()} onRestart={() => engine.restart()} />
          )}
          {(snapshot.state === 'victory' || snapshot.state === 'defeat') && (
            <EndOverlay s={snapshot} onRestart={() => engine.restart()} />
          )}
        </>
      )}
    </main>
  )
}
