export type MusicTrackId = 'architect' | 'march' | 'assault'

const MUTE_STORAGE_KEY = 'triterra_siege_muted_v1'
const SAMPLE_RATE = 22050

interface TrackNote {
  freq: number
  start: number
  dur: number
  amp: number
  harmonic?: number
}

/**
 * Renders a seamless-looping stereo 16-bit PCM WAV Blob URL in memory
 * so HTML5 <audio> elements play rich cinematic siege tracks with zero external file 404s.
 */
function buildSeamlessWavUrl(durationSec: number, renderSample: (t: number, ch: 0 | 1) => number): string {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec)
  const fadeSamples = Math.floor(SAMPLE_RATE * 1.2)
  const numChannels = 2
  const bytesPerSample = 2
  const dataBytes = numSamples * numChannels * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buffer)

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, numChannels, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * numChannels * bytesPerSample, true)
  view.setUint16(32, numChannels * bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataBytes, true)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE
    for (let ch = 0 as 0 | 1; ch < 2; ch = (ch + 1) as 0 | 1) {
      let sample = renderSample(t, ch)
      // Crossfade the tail with a pre-roll wrap so loop point is 100% click-free
      if (i < fadeSamples) {
        const alpha = i / fadeSamples
        const tailT = durationSec + t
        sample = sample * alpha + renderSample(tailT, ch) * (1 - alpha)
      }
      const clamped = Math.max(-0.95, Math.min(0.95, sample))
      view.setInt16(offset, Math.round(clamped * 32767), true)
      offset += 2
    }
  }

  const blob = new Blob([buffer], { type: 'audio/wav' })
  return URL.createObjectURL(blob)
}

function noteEnv(localT: number, dur: number, attack = 0.35, release = 0.65): number {
  if (localT < 0 || localT > dur) return 0
  if (localT < attack) return 0.5 - 0.5 * Math.cos((Math.PI * localT) / attack)
  if (localT > dur - release) return 0.5 - 0.5 * Math.cos((Math.PI * (dur - localT)) / release)
  return 1
}

function warmHornWave(phase: number, richness = 0.45): number {
  return (
    Math.sin(phase) * 0.65 +
    Math.sin(phase * 2) * (0.24 * richness) +
    Math.sin(phase * 3) * (0.12 * richness) +
    Math.sin(phase * 0.5) * 0.14
  )
}

