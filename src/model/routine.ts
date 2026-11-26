/**
 * The Showtime routine (version 1.1), step by step:
 *   backstage breathing (a circle: 4 seconds in, 6 out, for the breaths a grown-up chose) →
 *   "I'm excited!" → the walk to her spot (a countdown long enough to get there from the iPad) →
 *   the opening pose, held for a spoken "5, 6, 7, 8" → her track from the top, no stopping →
 *   the ending pose → a bow → applause → walking off.
 * The walk-on and the bow can be practised on their own. Words come from src/content.
 */
import { KID_COPY } from '../content/kid'
import type { ShowtimeSettings } from '../storage/schema'
import { COUNT_IN_WORDS } from './countin'

export const BREATH_IN_S = 4
export const BREATH_OUT_S = 6
export const BREATH_S = BREATH_IN_S + BREATH_OUT_S
export const EXCITED_S = 4
export const END_POSE_S = 3
export const BOW_S = 3
export const APPLAUSE_S = 4
export const WALK_OFF_S = 4
/** Time for "Opening pose" to be said before its count starts. */
export const POSE_CUE_MS = 1400
/** The slowest a count-in beat can be (see countin.ts). */
const SLOWEST_BEAT_MS = 1000

export type RoutineStepId = 'breathe' | 'excited' | 'walk' | 'pose' | 'track' | 'endPose' | 'bow' | 'applause' | 'walkOff'

export interface RoutineStep {
  id: RoutineStepId
  /** How long it lasts; null when it depends on the music (the opening pose's count, her track). */
  seconds: number | null
  /** What the screen says. */
  words: string
  /** What is said out loud as the step starts (never during her track). */
  cue: string | null
  /** The count the opening pose is held for. */
  count?: readonly string[]
}

const S = KID_COPY.showtime

export function walkOnRoutine(st: ShowtimeSettings): RoutineStep[] {
  return [
    { id: 'walk', seconds: st.walkOnSeconds, words: S.walk, cue: S.walk },
    { id: 'pose', seconds: null, words: S.pose, cue: S.pose, count: COUNT_IN_WORDS },
  ]
}

export function bowRoutine(): RoutineStep[] {
  return [
    { id: 'endPose', seconds: END_POSE_S, words: S.endPose, cue: S.endPose },
    { id: 'bow', seconds: BOW_S, words: S.bow, cue: S.bow },
    { id: 'applause', seconds: APPLAUSE_S, words: S.applause, cue: null },
    { id: 'walkOff', seconds: WALK_OFF_S, words: S.walkOff, cue: S.walkOff },
  ]
}

export function showtimeRoutine(st: ShowtimeSettings): RoutineStep[] {
  return [
    { id: 'breathe', seconds: st.breaths * BREATH_S, words: S.backstage, cue: null },
    { id: 'excited', seconds: EXCITED_S, words: S.excited, cue: S.excited },
    ...walkOnRoutine(st),
    { id: 'track', seconds: null, words: '', cue: null },
    ...bowRoutine(),
  ]
}

/** Where she is in the breathing: which breath, in or out, and how far through that half (0–1). */
export function breathAt(seconds: number): { breath: number; phase: 'in' | 'out'; progress: number } {
  const s = Math.max(0, seconds)
  const breath = Math.floor(s / BREATH_S + 1e-9) + 1
  const into = s - (breath - 1) * BREATH_S
  return into < BREATH_IN_S - 1e-9 ? { breath, phase: 'in', progress: into / BREATH_IN_S } : { breath, phase: 'out', progress: (into - BREATH_IN_S) / BREATH_OUT_S }
}

/** The longest the routine can take before her track starts (with the slowest count). */
export function routineBeforeMaxMs(st: ShowtimeSettings): number {
  const steps = showtimeRoutine(st)
  const timed = steps.slice(0, steps.findIndex((s) => s.id === 'track')).reduce((a, s) => a + (s.seconds ?? 0), 0)
  return timed * 1000 + POSE_CUE_MS + COUNT_IN_WORDS.length * SLOWEST_BEAT_MS
}

/** How long the routine takes after her track ends. */
export const ROUTINE_AFTER_MS = (END_POSE_S + BOW_S + APPLAUSE_S + WALK_OFF_S) * 1000
