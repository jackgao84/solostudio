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

export interface GetReadySchedule {
  /** Said as the countdown starts. */
  cue: string
  /** The walk-on countdown: each number and when it shows (ms from the start). */
  countdown: { n: number; at: number }[]
  words: readonly string[]
  /** When to say each count-in word. */
  beats: number[]
  /** When the recording and the music start (on the 1). */
  recordAt: number
}

/**
 * Before any filming (version 1.2): "Get to your spot" with a countdown of the walk-on time, then
 * "5, 6, 7, 8" on the beat, and the recording starts on the 1.
 */
export function getReadySchedule(walkOnSeconds: number, bpm: number | null, speed: number): GetReadySchedule {
  const walk = Math.max(1, Math.round(walkOnSeconds))
  const countdown = Array.from({ length: walk }, (_, i) => ({ n: walk - i, at: i * 1000 }))
  const ins = countInSchedule(bpm, speed, walk * 1000)
  return { cue: KID_COPY.cues.getToSpot, countdown, words: COUNT_IN_WORDS, beats: ins.beats, recordAt: ins.playAt }
}
