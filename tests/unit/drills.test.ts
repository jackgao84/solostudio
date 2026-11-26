/**
 * Start anywhere and rejoin (version 1.1).
 *  - Start anywhere drops her into a random section (rap and dance together) with a spoken count-in,
 *    choosing shaky sections more often and never the same one twice in a row.
 *  - Rejoin plays her track and, once in each rep, the music drops out for 2 to 4 seconds while the
 *    track keeps its place, or jumps ahead one line; she keeps going and picks it back up.
 *  - The count-in is "5, 6, 7, 8" on the beat of her track at the speed she's practising, after a
 *    moment to get to her spot, and the music comes in on the 1.
 *  - Both drills join the Today plan from the together phase on, as rap-and-dance-together blocks
 *    (so the voice rule and the headset reminders apply to them).
 */
import { describe, expect, it } from 'vitest'
import { KID_COPY } from '../../src/content/kid'
import { COUNT_IN_LEAD_MS, COUNT_IN_WORDS, beatMs, countInSchedule } from '../../src/model/countin'
import { addDays } from '../../src/model/dates'
import { DROPOUT_MAX_S, DROPOUT_MIN_S, pickSection, planRejoin } from '../../src/model/drills'
import { buildPlan, voiceRuns, VOICE_LIMIT_MIN, type PlanInput } from '../../src/model/plan'
import { seeded } from '../../src/model/rng'

describe('start anywhere', () => {
  const ids = ['intro', 'v1', 'chorus', 'break']

  it('drops her into every section, choosing shaky ones more often', () => {
    const rand = seeded('anywhere')
    const counts: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]))
    let prev: string | null = null
    for (let i = 0; i < 4000; i++) {
      const id: string = pickSection(ids, new Set(['chorus']), rand, prev)!
      counts[id]++
      prev = id
    }
    for (const id of ids) expect(counts[id], id).toBeGreaterThan(300)
    const others = ids.filter((id) => id !== 'chorus').map((id) => counts[id])
    expect(counts.chorus).toBeGreaterThan(1.5 * Math.max(...others))
  })

  it('without shaky sections, each comes up about as often', () => {
    const rand = seeded('even')
    const counts: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]))
    let prev: string | null = null
    for (let i = 0; i < 4000; i++) counts[(prev = pickSection(ids, new Set(), rand, prev)!)]++
    for (const id of ids) expect(Math.abs(counts[id] - 1000), id).toBeLessThan(150)
  })

  it('never drops her into the same section twice in a row', () => {
    const rand = seeded('no-repeat')
    let prev: string | null = null
    for (let i = 0; i < 500; i++) {
      const id: string | null = pickSection(ids, new Set(['v1', 'break']), rand, prev)
      expect(id).not.toBe(prev)
      prev = id
    }
  })

  it('works with a single section, and has nothing to pick with none', () => {
    expect(pickSection(['v1'], new Set(), seeded(1), 'v1')).toBe('v1')
    expect(pickSection([], new Set(), seeded(1), null)).toBeNull()
  })
})

describe('rejoin', () => {
  const starts = [10, 12.2, 14.1, 16.3]
  const span = { start: 9.6, end: 18.4 }

  it('drops the music out for 2 to 4 seconds while the track keeps its place, or jumps ahead one line', () => {
    expect(DROPOUT_MIN_S).toBe(2)
    expect(DROPOUT_MAX_S).toBe(4)
    const kinds = new Set<string>()
    for (let i = 0; i < 400; i++) {
      const e = planRejoin(starts, span, seeded(`rejoin-${i}`))
      expect(e).not.toBeNull()
      kinds.add(e!.kind)
      if (e!.kind === 'dropout') {
        expect(e!.seconds).toBeGreaterThanOrEqual(DROPOUT_MIN_S)
        expect(e!.seconds).toBeLessThanOrEqual(DROPOUT_MAX_S)
        expect(e!.at).toBeGreaterThanOrEqual(span.start + 1)
        expect(e!.at + e!.seconds).toBeLessThanOrEqual(span.end)
      } else {
        // From inside one line to the start of the next: she skips ahead one line.
        const k = starts.indexOf(e!.to)
        expect(k, `jump target ${e!.to} is a line start`).toBeGreaterThan(0)
        expect(e!.at).toBeGreaterThanOrEqual(starts[k - 1])
        expect(e!.at).toBeLessThan(e!.to)
      }
    }
    expect([...kinds].sort()).toEqual(['dropout', 'jump'])
  })

  it('drops out when the lines aren’t timed yet', () => {
    for (let i = 0; i < 50; i++) expect(planRejoin([], span, seeded(i))?.kind).toBe('dropout')
  })

  it('fits a short section, and skips one too short to rejoin in', () => {
    const short = { start: 0, end: 3.6 }
    for (let i = 0; i < 50; i++) {
      const e = planRejoin([], short, seeded(i))!
      expect(e.kind).toBe('dropout')
      if (e.kind === 'dropout') expect(e.at + e.seconds).toBeLessThanOrEqual(short.end)
    }
    expect(planRejoin([], { start: 0, end: 2.5 }, seeded(1))).toBeNull()
  })
})

