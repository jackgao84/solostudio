/**
 * The plan builder: phases counted back from the show, each day's blocks (warm-up, rap, dance, water
 * breaks, together, run-throughs, cool-down), the voice limit, light days, headset reminders, her
 * reordering, and resetting the plan for a new show.
 */
import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, weekdayOf } from '../../src/model/dates'
import {
  LEARN_UNTIL_DAYS_OUT,
  SHOW_READY_DAYS,
  VOICE_LIMIT_MIN,
  VOICE_TYPES,
  WATER_MAX_GAP_MIN,
  applyOrder,
  buildPlan,
  moveBlock,
  phaseFor,
  planDay,
  planInputFrom,
  voiceRuns,
  waterGaps,
  type Block,
  type BlockType,
  type PlanDay,
  type PlanInput,
} from '../../src/model/plan'
import { resetForNewShow } from '../../src/model/shows'
import { defaultSave, emptyProgress, type SaveData } from '../../src/storage/schema'

const SECTIONS = ['intro', 'v1', 'pre', 'chorus', 'v2', 'break']

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    startDate: '2031-03-03',
    showDate: '2031-04-12',
    holidayStart: '2031-03-29',
    holidayEnd: null,
    schoolMinutes: 45,
    holidayMinutes: 120,
    lightWeekday: 0,
    sectionIds: SECTIONS,
    ...over,
  }
}

/** A spread of plans: lengths, minutes, light weekdays, section counts, holidays. */
function variety(): PlanInput[] {
  const out: PlanInput[] = []
  for (const days of [3, 6, 9, 12, 20, 40, 75]) {
    for (const [school, holiday] of [
      [30, 60],
      [45, 120],
      [40, 90],
      [60, 150],
    ]) {
      for (const light of [0, 3]) {
        for (const n of [0, 1, 4, 9]) {
          const startDate = '2031-05-05'
          const showDate = addDays(startDate, days)
          out.push({
            startDate,
            showDate,
            holidayStart: addDays(startDate, Math.floor(days / 2)),
            holidayEnd: days > 30 ? addDays(startDate, days - 5) : null,
            schoolMinutes: school,
            holidayMinutes: holiday,
            lightWeekday: light,
            sectionIds: Array.from({ length: n }, (_, i) => `s${i}`),
          })
        }
      }
    }
  }
  return out
}

const sum = (blocks: Block[]) => blocks.reduce((a, b) => a + b.minutes, 0)
const minutesOf = (day: PlanDay, type: BlockType) => sum(day.blocks.filter((b) => b.type === type))
const has = (day: PlanDay, type: BlockType) => day.blocks.some((b) => b.type === type)

describe('phases counted back from the show', () => {
  it('learn until eleven days out, together from ten, show-ready for the last four, then show day', () => {
    expect(LEARN_UNTIL_DAYS_OUT).toBe(11)
    expect(SHOW_READY_DAYS).toBe(4)
    expect(phaseFor(40)).toBe('learn')
    expect(phaseFor(11)).toBe('learn')
    expect(phaseFor(10)).toBe('together')
    expect(phaseFor(5)).toBe('together')
    expect(phaseFor(4)).toBe('showReady')
    expect(phaseFor(1)).toBe('showReady')
    expect(phaseFor(0)).toBe('showDay')
  })

  it('has one day for every date from the start to the show', () => {
    const plan = buildPlan(input())
    expect(plan.length).toBe(daysBetween('2031-03-03', '2031-04-12') + 1)
    plan.forEach((d, i) => {
      expect(d.date).toBe(addDays('2031-03-03', i))
      expect(d.daysToShow).toBe(daysBetween(d.date, '2031-04-12'))
      expect(d.phase).toBe(phaseFor(d.daysToShow))
    })
    expect(plan[plan.length - 1].phase).toBe('showDay')
  })

  it('is the same plan every time for the same settings', () => {
    expect(buildPlan(input())).toEqual(buildPlan(input()))
  })

  it('finds a single day, and nothing outside the plan', () => {
    const plan = buildPlan(input())
    expect(planDay(input(), '2031-03-20')).toEqual(plan.find((d) => d.date === '2031-03-20'))
    expect(planDay(input(), '2031-03-02')).toBeNull()
    expect(planDay(input(), '2031-04-13')).toBeNull()
  })

  it('has nothing to plan once the show has passed', () => {
    expect(buildPlan(input({ startDate: '2031-04-20' }))).toEqual([])
  })

  it('a short run-up skips straight to the later phases', () => {
    const plan = buildPlan(input({ startDate: '2031-04-05' }))
    expect(plan[0].phase).toBe('together')
    expect(plan.some((d) => d.phase === 'learn')).toBe(false)
  })
})

