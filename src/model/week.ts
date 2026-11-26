/**
 * The grown-ups' week: the last 7 days (today included) at a glance. Days practised (a minute or
 * more of practice, a ticked step, a finished block or a reflection), minutes practised, the ladder
 * steps she ticked per section (in song order), sections marked shaky this week or shaky now, and her
 * "one thing" notes. Counts of what she did, never how well.
 */
import type { LadderId, Reflection, SaveData } from '../storage/schema'
import { addDays, dayKey } from './dates'
import { stepById } from './ladders'
import { orderSections } from './timing'

export interface WeekSummary {
  from: string
  to: string
  days: { date: string; minutes: number; steps: number; practised: boolean }[]
  daysPractised: number
  minutes: number
  bySection: { id: string; name: string; steps: number; ladders: Record<LadderId, number> }[]
  shaky: { id: string; name: string; markedThisWeek: boolean; shakyNow: boolean }[]
  notes: { date: string; kind: Reflection['kind']; wentWell: string; workOn: string }[]
}

const localDay = (iso: string): string => {
  const t = new Date(iso)
  return Number.isNaN(t.getTime()) ? '' : dayKey(t)
}

export function weekSummary(save: SaveData, today: string): WeekSummary {
  const from = addDays(today, -6)
  const dates = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const reflectionDays = new Set(save.reflections.map((r) => localDay(r.at)))
  const days = dates.map((date) => {
    const a = save.activity[date]
    const seconds = a?.seconds ?? 0
    const steps = a?.ticks.length ?? 0
    const practised = seconds >= 60 || steps > 0 || (save.days[date]?.done.length ?? 0) > 0 || reflectionDays.has(date)
    return { date, minutes: Math.round(seconds / 60), steps, practised, seconds }
  })
  const ticks = dates.flatMap((date) => save.activity[date]?.ticks ?? [])
  const marked = new Set(dates.flatMap((date) => save.activity[date]?.shaky ?? []))
  const sections = orderSections(save.sections)
  return {
    from,
    to: today,
    days: days.map(({ seconds: _s, ...d }) => d),
    daysPractised: days.filter((d) => d.practised).length,
    minutes: Math.round(days.reduce((a, d) => a + d.seconds, 0) / 60),
    bySection: sections.map((s) => {
      const mine = ticks.filter((t) => t.section === s.id)
      const ladders: Record<LadderId, number> = { rap: 0, dance: 0, together: 0 }
      for (const t of mine) {
        const l = stepById(t.step)?.ladder
        if (l) ladders[l]++
      }
      return { id: s.id, name: s.name, steps: mine.length, ladders }
    }),
    shaky: sections
      .filter((s) => marked.has(s.id) || save.progress[s.id]?.shaky)
      .map((s) => ({ id: s.id, name: s.name, markedThisWeek: marked.has(s.id), shakyNow: !!save.progress[s.id]?.shaky })),
    notes: save.reflections
      .map((r) => ({ date: localDay(r.at), kind: r.kind, wentWell: r.wentWell, workOn: r.workOn, at: r.at }))
      .filter((r) => r.date >= from && r.date <= today)
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .map(({ at: _at, ...r }) => r),
  }
}
