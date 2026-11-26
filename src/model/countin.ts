/**
 * The spoken count-in before every rep: a moment to get to her spot, then "5, 6, 7, 8" on the beat of
 * her track at the speed she is practising, and the music comes in on the 1. With no tempo yet (or a
 * strange one) it keeps a pace she can follow.
 */
import { KID_COPY } from '../content/kid'

/** The words, from src/content (they are spoken to her): "5", "6", "7", "8". */
export const COUNT_IN_WORDS: readonly string[] = KID_COPY.cues.countIn.split(/,\s*/)

/** Time to get from the iPad to her spot before the first count. */
export const COUNT_IN_LEAD_MS = 1500
const DEFAULT_BEAT_MS = 600
const MIN_BEAT_MS = 400
const MAX_BEAT_MS = 1000

/** One beat of her track at this speed, in real milliseconds (kept between 0.4 s and 1 s). */
export function beatMs(bpm: number | null, speed: number): number {
  if (!bpm || !(bpm > 0) || !(speed > 0)) return DEFAULT_BEAT_MS
  return Math.min(MAX_BEAT_MS, Math.max(MIN_BEAT_MS, 60_000 / (bpm * speed)))
}

export interface CountInSchedule {
  /** When to say each word, in ms from the start. */
  beats: number[]
  /** When the music comes in (on the 1). */
  playAt: number
  beat: number
}

export function countInSchedule(bpm: number | null, speed: number, leadMs: number = COUNT_IN_LEAD_MS): CountInSchedule {
  const beat = beatMs(bpm, speed)
  const beats = COUNT_IN_WORDS.map((_, i) => Math.round((leadMs + i * beat) * 10) / 10)
  return { beats, playAt: Math.round((leadMs + COUNT_IN_WORDS.length * beat) * 10) / 10, beat }
}
