/**
 * The practice log behind the grown-ups' week: by day, seconds spent practising, the ladder steps she
 * ticked and the sections she marked shaky. These change a save draft (inside store.update()).
 * Only a few months are kept, so the save stays small.
 */
import { emptyActivity, type DayActivity, type SaveData } from '../storage/schema'
import { addDays } from './dates'

export const ACTIVITY_KEEP_DAYS = 120

function dayOf(d: SaveData, day: string): DayActivity {
  const cutoff = addDays(day, -ACTIVITY_KEEP_DAYS)
  for (const k of Object.keys(d.activity)) if (k < cutoff) delete d.activity[k]
  return (d.activity[day] ??= emptyActivity())
}

export function logSeconds(d: SaveData, day: string, seconds: number): void {
  dayOf(d, day).seconds += Math.max(0, Math.round(seconds))
}

export function logTick(d: SaveData, day: string, section: string, step: string): void {
  const a = dayOf(d, day)
  if (!a.ticks.some((t) => t.section === section && t.step === step)) a.ticks.push({ section, step })
}

export function logShaky(d: SaveData, day: string, section: string): void {
  const a = dayOf(d, day)
  if (!a.shaky.includes(section)) a.shaky.push(section)
}
