/**
 * Her stage (version 1.1): each section is a lighting rig with a light for every ladder step. A step
 * she has ticked switches its light on, so her progress map is the stage filling up. On show day
 * every light is on, whatever is ticked. Lights count what she did; nothing here measures how well.
 */
import { KID_COPY } from '../content/kid'
import type { LadderId, SaveData } from '../storage/schema'
import { fill } from '../ui/dom'
import { LADDERS, LADDER_IDS } from './ladders'
import { progressOf } from './progress'
import { orderSections } from './timing'

export interface Rig {
  sectionId: string
  name: string
  lights: { ladder: LadderId; stepId: string; on: boolean }[]
}

export function stageRigs(save: SaveData, today: string): { rigs: Rig[]; allOn: boolean } {
  const allOn = !!save.show && save.show.date === today
  const rigs = orderSections(save.sections).map((s) => {
    const p = progressOf(save.progress, s.id)
    return {
      sectionId: s.id,
      name: s.name,
      lights: LADDER_IDS.flatMap((ladder) => LADDERS[ladder].map((step) => ({ ladder, stepId: step.id, on: allOn || p[ladder].done.includes(step.id) }))),
    }
  })
  return { rigs, allOn }
}

/** "D-12", then "D-DAY" on the day; nothing once it has passed. */
export function ddayLabel(daysToShow: number): string | null {
  if (daysToShow < 0) return null
  return daysToShow === 0 ? KID_COPY.today.ddayToday : fill(KID_COPY.today.dday, { days: daysToShow })
}
