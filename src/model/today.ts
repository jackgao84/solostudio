/**
 * Today's practice (version 1.2): the plan's day when a grown-up has set the dates; before that, a
 * day made from her lesson path: a warm-up, the next section lessons in path order (about eight
 * minutes each), water breaks where the voice and water rules need them, and a cool-down. Setting
 * dates is optional, so she can start as soon as her track, lines and section starts are in.
 */
import { DEFAULT_SCHOOL_MINUTES, type SaveData } from '../storage/schema'
import { isDone, lessonPath } from './path'
import { WATER_EVERY_MIN, WATER_MIN, VOICE_LIMIT_MIN, isVoice, planDay, planInputFrom, type Block, type BlockType, type PlanDay } from './plan'

export const FREE_WARMUP_MIN = 5
export const FREE_COOLDOWN_MIN = 5
export const FREE_LESSON_MIN = 8

export function todayPlan(save: SaveData, date: string): PlanDay | null {
  const input = planInputFrom(save)
  if (input) return planDay(input, date < input.startDate ? input.startDate : date)
  return freeDay(save, date)
}

/** A day from the lesson path, for when no dates are set yet. */
export function freeDay(save: SaveData, date: string): PlanDay | null {
  if (!save.sections.length) return null
  const sectionItems = lessonPath(save).filter((i) => i.kind === 'section')
  const open = sectionItems.filter((i) => !isDone(save, i))
  const queue = (open.length ? open : sectionItems).slice()
  const practiseMin = DEFAULT_SCHOOL_MINUTES - FREE_WARMUP_MIN - FREE_COOLDOWN_MIN - WATER_MIN * 2
  const blocks: Block[] = []
  let n = 0
  const add = (type: BlockType, minutes: number, sectionIds: string[] = []) => blocks.push({ id: `${date}-free${n++}-${type}`, type, minutes, sectionIds, headset: false })
  add('warmup', FREE_WARMUP_MIN)
  let sinceWater = FREE_WARMUP_MIN
  let voiceRun = 0
  let practised = 0
  while (queue.length && practised < practiseMin) {
    const item = queue.shift()!
    if (item.kind !== 'section') continue
    const type: BlockType = item.ladder
    if (sinceWater + FREE_LESSON_MIN > WATER_EVERY_MIN || (isVoice(type) && voiceRun + FREE_LESSON_MIN > VOICE_LIMIT_MIN)) {
      add('water', WATER_MIN)
      sinceWater = 0
      voiceRun = 0
    }
    add(type, FREE_LESSON_MIN, [item.sectionId])
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