function createTrackUrl(id: MusicTrackId): string {
  const tau = Math.PI * 2

  if (id === 'architect') {
    // Calm atmospheric D-dorian strings & gentle harmonic fifths (12s seamless loop)
    const dur = 12
    const notes: TrackNote[] = [
      { freq: 146.83, start: 0, dur: 6.2, amp: 0.13, harmonic: 0.3 }, // D3
      { freq: 220.0, start: 0.4, dur: 5.8, amp: 0.09, harmonic: 0.25 }, // A3
      { freq: 329.63, start: 1.5, dur: 4.2, amp: 0.055, harmonic: 0.2 }, // E4
      { freq: 130.81, start: 6.0, dur: 6.2, amp: 0.13, harmonic: 0.3 }, // C3
      { freq: 196.0, start: 6.4, dur: 5.6, amp: 0.09, harmonic: 0.25 }, // G3
      { freq: 293.66, start: 7.5, dur: 4.3, amp: 0.06, harmonic: 0.2 }, // D4
    ]
    return buildSeamlessWavUrl(dur, (t, ch) => {
      const local = t % dur
      const detune = ch === 0 ? 0.9985 : 1.0015
      const lfo = 0.85 + 0.15 * Math.sin((tau * t) / 6 + ch * 0.8)
      let out = Math.sin(tau * 73.42 * detune * t) * 0.11 * lfo
      for (const n of notes) {
        const env = noteEnv(local - n.start, n.dur, 0.9, 1.4)
        if (env > 0) {
          out += warmHornWave(tau * n.freq * detune * t, n.harmonic) * n.amp * env
        }
      }
      return out * 0.72
    })
  }

  if (id === 'march') {
    // Stage 1 Central City Siege: Cinematic D-minor war-horn motif + deep cello drone + distant kettle drum (16s loop)
    const dur = 16
    const notes: TrackNote[] = [
      { freq: 146.83, start: 0.0, dur: 4.2, amp: 0.15, harmonic: 0.65 }, // D3
      { freq: 220.0, start: 2.0, dur: 2.4, amp: 0.11, harmonic: 0.55 }, // A3
      { freq: 174.61, start: 4.0, dur: 4.2, amp: 0.14, harmonic: 0.6 }, // F3
      { freq: 164.81, start: 6.2, dur: 2.0, amp: 0.1, harmonic: 0.5 }, // E3
      { freq: 130.81, start: 8.0, dur: 4.2, amp: 0.15, harmonic: 0.65 }, // C3
      { freq: 196.0, start: 10.0, dur: 2.2, amp: 0.11, harmonic: 0.55 }, // G3
      { freq: 146.83, start: 12.0, dur: 4.2, amp: 0.16, harmonic: 0.7 }, // D3
      { freq: 220.0, start: 13.8, dur: 2.2, amp: 0.1, harmonic: 0.5 }, // A3
    ]
    return buildSeamlessWavUrl(dur, (t, ch) => {
      const local = t % dur
      const detune = ch === 0 ? 0.998 : 1.002
      // Deep pedal drone D2 + A2
      let out =
        (Math.sin(tau * 73.42 * detune * t) * 0.16 + Math.sin(tau * 110.0 * t) * 0.08) *
        (0.86 + 0.14 * Math.sin((tau * t) / 4))

      for (const n of notes) {
        const env = noteEnv(local - n.start, n.dur, 0.45, 0.9)
        if (env > 0) {
          out += warmHornWave(tau * n.freq * detune * t, n.harmonic) * n.amp * env
        }
      }

      // Distant cinematic siege timpani every 2 seconds (with subtle off-beat answer)
      const beatPeriod = 2.0
      const beatPhase = local % beatPeriod
      if (beatPhase < 0.55) {
        const pitchDrop = 58 - beatPhase * 22
        const drumEnv = Math.exp(-beatPhase * 6.5)
        out += Math.sin(tau * pitchDrop * beatPhase) * 0.22 * drumEnv
      }
      const subBeat = (local + 0.5) % 4.0
      if (subBeat < 0.35) {
        const drumEnv = Math.exp(-subBeat * 9.0)
        out += Math.sin(tau * 49 * subBeat) * 0.13 * drumEnv
      }

      return out * 0.75
    })
  }

  // 'assault' — Stage 2 Final Red Fort Breach: Urgent A-phrygian brass & driving war-drums (12s loop)
  const dur = 12
  const notes: TrackNote[] = [
    { freq: 110.0, start: 0.0, dur: 3.1, amp: 0.16, harmonic: 0.8 }, // A2
    { freq: 164.81, start: 1.5, dur: 1.7, amp: 0.12, harmonic: 0.7 }, // E3
    { freq: 116.54, start: 3.0, dur: 3.1, amp: 0.16, harmonic: 0.85 }, // Bb2 (Phrygian tension)
    { freq: 174.61, start: 4.5, dur: 1.7, amp: 0.12, harmonic: 0.7 }, // F3
    { freq: 130.81, start: 6.0, dur: 3.1, amp: 0.16, harmonic: 0.85 }, // C3
    { freq: 196.0, start: 7.5, dur: 1.7, amp: 0.13, harmonic: 0.75 }, // G3
    { freq: 110.0, start: 9.0, dur: 3.1, amp: 0.17, harmonic: 0.85 }, // A2
    { freq: 220.0, start: 10.2, dur: 1.8, amp: 0.12, harmonic: 0.75 }, // A3
  ]
  return buildSeamlessWavUrl(dur, (t, ch) => {
    const local = t % dur
    const detune = ch === 0 ? 0.9975 : 1.0025
    let out =
      (Math.sin(tau * 55.0 * detune * t) * 0.18 + Math.sin(tau * 82.41 * t) * 0.09) *
      (0.85 + 0.15 * Math.sin((tau * t) / 3))

    for (const n of notes) {
      const env = noteEnv(local - n.start, n.dur, 0.3, 0.65)
      if (env > 0) {
        out += warmHornWave(tau * n.freq * detune * t, n.harmonic) * n.amp * env
      }
    }

    // Faster 1.5s war-drum cadence for final fort storming
    const beatPhase = local % 1.5
    if (beatPhase < 0.45) {
      const drumEnv = Math.exp(-beatPhase * 7.5)
      out += Math.sin(tau * (64 - beatPhase * 26) * beatPhase) * 0.24 * drumEnv
    }
    const answerPhase = (local + 0.375) % 1.5
    if (answerPhase < 0.28) {
      const drumEnv = Math.exp(-answerPhase * 10.5)
      out += Math.sin(tau * 52 * answerPhase) * 0.14 * drumEnv
    }

    return out * 0.76
  })
}

