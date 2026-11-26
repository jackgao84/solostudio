/**
 * The listening run (version 1.1): on light days the plan has a short block where her track plays
 * with the lyrics hidden and she imagines performing it with her eyes closed. It comes after the
 * day's practice and before the cool-down, rests her voice (it is not a voice block, and needs no
 * headset), and is never on other days.
 */
import { describe, expect, it } from 'vitest'
import { BLOCK_COPY } from '../../src/content/blocks'
import { addDays } from '../../src/model/dates'
import { LISTEN_MIN, buildPlan, isVoice, type PlanInput } from '../../src/model/plan'

const PRACTICE = ['rap', 'dance', 'together', 'runthrough', 'family']

function variety(): PlanInput[] {
  const out: PlanInput[] = []
  for (const days of [3, 9, 20, 40])
    for (const [school, holiday] of [
      [30, 60],
      [45, 120],
      [60, 150],
    ])
      for (const light of [0, 2, 5])
        for (const n of [0, 3, 8]) {
          const startDate = '2031-05-05'
          out.push({
            startDate,
            showDate: addDays(startDate, days),
            holidayStart: addDays(startDate, Math.floor(days / 2)),
            holidayEnd: null,
            schoolMinutes: school,
            holidayMinutes: holiday,
            lightWeekday: light,
            sectionIds: Array.from({ length: n }, (_, i) => `s${i}`),
          })
        }
  return out
}

describe('the listening run', () => {
  const days = variety().flatMap((i) => buildPlan(i))

  it('is on every light day, once, and on no other day', () => {
    expect(days.filter((d) => d.light).length).toBeGreaterThan(100)
    for (const d of days) expect(d.blocks.filter((b) => b.type === 'listen').length, `${d.date} light=${d.light}`).toBe(d.light ? 1 : 0)
  })

  it('comes after the day’s practice and before the cool-down', () => {
    for (const d of days.filter((x) => x.light)) {
      const types = d.blocks.map((b) => b.type)
      const at = types.indexOf('listen')
      const lastPractice = Math.max(-1, ...types.map((t, i) => (PRACTICE.includes(t) ? i : -1)))
      expect(at, d.date).toBeGreaterThan(lastPractice)
      expect(at, d.date).toBeLessThan(types.indexOf('cooldown'))
    }
  })

  it('is short, rests her voice and needs no headset', () => {
    expect(LISTEN_MIN).toBeGreaterThanOrEqual(3)
    expect(LISTEN_MIN).toBeLessThanOrEqual(5)
    expect(isVoice('listen')).toBe(false)
    for (const d of days)
      for (const b of d.blocks.filter((x) => x.type === 'listen')) {
        expect(b.minutes).toBeGreaterThanOrEqual(3)
        expect(b.minutes).toBeLessThanOrEqual(LISTEN_MIN)
        expect(b.headset).toBe(false)
        expect(b.sectionIds).toEqual([])
      }
  })

  it('tells her to close her eyes and imagine performing it', () => {
    expect(BLOCK_COPY.listen.title).toMatch(/listen/i)
    expect(BLOCK_COPY.listen.how).toMatch(/eyes/i)
    expect(BLOCK_COPY.listen.how).toMatch(/imagine/i)
  })
})
