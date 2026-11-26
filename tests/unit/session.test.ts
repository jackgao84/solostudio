/**
 * The guided session (version 1.1): one "Start today's practice" walks through the day's blocks in
 * her order, skipping blocks already done. Practice blocks become one item per section (the next rung
 * of that ladder, or a check that is due); drills, run-throughs, performing for family and the
 * listening run are items of their own; warm-up, water and cool-down show their steps.
 * Before each item the iPad says what's next, e.g. "Next: Chorus, Dance, 75% speed", in words from
 * src/content.
 */
import { describe, expect, it } from 'vitest'
import { BLOCK_COPY, DRILL_COPY } from '../../src/content/blocks'
import { KID_COPY } from '../../src/content/kid'
import { addDays } from '../../src/model/dates'
import { planDay, planInputFrom, type Block, type PlanDay } from '../../src/model/plan'
import { cueFor, sessionItems } from '../../src/model/session'
import { SKILL_LESSON_IDS, defaultSave, emptyProgress, type SaveData } from '../../src/storage/schema'

const TODAY = '2031-03-03'

function save(showInDays: number): SaveData {
  const d = defaultSave()
  d.setup.complete = true
  d.show = { name: 'Showcase', date: addDays(TODAY, showInDays) }
  d.plan = { startDate: TODAY, holidayStart: null, holidayEnd: null, schoolMinutes: 45, holidayMinutes: 120, lightWeekday: 4 }
  d.sections = ['Verse 1', 'Chorus', 'Dance Break'].map((name, i) => ({ id: `s${i + 1}`, name, lines: [], track: { start: 2 + i * 8, end: 9 + i * 8 }, refs: {}, createdAt: `2031-01-0${i + 1}T00:00:00.000Z` }))
  // Version 1.2: she has heard the skill lessons, so this is about the day's blocks.
  d.lessons.done = [...SKILL_LESSON_IDS]
  return d
}

function today(d: SaveData): PlanDay {
  return planDay(planInputFrom(d)!, TODAY)!
}

describe('the guided session', () => {
  it('walks the day’s blocks in order: warm-up first, cool-down last', () => {
    const d = save(30)
    const day = today(d)
    const items = sessionItems(d, day, TODAY)
    expect(items[0]).toMatchObject({ kind: 'routine', blockId: day.blocks[0].id })
    expect(items[items.length - 1]).toMatchObject({ kind: 'routine', blockId: day.blocks[day.blocks.length - 1].id })
    // Every block appears, in order.
    const blockOrder = [...new Set(items.map((i) => i.blockId))]
    expect(blockOrder).toEqual(day.blocks.map((b) => b.id))
  })

  it('turns a practice block into the next rung for each of its sections', () => {
    const d = save(30)
    d.progress.s1 = { ...emptyProgress(), rap: { done: ['rap-listen'], fade: 0, finishedAt: null, review: null } }
    const day = today(d)
    const rap = day.blocks.find((b) => b.type === 'rap')!
    const items = sessionItems(d, day, TODAY).filter((i) => i.blockId === rap.id)
    expect(items.length).toBeGreaterThan(0)
    for (const it of items) expect(it.kind).toBe('practice')
    const first = items[0]
    if (first.kind !== 'practice') throw new Error('practice')
    expect(first.sectionId).toBe(rap.sectionIds[0])
    expect(first.stepId).toBe(first.sectionId === 's1' ? 'rap-say' : 'rap-listen')
  })

  it('follows her own order and skips blocks she has done', () => {
    const d = save(30)
    const day = today(d)
    const movable = day.blocks.filter((b) => !['warmup', 'water', 'cooldown'].includes(b.type))
    const order = day.blocks.map((b) => b.id)
    const [a, b] = [order.indexOf(movable[0].id), order.indexOf(movable[1].id)]
    ;[order[a], order[b]] = [order[b], order[a]]
    d.days[TODAY] = { order, done: [day.blocks[0].id] }
    const items = sessionItems(d, day, TODAY)
    expect(items.some((i) => i.blockId === day.blocks[0].id)).toBe(false)
    expect([...new Set(items.map((i) => i.blockId))]).toEqual(order.slice(1))
  })

  it('has drills, run-throughs, performing for family and the listening run as items of their own', () => {
    const together = save(8)
    const tday = today(together)
    const kinds = new Map(sessionItems(together, tday, TODAY).map((i) => [i.blockId, i]))
    for (const b of tday.blocks.filter((x: Block) => x.drill)) expect(kinds.get(b.id)).toMatchObject({ kind: 'drill', drill: b.drill })
    for (const b of tday.blocks.filter((x: Block) => x.type === 'runthrough')) expect(kinds.get(b.id)).toMatchObject({ kind: 'showtime', family: false })
    const ready = save(3)
    const rday = today(ready)
    const fam = rday.blocks.find((b) => b.type === 'family')
    if (fam) expect(sessionItems(ready, rday, TODAY).find((i) => i.blockId === fam.id)).toMatchObject({ kind: 'showtime', family: true })
    const light = save(30)
    light.plan!.lightWeekday = new Date(2031, 2, 3).getDay()
    const lday = today(light)
    const listen = lday.blocks.find((b) => b.type === 'listen')!
    expect(sessionItems(light, lday, TODAY).find((i) => i.blockId === listen.id)).toMatchObject({ kind: 'listen' })
  })
})

describe('what the iPad says before each item', () => {
  const d = save(30)
  const day = today(d)
  const items = sessionItems(d, day, TODAY)

  it('names the section, the ladder and the speed for practice: "Next: Chorus, Dance, 75% speed"', () => {
    const p = items.find((i) => i.kind === 'practice' && i.stepId === 'dance-follow-75')
    const item = p ?? { kind: 'practice' as const, blockId: 'x', sectionId: 's2', stepId: 'dance-follow-75', check: false }
    expect(cueFor(item, d)).toBe('Next: Chorus, Dance, 75% speed')
  })

  it('names the block otherwise: "Next: Warm-up", "Next: Start anywhere"', () => {
    expect(cueFor(items[0], d)).toBe(`Next: ${BLOCK_COPY.warmup.title}`)
    expect(cueFor({ kind: 'drill', blockId: 'x', drill: 'anywhere' }, d)).toBe(`Next: ${DRILL_COPY.anywhere.title}`)
    expect(cueFor({ kind: 'listen', blockId: 'x' }, d)).toBe(`Next: ${BLOCK_COPY.listen.title}`)
  })

  it('uses the words in src/content', () => {
    expect(KID_COPY.cues.nextStep).toBe('Next: {section}, {ladder}, {speed}% speed')
    expect(KID_COPY.cues.nextBlock).toBe('Next: {block}')
  })
})
