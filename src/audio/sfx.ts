/**
 * Sound effects made in Web Audio (nothing is downloaded): a stage light switching on, a cheer when a
 * ladder is finished, a pop for her first full Showtime, and the audience (src/audio/audience.ts).
 * They have their own volume and mute (Today → Sounds), separate from the spoken cues. Each effect
 * that actually plays is noted for the read-only debug hook, so checks can see what was played.
 * None of them ever depends on how she did.
 */
import { save } from '../app/ctx'
import { applauseSamples, crowdSamples } from './audience'

export interface PlayedSound {
  name: string
  at: number
  volume: number
}

let ctx: AudioContext | null = null
const played: PlayedSound[] = []

/** The one audio context (sound effects and the coach's narration share it). */
export function audioContext(): AudioContext | null {
  return context()
}

function context(): AudioContext | null {
  if (ctx) return ctx
  const AC = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined
  if (!AC) return null
  try {
    ctx = new AC()
  } catch {
    ctx = null
  }
  return ctx
}

/** Inside a tap: wake the audio context so effects can play later. */
export function unlockEffects(): void {
  const c = context()
  if (c && c.state !== 'running') void c.resume().catch(() => undefined)
}

/** Effects volume now (0 when muted). */
export function effectsVolume(): number {
  const s = save().sound
  return s.effectsOn ? s.effectsVolume : 0
}

/** Everything played so far (for the debug hook). */
export function playedSounds(): PlayedSound[] {
  return played.map((p) => ({ ...p }))
}

/**
 * Play an effect: `build` wires its nodes into `out` (a gain at the effects volume) starting at
 * `t0`, and returns how long it lasts. Nothing happens when effects are muted.
 */
export interface SoundHandle {
  stop: (fadeS?: number) => void
}

export function play(name: string, build: (c: AudioContext, out: AudioNode, t0: number, keep: (n: AudioScheduledSourceNode) => void) => number, gain = 1): SoundHandle | null {
  const volume = effectsVolume()
  if (volume <= 0) return null
  const c = context()
  if (!c) return null
  try {
    if (c.state !== 'running') void c.resume().catch(() => undefined)
    const out = c.createGain()
    out.gain.value = volume * gain
    out.connect(c.destination)
    const t0 = c.currentTime + 0.02
    const sources: AudioScheduledSourceNode[] = []
    const length = build(c, out, t0, (n) => sources.push(n))
    played.push({ name, at: Date.now(), volume })
    const finish = () => {
      for (const s of sources)
        try {
          s.stop()
        } catch {
          /* already stopped */
        }
      out.disconnect()
    }
    const cleanup = window.setTimeout(finish, (length + 1) * 1000)
    let stopped = false
    return {
      stop: (fadeS = 0.6) => {
        if (stopped) return
        stopped = true
        window.clearTimeout(cleanup)
        const now = c.currentTime
        out.gain.cancelScheduledValues(now)
        out.gain.setValueAtTime(out.gain.value, now)
        out.gain.linearRampToValueAtTime(0, now + fadeS)
        window.setTimeout(finish, (fadeS + 0.2) * 1000)
      },
    }
  } catch (err) {
    console.warn('[solostudio] sound failed', err)
    return null
  }
}

/** A buffer of samples made by `fill` (for noise-based effects). */
export function buffer(c: AudioContext, samples: Float32Array): AudioBuffer {
  const b = c.createBuffer(1, samples.length, c.sampleRate)
  b.getChannelData(0).set(samples)
  return b
}

function tone(c: AudioContext, out: AudioNode, type: OscillatorType, from: number, to: number, start: number, length: number, peak: number): void {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(from, start)
  o.frequency.exponentialRampToValueAtTime(to, start + length)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(peak, start + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, start + length)
  o.connect(g).connect(out)
  o.start(start)
  o.stop(start + length + 0.05)
}

/** A stage light switching on: a soft click and a bright rising hum. */
export function lightOn(): void {
  play('light-on', (c, out, t0) => {
    tone(c, out, 'square', 1800, 900, t0, 0.03, 0.08)
    tone(c, out, 'triangle', 420, 880, t0 + 0.03, 0.35, 0.35)
    tone(c, out, 'sine', 840, 1760, t0 + 0.05, 0.3, 0.12)
    return 0.45
  })
}

/** A cheer for finishing a ladder: a quick rising arpeggio. */
export function cheer(): void {
  play('cheer', (c, out, t0) => {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, out, 'triangle', f, f * 1.01, t0 + i * 0.09, 0.45, 0.3))
    tone(c, out, 'sine', 1046.5, 2093, t0 + 0.36, 0.5, 0.12)
    return 1
  })
}

/** Confetti for her first full Showtime: a pop and a sparkle. */
export function confettiPop(): void {
  play('confetti', (c, out, t0) => {
    tone(c, out, 'sine', 180, 60, t0, 0.12, 0.5)
    ;[1318.5, 1568, 2093, 2637].forEach((f, i) => tone(c, out, 'sine', f, f, t0 + 0.1 + i * 0.06, 0.25, 0.12))
    return 0.8
  })
}

let crowdBuffer: AudioBuffer | null = null
let applauseBuffer: AudioBuffer | null = null

/** The gentle crowd before she walks on: fades in, loops until stopped. */
export function startCrowd(): SoundHandle | null {
  return play(
    'crowd',
    (c, out, t0, keep) => {
      crowdBuffer ??= buffer(c, crowdSamples(c.sampleRate))
      const src = c.createBufferSource()
      src.buffer = crowdBuffer
      src.loop = true
      const g = c.createGain()
      g.gain.setValueAtTime(0, t0)
      g.gain.linearRampToValueAtTime(1, t0 + 1.5)
      src.connect(g).connect(out)
      src.start(t0)
      keep(src)
      return 600
    },
    0.7,
  )
}

/** Applause after her bow: the same every time, whatever happened. */
export function playApplause(): SoundHandle | null {
  return play('applause', (c, out, t0, keep) => {
    applauseBuffer ??= buffer(c, applauseSamples(c.sampleRate))
    const src = c.createBufferSource()
    src.buffer = applauseBuffer
    src.connect(out)
    src.start(t0)
    keep(src)
    return applauseBuffer.duration
  })
}

/**
 * A click for a grown-up checking the beat in setup (version 1.2): a short tick, higher and louder on
 * each 1. It plays even when her sound effects are off (it's the grown-up's tool, not hers).
 */
export function click(one: boolean): void {
  const c = context()
  if (!c) return
  try {
    if (c.state !== 'running') void c.resume().catch(() => undefined)
    const volume = one ? 0.9 : 0.55
    const o = c.createOscillator()
    const g = c.createGain()
    const t0 = c.currentTime + 0.005
    o.type = 'square'
    o.frequency.setValueAtTime(one ? 1760 : 1175, t0)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(volume * 0.4, t0 + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05)
    o.connect(g).connect(c.destination)
    o.start(t0)
    o.stop(t0 + 0.07)
    played.push({ name: 'click', at: Date.now(), volume })
  } catch (err) {
    console.warn('[solostudio] click failed', err)
  }
}
