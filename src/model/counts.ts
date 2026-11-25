/**
 * Tap tempo and the 8-count. A grown-up taps along with her track at any speed; the tempo is worked
 * out for 100%. A tap on a "1" sets the downbeat (in her track's seconds), and the count follows the
 * track's time.
 */
import type { Span } from './timing'

export const MIN_TAPS = 4
export const MAX_TAPS = 8
/** A pause longer than this (real seconds) starts the tapping again. */
export const TAP_RESET_GAP = 2

export function beatLength(bpm: number): number {
  return 60 / bpm
}

/**
 * Beats per minute at 100% from real tap times while playing at `rate`. Uses the last MAX_TAPS taps
 * since the last long pause, fitted with a straight line so one early or late tap barely matters.
 */
export function bpmFromTaps(wallTimes: readonly number[], rate: number): number | null {
  let start = 0
  for (let i = 1; i < wallTimes.length; i++) if (wallTimes[i] - wallTimes[i - 1] > TAP_RESET_GAP) start = i
  const taps = wallTimes.slice(start).slice(-MAX_TAPS)
  if (taps.length < MIN_TAPS) return null
  const n = taps.length
  const xMean = (n - 1) / 2
  const yMean = taps.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  taps.forEach((y, i) => {
    num += (i - xMean) * (y - yMean)
    den += (i - xMean) ** 2
  })
  const interval = num / den
  if (!(interval > 0)) return null
  const bpm = 60 / interval / (rate > 0 ? rate : 1)
  return Math.round(bpm * 2) / 2
}

/** Which count (1–8) and which 8-count (1, 2, …; 0 before the downbeat) at track time `t`. */
export function countAt(t: number, bpm: number, offset: number): { count: number; eight: number } {
  const b = Math.floor((t - offset) / beatLength(bpm) + 1e-6)
  return { count: (((b % 8) + 8) % 8) + 1, eight: Math.floor(b / 8) + 1 }
}

/** How many 8-counts a section lasts (at least one). */
export function eightsIn(span: Span, bpm: number): number {
  return Math.max(1, Math.round((span.end - span.start) / (8 * beatLength(bpm))))
}

/** Move the downbeat a little; it stays at or after zero by wrapping within one beat. */
export function nudgeOffset(offset: number, delta: number, bpm: number): number {
  let next = offset + delta
  const beat = beatLength(bpm)
  while (next < 0) next += beat
  return Math.round(next * 1000) / 1000
}
