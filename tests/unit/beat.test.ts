/**
 * Beat: the setup wizard works out the tempo and the first "1" (a downbeat) of her track from the
 * audio itself, so a grown-up only has to check it. Every track here is built in the test with a
 * known answer (clicks, a drum pattern, silence, hiss); no audio files.
 */
import { describe, expect, it } from 'vitest'
import { detectBeat, doubleTempo, halfTempo, nudgeOffset, type BeatGuess } from '../../src/model/beat'
import { seeded } from '../../src/model/rng'

const RATE = 22050
const BPM_TOLERANCE = 1
const OFFSET_TOLERANCE = 0.06

type Rand = () => number

function blank(seconds: number, rate: number): Float32Array {
  return new Float32Array(Math.round(seconds * rate))
}

/** Quiet background hiss from `from` seconds on (silence before it). */
function hiss(out: Float32Array, rate: number, level: number, rand: Rand, from = 0): void {
  for (let i = Math.round(from * rate); i < out.length; i++) out[i] += (rand() * 2 - 1) * level
}

/** A click: a short burst of noise that dies away in a few milliseconds. */
function click(out: Float32Array, rate: number, t: number, amp: number, rand: Rand): void {
  const i0 = Math.round(t * rate)
  const len = Math.round(0.04 * rate)
  const decay = 0.008 * rate
  for (let j = 0; j < len && i0 + j < out.length; j++) if (i0 + j >= 0) out[i0 + j] += amp * (rand() * 2 - 1) * Math.exp(-j / decay)
}

interface ClickTrack {
  bpm: number
  /** The first downbeat (a "1"), in seconds. */
  offset: number
  seconds: number
  /** Quieter beats before the first "1" (the end of a bar that has no start), as long as they are after 0 s. */
  pickups?: number
  /** Digital silence until this time (seconds), then hiss and music. */
  silentUntil?: number
  rate?: number
  seed?: number
}

/** Clicks on every beat, louder on every "1" (every 4th beat from the offset), over a little hiss. */
function clickTrack({ bpm, offset, seconds, pickups = 0, silentUntil = 0, rate = RATE, seed = 1 }: ClickTrack): Float32Array {
  const out = blank(seconds, rate)
  const rand = seeded(seed)
  hiss(out, rate, 0.01, rand, silentUntil)
  const beat = 60 / bpm
  for (let k = -pickups; offset + k * beat < seconds; k++) {
    const t = offset + k * beat
    if (t < silentUntil) continue
    click(out, rate, t, ((k % 4) + 4) % 4 === 0 ? 1 : 0.5, rand)
  }
  return out
}

/** A kick: a low thump that falls in pitch. */
function kick(out: Float32Array, rate: number, t: number, amp: number): void {
  const i0 = Math.round(t * rate)
  let phase = 0
  for (let j = 0; j < 0.25 * rate && i0 + j < out.length; j++) {
    const s = j / rate
    const f = 50 + 100 * Math.exp(-s / 0.03)
    phase += (2 * Math.PI * f) / rate
    out[i0 + j] += amp * Math.sin(phase) * Math.exp(-s / 0.07)
  }
}

/** A clap or snare: bright noise (no low end), loud and short. */
function clap(out: Float32Array, rate: number, t: number, amp: number, rand: Rand): void {
  const i0 = Math.round(t * rate)
  let prev = 0
  for (let j = 0; j < 0.15 * rate && i0 + j < out.length; j++) {
    const n = rand() * 2 - 1
    out[i0 + j] += amp * (n - prev) * Math.exp(-j / rate / 0.03)
    prev = n
  }
}

/** A hi-hat: very bright, quiet and very short. */
function hat(out: Float32Array, rate: number, t: number, amp: number, rand: Rand): void {
  const i0 = Math.round(t * rate)
  let p1 = 0
  let p2 = 0
  for (let j = 0; j < 0.05 * rate && i0 + j < out.length; j++) {
    const n = rand() * 2 - 1
    out[i0 + j] += (amp / 4) * (n - 2 * p1 + p2) * Math.exp(-j / rate / 0.01)
    p2 = p1
    p1 = n
  }
}

/** A bass note that starts on a "1" and holds for most of the bar. */
function bass(out: Float32Array, rate: number, t: number, length: number, f: number, amp: number): void {
  const i0 = Math.round(t * rate)
  const n = Math.round(length * rate)
  for (let j = 0; j < n && i0 + j < out.length; j++) {
    const s = j / rate
    const env = Math.min(1, s / 0.005) * Math.min(1, (length - s) / 0.02) * Math.exp(-s / 1.5)
    out[i0 + j] += amp * env * Math.sin(2 * Math.PI * f * s)
  }
}