describe('every day, whatever the settings', () => {
  const plans = variety().map((i) => ({ input: i, days: buildPlan(i) }))

  it('adds up to the day’s minutes, starts with a warm-up and ends with a cool-down', () => {
    for (const { days } of plans) for (const d of days) {
      expect(sum(d.blocks), d.date).toBe(d.minutes)
      expect(d.blocks[0].type).toBe('warmup')
      expect(d.blocks[d.blocks.length - 1].type).toBe('cooldown')
      for (const b of d.blocks) expect(b.minutes, `${d.date} ${b.type}`).toBeGreaterThanOrEqual(2)
      expect(new Set(d.blocks.map((b) => b.id)).size).toBe(d.blocks.length)
    }
  })

  it(`never asks for more than ${VOICE_LIMIT_MIN} minutes of voice in a row`, () => {
    expect(VOICE_LIMIT_MIN).toBe(20)
    expect([...VOICE_TYPES].sort()).toEqual(['family', 'rap', 'runthrough', 'together'])
    for (const { days } of plans) for (const d of days) {
      for (const run of voiceRuns(d.blocks)) expect(run, `${d.date}: ${d.blocks.map((b) => `${b.type}${b.minutes}`).join(' ')}`).toBeLessThanOrEqual(VOICE_LIMIT_MIN)
    }
  })

  it('has a water break about every 25 minutes', () => {
    expect(WATER_MAX_GAP_MIN).toBe(30)
    for (const { days } of plans) for (const d of days) {
      const gaps = waterGaps(d.blocks)
      for (const g of gaps) expect(g, `${d.date}: ${d.blocks.map((b) => `${b.type}${b.minutes}`).join(' ')}`).toBeLessThanOrEqual(WATER_MAX_GAP_MIN)
      if (d.minutes > WATER_MAX_GAP_MIN) expect(has(d, 'water'), d.date).toBe(true)
    }
  })

  it('uses the holiday minutes in the holidays and the school-day minutes otherwise', () => {
    for (const { input: i, days } of plans) for (const d of days) {
      const holiday = !!i.holidayStart && d.date >= i.holidayStart && d.date <= (i.holidayEnd ?? i.showDate)
      expect(d.holiday, d.date).toBe(holiday)
      const normal = holiday ? i.holidayMinutes : i.schoolMinutes
      if (d.light) {
        expect(d.minutes).toBeLessThan(normal)
        expect(d.minutes).toBeGreaterThanOrEqual(15)
      } else expect(d.minutes).toBe(normal)
    }
  })

  it('has a lighter day every week, the day before the show and on show day', () => {
    for (const { input: i, days } of plans) {
      for (const d of days) {
        if (weekdayOf(d.date) === i.lightWeekday || d.daysToShow <= 1) expect(d.light, d.date).toBe(true)
        else expect(d.light, d.date).toBe(false)
      }
      for (let k = 0; k + 7 <= days.length; k++) expect(days.slice(k, k + 7).some((d) => d.light)).toBe(true)
    }
  })

  it('reminds her to wear her headset mic or a headband from the middle phase on', () => {
    for (const { days } of plans) for (const d of days) {
      if (d.phase === 'learn') {
        expect(d.headset).toBe(false)
        for (const b of d.blocks) expect(b.headset).toBe(false)
      } else {
        expect(d.headset).toBe(true)
        for (const b of d.blocks) expect(b.headset, `${d.date} ${b.type}`).toBe(VOICE_TYPES.includes(b.type) || b.type === 'dance')
      }
    }
  })
})

