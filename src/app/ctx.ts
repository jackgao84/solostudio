/** Shortcuts screens share: the save, today's date, navigation, the grown-ups' unlock. */
import { today as todayKey } from '../model/dates'
import { orderSections } from '../model/timing'
import type { SaveData, Section } from '../storage/schema'
import { store } from '../storage/store'

export const save = (): SaveData => store().data
export const update = (fn: (d: SaveData) => void): void => store().update(fn)
export const today = (): string => todayKey()

export function go(path: string): void {
  const next = `#${path}`
  if (window.location.hash === next) window.dispatchEvent(new HashChangeEvent('hashchange'))
  else window.location.hash = next
}

export function sectionById(id: string): Section | null {
  return save().sections.find((s) => s.id === id) ?? null
}

export function sectionsInOrder(): Section[] {
  return orderSections(save().sections)
}

// The grown-ups' area unlocks in memory only: a reload or leaving it locks it again.
let unlocked = false
export const unlockGrownups = (): void => {
  unlocked = true
}
export const lockGrownups = (): void => {
  unlocked = false
}
export const grownupsUnlocked = (): boolean => unlocked

/** The block she is in (its timer keeps running while she practises from it). */
export interface ActiveBlock {
  id: string
  date: string
  startedAt: number
}
let activeBlock: ActiveBlock | null = null
export const getActiveBlock = (): ActiveBlock | null => activeBlock
export const setActiveBlock = (b: ActiveBlock | null): void => {
  activeBlock = b
}