/**
 * A pattern like her track's: kick on 1 and 3, a clap on 2 and 4 that is the loudest hit in the
 * bar, hi-hats on every half beat, and a new bass note on every "1".
 */
function drumTrack(bpm: number, offset: number, seconds: number, seed = 7): Float32Array {
  const out = blank(seconds, RATE)
  const rand = seeded(seed)
  hiss(out, RATE, 0.005, rand)
  const beat = 60 / bpm
  const roots = [55, 73.4, 61.7, 49]
  for (let k = 0; offset + k * beat < seconds; k++) {
    const t = offset + k * beat
    const pos = k % 4
    if (pos === 0 || pos === 2) kick(out, RATE, t, 0.8)
    else clap(out, RATE, t, 0.9, rand)
    hat(out, RATE, t, 0.2, rand)
    hat(out, RATE, t + beat / 2, 0.15, rand)
    if (pos === 0) bass(out, RATE, t, 3.5 * beat, roots[(k / 4) % 4], 0.35)
  }
  return out
}

function expectBeat(guess: BeatGuess | null, bpm: number, offset: number, label: string): void {
  expect(guess, label).not.toBeNull()
  const g = guess!
  expect(Math.abs(g.bpm - bpm), `${label}: bpm ${g.bpm}`).toBeLessThanOrEqual(BPM_TOLERANCE)
  expect(Math.abs(g.offset - offset), `${label}: offset ${g.offset}`).toBeLessThanOrEqual(OFFSET_TOLERANCE)
}

describe('working out the beat from her track', () => {
  it('finds the tempo and the first downbeat of a click track', () => {
    for (const [i, bpm] of [96, 120, 128.5, 150].entries()) {
      const offset = 0.73
      const guess = detectBeat(clickTrack({ bpm, offset, seconds: 30, seed: 10 + i }), RATE)
      expectBeat(guess, bpm, offset, `${bpm} bpm`)
    }
  })

  it('picks the louder "1" after pickup beats, not the first beat it hears', () => {
    // A "1" at 1.6 s at 120 bpm, with quieter beats at 0.1, 0.6 and 1.1 s before it.
    expectBeat(detectBeat(clickTrack({ bpm: 120, offset: 1.6, pickups: 3, seconds: 30 }), RATE), 120, 1.6, 'pickups')
  })

  it('finds the first downbeat after a silent first second', () => {
    // Silent to 1.0 s; pickups at 1.03 and 1.43 s; the first "1" at 1.83 s (a bar is 1.6 s at 150 bpm).
    const track = clickTrack({ bpm: 150, offset: 1.83, pickups: 2, silentUntil: 1.0, seconds: 30, seed: 3 })
    expectBeat(detectBeat(track, RATE), 150, 1.83, 'silent first second')
  })

  it('finds the first downbeat after a longer silent intro, not an earlier bar in the silence', () => {
    const track = clickTrack({ bpm: 120, offset: 4.8, silentUntil: 4.5, seconds: 34, seed: 4 })
    expectBeat(detectBeat(track, RATE), 120, 4.8, 'silent intro')
  })

  it('finds the "1" in a drum pattern by its kick and bass, not by the loudest clap', () => {
    expectBeat(detectBeat(drumTrack(92, 0.41, 30), RATE), 92, 0.41, '92 bpm drums')
    expectBeat(detectBeat(drumTrack(138, 1.12, 30, 8), RATE), 138, 1.12, '138 bpm drums')
  })

  it('works at the sample rates a decoded track comes in', () => {
    for (const rate of [44100, 48000]) {
      expectBeat(detectBeat(clickTrack({ bpm: 112, offset: 0.73, seconds: 25, rate, seed: rate }), rate), 112, 0.73, `${rate} Hz`)
    }
  })

  it('stays on the beat through a whole song, and is quick', () => {
    const track = clickTrack({ bpm: 128.5, offset: 0.73, seconds: 240, seed: 5 })
    const t0 = performance.now()
    const guess = detectBeat(track, RATE)
    const ms = performance.now() - t0
    expectBeat(guess, 128.5, 0.73, '4-minute track')
    expect(ms, `${Math.round(ms)} ms`).toBeLessThan(2000)
  })

  it('rounds the tempo to 0.1 bpm and the downbeat to 0.01 s, and says how sure it is', () => {
    const guess = detectBeat(clickTrack({ bpm: 128.5, offset: 0.73, seconds: 30 }), RATE)!
    expect(Math.round(guess.bpm * 10) / 10).toBe(guess.bpm)
    expect(Math.round(guess.offset * 100) / 100).toBe(guess.offset)
    expect(guess.offset).toBeGreaterThanOrEqual(0)
    expect(guess.confidence).toBeGreaterThanOrEqual(0)
    expect(guess.confidence).toBeLessThanOrEqual(1)
    expect(guess.confidence, 'a clean click track').toBeGreaterThan(0.6)
  })

  it('gives the same answer every time', () => {
    const track = drumTrack(92, 0.41, 20)
    expect(detectBeat(track, RATE)).toEqual(detectBeat(track, RATE))
  })

  it('gives no guess for silence', () => {
    expect(detectBeat(blank(20, RATE), RATE)).toBeNull()
  })

  it('gives no guess for a track shorter than 6 seconds', () => {
    expect(detectBeat(clickTrack({ bpm: 120, offset: 0.73, seconds: 5.9 }), RATE)).toBeNull()
    expectBeat(detectBeat(clickTrack({ bpm: 120, offset: 0.73, seconds: 6.5 }), RATE), 120, 0.73, 'just over 6 s')
  })

  it('gives no guess when there is no clear pulse', () => {
    const out = blank(20, RATE)
    hiss(out, RATE, 0.3, seeded(9))
    expect(detectBeat(out, RATE)).toBeNull()
  })
})

