/**
 * Small celebrations, only ever for doing things (version 1.1): a stage light (and its switch-on
 * sound) for each step she ticks, a cheer when that step finishes a ladder, and confetti for her
 * first full Showtime. They depend on what she did, never on how well she did it.
 */
import type { LadderId, SaveData, SectionProgress } from '../storage/schema'
import { LADDERS } from './ladders'

export type Celebration = 'lightOn' | 'ladderDone'

/** What ticking `stepId` celebrates, given the progress before the tick. */
export function celebrationsForTick(before: SectionProgress, ladder: LadderId, stepId: string): Celebration[] {
  if (before[ladder].done.includes(stepId)) return []
  const after = [...before[ladder].done, stepId]
  return LADDERS[ladder].every((s) => after.includes(s.id)) ? ['lightOn', 'ladderDone'] : ['lightOn']
}

/** Her first full Showtime gets confetti, once. */
export function celebrateShowtime(save: SaveData): boolean {
  return !save.celebrated.firstShowtime
}