describe('the count-in', () => {
  it('is "5, 6, 7, 8", the words she hears', () => {
    expect(COUNT_IN_WORDS).toEqual(['5', '6', '7', '8'])
    expect(KID_COPY.cues.countIn.split(/,\s*/)).toEqual(COUNT_IN_WORDS)
  })

  it('lands on the beat of her track at the speed she is practising, and the music comes in on the 1', () => {
    expect(COUNT_IN_LEAD_MS).toBeGreaterThanOrEqual(1000)
    const at100 = countInSchedule(120, 1)
    expect(at100.beats).toEqual([COUNT_IN_LEAD_MS, COUNT_IN_LEAD_MS + 500, COUNT_IN_LEAD_MS + 1000, COUNT_IN_LEAD_MS + 1500])
    expect(at100.playAt).toBe(COUNT_IN_LEAD_MS + 2000)
    const at75 = countInSchedule(120, 0.75)
    expect(at75.beats[1] - at75.beats[0]).toBeCloseTo(666.7, 0)
    expect(at75.playAt - at75.beats[3]).toBeCloseTo(666.7, 0)
  })

  it('keeps a pace she can follow when the tempo is unknown or extreme', () => {
    expect(beatMs(null, 1)).toBe(600)
    expect(beatMs(400, 1)).toBeGreaterThanOrEqual(400)
    expect(beatMs(40, 0.5)).toBeLessThanOrEqual(1000)
  })

  it('takes under ten seconds, so a rep starts soon after she taps', () => {
    for (const bpm of [null, 60, 90, 120, 160]) for (const speed of [0.5, 0.75, 1]) expect(countInSchedule(bpm, speed).playAt).toBeLessThan(10_000)
  })
})

describe('the drills in the plan', () => {
  function variety(): PlanInput[] {
    const out: PlanInput[] = []
    for (const days of [3, 6, 9, 12, 20, 40])
      for (const [school, holiday] of [
        [30, 60],
        [45, 120],
        [60, 150],
      ])
        for (const light of [0, 3])
          for (const n of [1, 4, 9]) {
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
  const plans = variety().map((i) => buildPlan(i))

  it('has no drills while she is learning the parts', () => {
    for (const days of plans) for (const d of days.filter((x) => x.phase === 'learn')) expect(d.blocks.filter((b) => b.drill), d.date).toEqual([])
  })

  it('has both drills on every together-phase day that isn’t a light day', () => {
    let seen = 0
    for (const days of plans)
      for (const d of days.filter((x) => x.phase === 'together' && !x.light)) {
        seen++
        expect(d.blocks.some((b) => b.drill === 'anywhere'), `${d.date} ${d.minutes} min`).toBe(true)
        expect(d.blocks.some((b) => b.drill === 'rejoin'), `${d.date} ${d.minutes} min`).toBe(true)
      }
    expect(seen).toBeGreaterThan(50)
  })

  it('keeps them in the show-ready days too', () => {
    for (const days of plans) {
      const ready = days.filter((x) => x.phase === 'showReady' && !x.light && x.minutes >= 40)
      for (const d of ready) expect(d.blocks.some((b) => b.drill), d.date).toBe(true)
    }
  })

  it('makes them rap-and-dance-together blocks: voice rule, headset reminder and all', () => {
    for (const days of plans)
      for (const d of days) {
        for (const b of d.blocks.filter((x) => x.drill)) {
          expect(b.type).toBe('together')
          expect(b.headset).toBe(true)
          expect(b.minutes).toBeGreaterThanOrEqual(3)
        }
        for (const run of voiceRuns(d.blocks)) expect(run).toBeLessThanOrEqual(VOICE_LIMIT_MIN)
      }
  })
})
