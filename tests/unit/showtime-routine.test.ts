/**
 * The Showtime routine (version 1.1): backstage breathing (a circle, 4 seconds in, 6 out), "I'm
 * excited!", the walk to her spot with a countdown long enough to get there from the iPad, the
 * opening pose held for a spoken count, her track, the ending pose, a bow, applause, and walking
 * off. The walk-on and the bow can be practised on their own.
 *
 * The audience is optional, and only ever a gentle crowd and applause made in Web Audio. Never booing
 * or laughter, and the applause is the same every time, whatever happened.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AUDIENCE_SOUNDS, applauseSamples, crowdSamples } from '../../src/audio/audience'
import { KID_COPY } from '../../src/content/kid'
import { COUNT_IN_WORDS } from '../../src/model/countin'
import {
  BREATH_IN_S,
  BREATH_OUT_S,
  ROUTINE_AFTER_MS,
  bowRoutine,
  breathAt,
  routineBeforeMaxMs,
  showtimeRoutine,
  walkOnRoutine,
} from '../../src/model/routine'
import { DEFAULT_WALK_ON_SECONDS, defaultShowtime } from '../../src/storage/schema'

const ids = (steps: { id: string }[]) => steps.map((s) => s.id)

describe('the routine', () => {
  it('goes backstage breathing, excited, walk on, opening pose, her track, ending pose, bow, applause, walk off', () => {
    expect(ids(showtimeRoutine(defaultShowtime()))).toEqual(['breathe', 'excited', 'walk', 'pose', 'track', 'endPose', 'bow', 'applause', 'walkOff'])
  })

  it('breathes in for 4 seconds and out for 6, for the breaths a grown-up chose', () => {
    expect([BREATH_IN_S, BREATH_OUT_S]).toEqual([4, 6])
    const r = showtimeRoutine({ breaths: 3, walkOnSeconds: 8 })
    expect(r[0].seconds).toBe(30)
    expect(breathAt(0)).toEqual({ breath: 1, phase: 'in', progress: 0 })
    expect(breathAt(3.9).phase).toBe('in')
    expect(breathAt(4).phase).toBe('out')
    expect(breathAt(9.9)).toMatchObject({ breath: 1, phase: 'out' })
    expect(breathAt(10)).toMatchObject({ breath: 2, phase: 'in' })
    expect(breathAt(7).progress).toBeCloseTo(0.5, 5)
  })

  it('gives her time to walk from the iPad to her spot', () => {
    expect(DEFAULT_WALK_ON_SECONDS).toBeGreaterThanOrEqual(5)
    expect(showtimeRoutine(defaultShowtime()).find((s) => s.id === 'walk')!.seconds).toBe(DEFAULT_WALK_ON_SECONDS)
    expect(showtimeRoutine({ breaths: 1, walkOnSeconds: 12 }).find((s) => s.id === 'walk')!.seconds).toBe(12)
  })

  it('holds the opening pose for the spoken count, and the track comes in on the 1', () => {
    const pose = showtimeRoutine(defaultShowtime()).find((s) => s.id === 'pose')!
    expect(pose.count).toEqual(COUNT_IN_WORDS)
    const track = showtimeRoutine(defaultShowtime()).find((s) => s.id === 'track')!
    expect(track.seconds).toBeNull()
  })

  it('lets her practise the walk-on and the bow on their own', () => {
    expect(ids(walkOnRoutine(defaultShowtime()))).toEqual(['walk', 'pose'])
    expect(ids(bowRoutine())).toEqual(['endPose', 'bow', 'applause', 'walkOff'])
  })

  it('says how long the routine adds before and after her track', () => {
    const r = showtimeRoutine(defaultShowtime())
    const before = r.slice(0, r.findIndex((s) => s.id === 'track'))
    // The longest the opening pose can take is a slow count (1 s a beat) after its cue.
    expect(routineBeforeMaxMs(defaultShowtime())).toBeGreaterThanOrEqual(before.reduce((a, s) => a + (s.seconds ?? 0), 0) * 1000)
    expect(routineBeforeMaxMs(defaultShowtime())).toBeLessThan(90_000)
    const after = r.slice(r.findIndex((s) => s.id === 'track') + 1)
    expect(ROUTINE_AFTER_MS).toBe(after.reduce((a, s) => a + (s.seconds ?? 0), 0) * 1000)
  })

  it('has words for every step, from src/content', () => {
    for (const s of [...showtimeRoutine(defaultShowtime()), ...bowRoutine()]) if (s.id !== 'track') expect(s.words, s.id).toBeTruthy()
    expect(KID_COPY.showtime.excited).toMatch(/I’m excited!/)
  })
})

describe('the audience', () => {
  it('is only ever a gentle crowd and applause', () => {
    expect([...AUDIENCE_SOUNDS]).toEqual(['crowd', 'applause'])
  })

  it('applauds the same every time, whatever happened', () => {
    expect(applauseSamples.length).toBe(1)
    const a = applauseSamples(8000)
    const b = applauseSamples(8000)
    expect(a.length).toBeGreaterThan(8000 * 4)
    expect(Array.from(a)).toEqual(Array.from(b))
    const peak = a.reduce((m, x) => Math.max(m, Math.abs(x)), 0)
    expect(peak).toBeGreaterThan(0.05)
    expect(peak).toBeLessThanOrEqual(1)
  })

  it('keeps the crowd gentle', () => {
    expect(crowdSamples.length).toBe(1)
    const c = crowdSamples(8000)
    const rms = Math.sqrt(c.reduce((s, x) => s + x * x, 0) / c.length)
    const a = applauseSamples(8000)
    const rmsA = Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length)
    expect(rms).toBeGreaterThan(0)
    expect(rms).toBeLessThan(rmsA)
  })

  it('has no booing, laughter or jeering anywhere in the sound code', () => {
    const dir = join(__dirname, '..', '..', 'src', 'audio')
    for (const f of readdirSync(dir)) expect(readFileSync(join(dir, f), 'utf8'), f).not.toMatch(/\b(boo(s|ing|ed)?|laugh\w*|jeer\w*|heckl\w*|hiss\w*|giggl\w*)\b/i)
  })
})