describe('what each phase practises', () => {
  const plan = buildPlan(input())
  const learn = plan.filter((d) => d.phase === 'learn')

  it('starts rap and the first dance section on day one', () => {
    const day1 = plan[0]
    expect(day1.phase).toBe('learn')
    expect(has(day1, 'rap')).toBe(true)
    expect(has(day1, 'dance')).toBe(true)
    expect(day1.focus.rap).toContain('intro')
    expect(day1.focus.dance).toEqual(['intro'])
    for (const b of day1.blocks.filter((b) => b.type === 'dance')) expect(b.sectionIds).toEqual(['intro'])
  })

  it('gives the dance more time than the rap while learning, because it is the longer job', () => {
    for (const d of learn) {
      expect(has(d, 'rap'), d.date).toBe(true)
      expect(has(d, 'dance'), d.date).toBe(true)
      expect(minutesOf(d, 'dance'), d.date).toBeGreaterThan(minutesOf(d, 'rap'))
      expect(has(d, 'together') || has(d, 'runthrough') || has(d, 'family')).toBe(false)
    }
  })

  it('brings in every section, in song order, with time to learn the last one slowly before ten days out', () => {
    const firstDance = SECTIONS.map((id) => learn.findIndex((d) => d.focus.dance.includes(id)))
    const firstRap = SECTIONS.map((id) => learn.findIndex((d) => d.focus.rap.includes(id)))
    for (let k = 0; k < SECTIONS.length; k++) {
      expect(firstDance[k], SECTIONS[k]).toBeGreaterThanOrEqual(0)
      expect(firstRap[k], SECTIONS[k]).toBeGreaterThanOrEqual(0)
      expect(firstRap[k], `rap before dance for ${SECTIONS[k]}`).toBeLessThanOrEqual(firstDance[k])
      if (k > 0) expect(firstDance[k]).toBeGreaterThanOrEqual(firstDance[k - 1])
    }
    expect(firstDance[0]).toBe(0)
    expect(learn.length - firstDance[SECTIONS.length - 1], 'learn days left for the last section').toBeGreaterThanOrEqual(5)
  })

  it('learns several sections a day when the run-up is short', () => {
    const short = buildPlan(input({ startDate: '2031-03-29' })).filter((d) => d.phase === 'learn')
    expect(short.length).toBe(4)
    const seen = new Set(short.flatMap((d) => d.focus.dance))
    expect(seen.size).toBe(SECTIONS.length)
  })

  it('puts rap and dance together after that, section by section', () => {
    const together = plan.filter((d) => d.phase === 'together')
    expect(together.length).toBe(6)
    for (const d of together) expect(has(d, 'together'), d.date).toBe(true)
    expect(new Set(together.flatMap((d) => d.focus.together))).toEqual(new Set(SECTIONS))
  })

  it('has full run-throughs and performing for family in the last four days, and a lighter day before the show', () => {
    const ready = plan.filter((d) => d.phase === 'showReady')
    expect(ready.map((d) => d.daysToShow)).toEqual([4, 3, 2, 1])
    for (const d of ready) expect(has(d, 'runthrough'), d.date).toBe(true)
    for (const d of ready.filter((d) => !d.light)) expect(has(d, 'family'), d.date).toBe(true)
    const dayBefore = ready[3]
    expect(dayBefore.light).toBe(true)
    expect(has(dayBefore, 'family')).toBe(false)
  })

  it('keeps show day light', () => {
    const show = plan[plan.length - 1]
    expect(show.light).toBe(true)
    expect(show.minutes).toBeLessThanOrEqual(25)
    expect(has(show, 'runthrough') || has(show, 'family')).toBe(false)
  })

  it('still builds days before any sections are added', () => {
    const empty = buildPlan(input({ sectionIds: [] }))
    expect(empty.length).toBe(plan.length)
    for (const d of empty) {
      expect(d.focus).toEqual({ rap: [], dance: [], together: [] })
      expect(sum(d.blocks)).toBe(d.minutes)
    }
  })
})

