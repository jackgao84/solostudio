/**
 * The guided session (version 1.1): "Start today's practice" walks through the day's blocks in her
 * order, skipping the ones she has done. Warm-up, water and cool-down show their steps; a rap, dance
 * or together block becomes one item per section (the next rung of that ladder, or a check that is
 * due); drills, run-throughs, performing for family and the listening run are items of their own.
 * Before each item the iPad says what's next, e.g. "Next: Chorus, Dance, 75% speed".
 */
import { BLOCK_COPY, DRILL_COPY } from '../content/blocks'
import { KID_COPY } from '../content/kid'
import { LADDER_COPY } from '../content/ladders'
import { LESSONS } from '../content/lessons'
import type { LadderId, SaveData, SkillLessonId } from '../storage/schema'
import { fill } from '../ui/dom'
import { LADDERS, stepById } from './ladders'
import { applyOrder, type Block, type BlockType, type Drill, type PlanDay } from './plan'
import { skillsDue, type Need } from './path'
import { dueItems, nextStep, progressOf } from './progress'

export type SessionItem =
  | { kind: 'routine'; blockId: string; type: BlockType }
  | { kind: 'practice'; blockId: string; sectionId: string; stepId: string; check: boolean }
  | { kind: 'drill'; blockId: string; drill: Drill }
  | { kind: 'showtime'; blockId: string; family: boolean }
  | { kind: 'listen'; blockId: string }
  | { kind: 'empty'; blockId: string; type: BlockType }
  /** A skill lesson due before this block's practice (version 1.2). */
  | { kind: 'lesson'; blockId: string; lessonId: SkillLessonId }

export const LADDER_OF: Partial<Record<BlockType, LadderId>> = { rap: 'rap', dance: 'dance', together: 'together' }

/**
 * What a rap, dance or together block practises: for each of its sections (and any section with a
 * check due on that ladder, first), the next rung, or the last rung again once all are ticked.
 */
export function practiceChoices(save: SaveData, block: Pick<Block, 'type' | 'sectionIds'>, today: string): { sectionId: string; stepId: string; check: boolean; finished: boolean }[] {
  const ladder = LADDER_OF[block.type]
  if (!ladder) return []
  const ids = [...block.sectionIds]
  const due = dueItems(save.progress, ids.length ? save.sections.map((s) => s.id) : [], today).filter((i) => i.ladder === ladder)
  for (const item of due) if (!ids.includes(item.sectionId)) ids.unshift(item.sectionId)
  const list = ids.length ? ids : save.sections.slice(0, 1).map((s) => s.id)
  return list
    .filter((id) => save.sections.some((s) => s.id === id))
    .map((id) => {
      const next = nextStep(progressOf(save.progress, id), ladder)
      const step = next ?? LADDERS[ladder][LADDERS[ladder].length - 1]
      return { sectionId: id, stepId: step.id, check: !next && due.some((i) => i.sectionId === id), finished: !next }
    })
}

export function sessionItems(save: SaveData, day: PlanDay, today: string): SessionItem[] {
  const state = save.days[day.date] ?? { order: [], done: [] }
  const out: SessionItem[] = []
  // A skill lesson she hasn't done comes up once, just before the first thing that needs it.
  const given = new Set<SkillLessonId>()
  const lessonsFor = (need: Need, blockId: string) => {
    for (const id of skillsDue(save, need)) {
      if (given.has(id)) continue
      given.add(id)
      out.push({ kind: 'lesson', blockId, lessonId: id })
    }
  }
  for (const b of applyOrder(day.blocks, state.order)) {
    if (state.done.includes(b.id)) continue
    if (b.type === 'warmup' || b.type === 'water' || b.type === 'cooldown') out.push({ kind: 'routine', blockId: b.id, type: b.type })
    else if (b.drill) {
      lessonsFor('together', b.id)
      out.push({ kind: 'drill', blockId: b.id, drill: b.drill })
    } else if (b.type === 'runthrough' || b.type === 'family') {
      lessonsFor('showtime', b.id)
      out.push({ kind: 'showtime', blockId: b.id, family: b.type === 'family' })
    } else if (b.type === 'listen') out.push({ kind: 'listen', blockId: b.id })
    else {
      const choices = practiceChoices(save, b, today)
      if (!choices.length) out.push({ kind: 'empty', blockId: b.id, type: b.type })
      const ladder = LADDER_OF[b.type]
      if (choices.length && ladder) lessonsFor(ladder, b.id)
      for (const c of choices) out.push({ kind: 'practice', blockId: b.id, sectionId: c.sectionId, stepId: c.stepId, check: c.check })
    }
  }
  return out
}

/** What the iPad says before an item. */
export function cueFor(item: SessionItem, save: SaveData): string {
  const C = KID_COPY.cues
  switch (item.kind) {
    case 'practice': {
      const step = stepById(item.stepId)
      const section = save.sections.find((s) => s.id === item.sectionId)
      if (!step || !section) return ''
      return fill(C.nextStep, { section: section.name, ladder: LADDER_COPY[step.ladder].name, speed: Math.round(step.speed * 100) })
    }
    case 'routine':
    case 'empty':
      return fill(C.nextBlock, { block: BLOCK_COPY[item.type].title })
    case 'drill':
      return fill(C.nextBlock, { block: DRILL_COPY[item.drill].title })
    case 'showtime':
      return fill(C.nextBlock, { block: BLOCK_COPY[item.family ? 'family' : 'runthrough'].title })
    case 'listen':
      return fill(C.nextBlock, { block: BLOCK_COPY.listen.title })
    case 'lesson':
      return fill(C.nextBlock, { block: LESSONS.find((l) => l.id === item.lessonId)?.title ?? '' })
  }
}

/** The route each item opens on (with ?session=1, so the screen joins in). */
export function routeFor(item: SessionItem): string {
  switch (item.kind) {
    case 'practice':
      return `/practice/${item.sectionId}/${item.stepId}?session=1`
    case 'drill':
      return `/drill/${item.drill}?block=${encodeURIComponent(item.blockId)}&session=1`
    case 'showtime':
      return `/showtime?block=${encodeURIComponent(item.blockId)}${item.family ? '&family=1' : ''}&session=1`
    case 'lesson':
      return `/lesson/${item.lessonId}?session=1`
    default:
      return `/block/${encodeURIComponent(item.blockId)}?session=1`
  }
}