export class MusicManager {
  private audio: HTMLAudioElement | null = null
  private trackUrls = new Map<MusicTrackId, string>()
  private currentTrack: MusicTrackId = 'architect'
  private unlocked = false
  private muted = false
  private listeners = new Set<() => void>()
  private disposed = false

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.muted = window.localStorage.getItem(MUTE_STORAGE_KEY) === '1'
      } catch {
        this.muted = false
      }
    }
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  getMuted = () => this.muted

  private emit() {
    for (const fn of this.listeners) fn()
  }

  private ensureAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || this.disposed) return null
    if (!this.audio) {
      const el = new window.Audio()
      el.loop = true
      el.preload = 'auto'
      el.volume = 0.48
      el.muted = this.muted
      this.audio = el
    }
    return this.audio
  }

  private getOrCreateUrl(track: MusicTrackId): string {
    let url = this.trackUrls.get(track)
    if (!url) {
      url = createTrackUrl(track)
      this.trackUrls.set(track, url)
    }
    return url
  }

  /**
   * Must be invoked inside a user interaction handler (e.g. clicking Start Battle,
   * Enter Map Creator, or the Volume toggle) to satisfy browser autoplay policies.
   */
  unlockAndPlay(track?: MusicTrackId) {
    if (this.disposed) return
    if (track) this.currentTrack = track
    this.unlocked = true
    this.syncPlayback()
  }

  setTrack(track: MusicTrackId) {
    if (this.disposed || this.currentTrack === track) return
    this.currentTrack = track
    if (this.unlocked) {
      this.syncPlayback()
    }
  }

  toggleMute = () => {
    this.setMuted(!this.muted, true)
  }

  setMuted(nextMuted: boolean, fromUserGesture = false) {
    if (this.disposed) return
    this.muted = nextMuted
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(MUTE_STORAGE_KEY, nextMuted ? '1' : '0')
      } catch {
        // Ignore
      }
    }
    if (fromUserGesture && !nextMuted) {
      this.unlocked = true
    }
    const el = this.ensureAudioElement()
    if (el) {
      el.muted = this.muted
      if (this.muted) {
        el.pause()
      } else if (this.unlocked) {
        this.syncPlayback()
      }
    }
    this.emit()
  }

  private syncPlayback() {
    if (!this.unlocked || this.disposed) return
    const el = this.ensureAudioElement()
    if (!el) return
    el.muted = this.muted
    if (this.muted) {
      el.pause()
      return
    }
    const targetUrl = this.getOrCreateUrl(this.currentTrack)
    if (el.src !== targetUrl) {
      el.src = targetUrl
      el.loop = true
    }
    if (el.paused) {
      const playPromise = el.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Silently wait for next explicit user interaction if browser blocks playback
        })
      }
    }
  }

  dispose() {
    this.disposed = true
    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      this.audio.load()
      this.audio = null
    }
    for (const url of this.trackUrls.values()) {
      URL.revokeObjectURL(url)
    }
    this.trackUrls.clear()
    this.listeners.clear()
  }
}