describe('her own order for the day', () => {
  const b = (id: string, type: BlockType, minutes: number): Block => ({ id, type, minutes, sectionIds: [], headset: false })
  const day = [b('warm', 'warmup', 5), b('rap', 'rap', 10), b('d1', 'dance', 12), b('w1', 'water', 2), b('tog', 'together', 12), b('d2', 'dance', 6), b('run', 'runthrough', 10), b('cool', 'cooldown', 2)]
  const ids = (blocks: Block[]) => blocks.map((x) => x.id)

  it('moves a block past its neighbour when the day still keeps her voice safe', () => {
    const moved = moveBlock(day, 'rap', 1)
    expect(moved.ok).toBe(true)
    if (moved.ok) expect(ids(moved.blocks)).toEqual(['warm', 'd1', 'rap', 'w1', 'tog', 'd2', 'run', 'cool'])
  })

  it('keeps the warm-up first, the cool-down last and the water breaks in place', () => {
    for (const id of ['warm', 'w1', 'cool']) {
      expect(moveBlock(day, id, 1)).toEqual({ ok: false, reason: 'pinned' })
      expect(moveBlock(day, id, -1)).toEqual({ ok: false, reason: 'pinned' })
    }
    expect(moveBlock(day, 'rap', -1)).toEqual({ ok: false, reason: 'edge' })
    expect(moveBlock(day, 'run', 1)).toEqual({ ok: false, reason: 'edge' })
  })

  it(`refuses a move that would put more than ${VOICE_LIMIT_MIN} minutes of voice in a row`, () => {
    expect(moveBlock(day, 'd2', -1)).toEqual({ ok: false, reason: 'voice' })
    expect(moveBlock(day, 'run', -1)).toEqual({ ok: false, reason: 'voice' })
    // Across a water break: rap then together would be 22 minutes of voice.
    expect(moveBlock(day, 'd1', 1)).toEqual({ ok: false, reason: 'voice' })
  })

  it('refuses a move that would leave too long without water', () => {
    const d = [b('warm', 'warmup', 5), b('r', 'rap', 5), b('a', 'dance', 5), b('w', 'water', 2), b('big', 'dance', 21), b('r2', 'rap', 6), b('c', 'cooldown', 3)]
    expect(waterGaps(d)).toEqual([15, 30])
    expect(moveBlock(d, 'a', 1)).toEqual({ ok: false, reason: 'water' })
  })

  it('applies a saved order, and ignores one that no longer matches the day', () => {
    const order = ['warm', 'd1', 'rap', 'w1', 'tog', 'd2', 'run', 'cool']
    expect(ids(applyOrder(day, order))).toEqual(order)
    expect(ids(applyOrder(day, ['warm', 'rap']))).toEqual(ids(day))
    expect(ids(applyOrder(day, [...order.slice(0, -1), 'other']))).toEqual(ids(day))
  })

  it('counts voice runs and water gaps', () => {
    expect(voiceRuns(day)).toEqual([10, 12, 10])
    expect(waterGaps(day)).toEqual([27, 30])
  })
})

describe('plan settings from the save', () => {
  it('uses the show, the plan settings and the sections in song order', () => {
    const save: SaveData = defaultSave()
    expect(planInputFrom(save)).toBeNull()
    save.show = { name: 'Showcase', date: '2031-04-12' }
    save.plan = { startDate: '2031-03-03', holidayStart: null, holidayEnd: null, schoolMinutes: 45, holidayMinutes: 120, lightWeekday: 0 }
    save.sections = [
      { id: 'late', name: 'Late', lines: [], track: { start: 50, end: 60 }, refs: {}, createdAt: '2031-01-01T00:00:00.000Z' },
      { id: 'early', name: 'Early', lines: [], track: { start: 5, end: 15 }, refs: {}, createdAt: '2031-01-02T00:00:00.000Z' },
    ]
    expect(planInputFrom(save)).toEqual({ ...input({ holidayStart: null, sectionIds: ['early', 'late'] }) })
  })
})

describe('resetting the plan for a new show', () => {
  it('keeps everything she has learned, starts today and counts back from the new date', () => {
    const save: SaveData = defaultSave()
    save.show = { name: 'Showcase', date: '2031-04-12' }
    save.plan = { startDate: '2031-03-03', holidayStart: '2031-03-29', holidayEnd: null, schoolMinutes: 45, holidayMinutes: 120, lightWeekday: 0 }
    save.sections = [{ id: 'v1', name: 'Verse 1', lines: [], track: { start: 5, end: 15 }, refs: {}, createdAt: '2031-01-01T00:00:00.000Z' }]
    save.progress = { v1: { ...emptyProgress(), shaky: true, shakyDue: '2031-04-14' } }
    save.reflections = [{ id: 'r1', at: '2031-04-12T18:00:00.000Z', kind: 'showtime', target: 'run', wentWell: 'a', workOn: 'b' }]
    save.days = { '2031-04-10': { order: ['x'], done: ['x'] }, '2031-04-14': { order: ['y'], done: [] } }

    const today = '2031-04-13'
    const next = resetForNewShow(save, { name: 'Talent show', date: '2031-05-01' }, today)
    expect(next.show).toEqual({ name: 'Talent show', date: '2031-05-01' })
    expect(next.pastShows).toEqual([{ name: 'Showcase', date: '2031-04-12' }])
    expect(next.plan?.startDate).toBe(today)
    expect(next.plan?.schoolMinutes).toBe(45)
    expect(next.sections).toEqual(save.sections)
    expect(next.progress).toEqual(save.progress)
    expect(next.reflections).toEqual(save.reflections)
    expect(Object.keys(next.days)).toEqual(['2031-04-10'])
    // The old save is untouched.
    expect(save.show?.name).toBe('Showcase')

    const plan = buildPlan(planInputFrom(next)!)
    expect(plan[0].date).toBe(today)
    expect(plan[0].daysToShow).toBe(18)
    expect(plan[0].phase).toBe('learn')
    expect(plan[plan.length - 1].date).toBe('2031-05-01')
  })
})
