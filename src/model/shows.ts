/** Resetting the plan for a new show (the talent show after the showcase). Everything she learned stays. */
import type { SaveData, Show } from '../storage/schema'

export function resetForNewShow(save: SaveData, show: Show, today: string): SaveData {
  const next = JSON.parse(JSON.stringify(save)) as SaveData
  if (next.show) next.pastShows.push(next.show)
  next.show = { name: show.name, date: show.date }
  if (next.plan) next.plan.startDate = today
  for (const date of Object.keys(next.days)) if (date >= today) delete next.days[date]
  return next
}
