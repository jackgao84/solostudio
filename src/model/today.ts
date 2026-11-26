/**
 * Today's practice (version 1.2): the plan's day when a grown-up has set the dates; before that, a
 * day made from her lesson path: a warm-up, the next lessons in path order (about eight minutes
 * each), water breaks where the voice and water rules need them, and a cool-down. Setting dates is
 * optional.
 *
 * Version 1.3: practice needs no setup. While no grown-up sections exist, her own parts on the
 * mirrored follow-along are the dance lessons, each practised in the practice room; with no parts
 * yet, the day is a warm-up, one dance block that opens the practice room, and a cool-down. With
 * dates set and no sections, each dance (and together) block takes one of her open parts in turn.
 */
import { DEFAULT_SCHOOL_MINUTES, type SaveData } from '../storage/schema'
import { followAlongParts, isDone, lessonPath } from './path'
import { partFinished } from './room'
import { WATER_EVERY_MIN, WATER_MIN, VOICE_LIMIT_MIN, isVoice, planDay, planInputFrom, type Block, type BlockType, type PlanDay } from './plan'

export const FREE_WARMUP_MIN = 5
export const FREE_COOLDOWN_MIN = 5
export const FREE_LESSON_MIN = 8
/** The dance block in the practice room when she has no parts yet. */
export const FREE_ROOM_MIN = 15

export function todayPlan(save: SaveData, date: string): PlanDay | null {
  const input = planInputFrom(save)
  if (input) {
    const day = planDay(input, date < input.startDate ? input.startDate : date)
    return day && !save.sections.length ? withParts(save, day) : day
  }
  return freeDay(save, date)
}

/** With no grown-up sections: each dance or together block (not a drill) takes one of her open parts in turn. */
function withParts(save: SaveData, day: PlanDay): PlanDay {
  const parts = followAlongParts(save)
  const open = parts.filter((p) => !partFinished(p))
  const queue = open.length ? open : parts
  if (!queue.length) return day
  let n = 0
  const blocks = day.blocks.map((b) => ((b.type === 'dance' || b.type === 'together') && !b.drill ? { ...b, partIds: [queue[n++ % queue.length].id] } : b))
  return { ...day, blocks }
}

/** A day from the lesson path, for when no dates are set yet. */
export function freeDay(save: SaveData, date: string): PlanDay {
  const lessons = lessonPath(save).filter((i) => i.kind === 'section' || i.kind === 'part')
  const open = lessons.filter((i) => !isDone(save, i))
  const queue = (open.length ? open : lessons).slice()
  const practiseMin = DEFAULT_SCHOOL_MINUTES - FREE_WARMUP_MIN - FREE_COOLDOWN_MIN - WATER_MIN * 2
  const blocks: Block[] = []
  let n = 0
  const add = (type: BlockType, minutes: number, sectionIds: string[] = [], partIds?: string[]) =>
    blocks.push({ id: `${date}-free${n++}-${type}`, type, minutes, sectionIds, headset: false, ...(partIds ? { partIds } : {}) })
  add('warmup', FREE_WARMUP_MIN)
  // Nothing to practise yet: the practice room, on the mirrored follow-along.
  if (!queue.length) add('dance', FREE_ROOM_MIN)
  let sinceWater = FREE_WARMUP_MIN
  let voiceRun = 0
  let practised = 0
  while (queue.length && practised < practiseMin) {
    const item = queue.shift()!
    if (item.kind !== 'section' && item.kind !== 'part') continue
    const type: BlockType = item.kind === 'part' ? 'dance' : item.ladder
    if (sinceWater + FREE_LESSON_MIN > WATER_EVERY_MIN || (isVoice(type) && voiceRun + FREE_LESSON_MIN > VOICE_LIMIT_MIN)) {
      add('water', WATER_MIN)
      sinceWater = 0
      voiceRun = 0
    }
    if (item.kind === 'part') add(type, FREE_LESSON_MIN, [], [item.partId])
    else add(type, FREE_LESSON_MIN, [item.sectionId])
    sinceWater += FREE_LESSON_MIN
    voiceRun = isVoice(type) ? voiceRun + FREE_LESSON_MIN : 0
    practised += FREE_LESSON_MIN
  }
  add('cooldown', FREE_COOLDOWN_MIN)
  const of = (t: BlockType) => blocks.filter((b) => b.type === t).flatMap((b) => b.sectionIds)
  return {
    date,
    daysToShow: Number.POSITIVE_INFINITY,
    phase: 'learn',
    light: false,
    holiday: false,
    minutes: blocks.reduce((a, b) => a + b.minutes, 0),
    blocks,
    headset: false,
    focus: { rap: of('rap'), dance: of('dance'), together: of('together') },
  }
}