describe('fixing the guess by hand', () => {
  it('halves the tempo and keeps the same "1"', () => {
    expect(halfTempo({ bpm: 128, offset: 0.73 })).toEqual({ bpm: 64, offset: 0.73 })
    expect(halfTempo({ bpm: 128.5, offset: 4.8 })).toEqual({ bpm: 64.25, offset: 4.8 })
  })

  it('doubles the tempo and keeps the same "1"', () => {
    expect(doubleTempo({ bpm: 64, offset: 0.73 })).toEqual({ bpm: 128, offset: 0.73 })
    expect(doubleTempo({ bpm: 75.3, offset: 1.83 })).toEqual({ bpm: 150.6, offset: 1.83 })
  })

  it('undoes a half with a double, and a double with a half', () => {
    const t = { bpm: 128.5, offset: 0.73 }
    expect(doubleTempo(halfTempo(t))).toEqual(t)
    expect(halfTempo(doubleTempo(t))).toEqual(t)
  })

  it('nudges the downbeat by small steps and leaves the tempo alone', () => {
    const a = nudgeOffset({ bpm: 120, offset: 1.0 }, 0.05)
    expect(a.bpm).toBe(120)
    expect(a.offset).toBeCloseTo(1.05, 9)
    expect(nudgeOffset({ bpm: 120, offset: 1.0 }, -0.05).offset).toBeCloseTo(0.95, 9)
  })

  it('wraps by a whole bar instead of going below zero', () => {
    // A bar is 2 s at 120 bpm.
    expect(nudgeOffset({ bpm: 120, offset: 0.02 }, -0.05).offset).toBeCloseTo(1.97, 9)
    expect(nudgeOffset({ bpm: 120, offset: 0.3 }, -5).offset).toBeCloseTo(1.3, 9)
    expect(nudgeOffset({ bpm: 120, offset: 0 }, -0.01).offset).toBeCloseTo(1.99, 9)
  })

  it('never goes negative and always stays on the same bar grid', () => {
    const rand = seeded(11)
    for (let i = 0; i < 200; i++) {
      const bpm = 60 + rand() * 140
      const bar = (4 * 60) / bpm
      const offset = Math.round(rand() * 3 * 100) / 100
      const delta = Math.round((rand() * 6 - 3) * 100) / 100
      const next = nudgeOffset({ bpm, offset }, delta)
      expect(next.bpm).toBe(bpm)
      expect(next.offset, `${offset} + ${delta} at ${bpm}`).toBeGreaterThanOrEqual(0)
      const bars = (next.offset - (offset + delta)) / bar
      expect(Math.abs(bars - Math.round(bars)), `${offset} + ${delta} at ${bpm}`).toBeLessThan(1e-3)
    }
  })

  it('keeps a first downbeat after a silent intro where it is when nudged', () => {
    expect(nudgeOffset({ bpm: 120, offset: 4.8 }, 0.03).offset).toBeCloseTo(4.83, 9)
    expect(nudgeOffset({ bpm: 120, offset: 4.8 }, -0.03).offset).toBeCloseTo(4.77, 9)
  })
})
