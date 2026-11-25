/**
 * Section timing: marking start and end by tapping while a source plays, fine nudges, mapping a
 * moment on her track onto a reference (and back), play ranges, and song order.
 */
import { describe, expect, it } from 'vitest'
import {
  MIN_SECTION,
  NUDGE_STEPS,
  PRE_ROLL,
  TAP_LATENCY,
  formatTime,
  mapTime,
  markEnd,
  markStart,
  nudge,
  orderSections,
  playRange,
  previousSection,
  spanOf,
  tapToMediaTime,
} from '../../src/model/timing'
import type { Marks, Section } from '../../src/storage/schema'

const empty: Marks = { start: null, end: null }

function section(id: string, start: number | null, end: number | null, createdAt = '2031-01-01T00:00:00.000Z'): Section {
  return { id, name: id, lines: [], track: { start, end }, refs: {}, createdAt }
}

describe('tapping a mark while the source plays', () => {
  it('takes off the reaction time, scaled to the playback speed', () => {
    expect(TAP_LATENCY).toBeGreaterThan(0)
    expect(TAP_LATENCY).toBeLessThan(0.4)
    for (const rate of [0.5, 0.6, 0.75, 0.9, 1]) {
      // She meant 10 s; she tapped TAP_LATENCY wall seconds late, while the media moved on at `rate`.
      const tappedAt = 10 + TAP_LATENCY * rate
      expect(tapToMediaTime(tappedAt, rate)).toBeCloseTo(10, 2)
    }
  })

  it('never goes below zero and rounds to hundredths', () => {
    expect(tapToMediaTime(0.05, 1)).toBe(0)
    const t = tapToMediaTime(12.34567, 1, 0)
    expect(t).toBe(12.35)
  })
})

describe('marking start and end', () => {
  it('marks a start, then an end after it', () => {
    const a = markStart(empty, 4.2, 60)
    expect(a).toEqual({ start: 4.2, end: null })
    const b = markEnd(a, 9.81, 60)
    expect(b).toEqual({ start: 4.2, end: 9.81 })
    expect(spanOf(b)).toEqual({ start: 4.2, end: 9.81 })
  })

  it('keeps marks inside the source', () => {
    expect(markStart(empty, -3, 60).start).toBe(0)
    expect(markEnd({ start: 50, end: null }, 75, 60).end).toBe(60)
    // Unknown duration: only the lower bound applies.
    expect(markEnd({ start: 50, end: null }, 75, null).end).toBe(75)
  })

  it('refuses an end that is not at least MIN_SECTION after the start', () => {
    const m: Marks = { start: 10, end: null }
    expect(markEnd(m, 10 + MIN_SECTION / 2, 60)).toEqual(m)
    expect(markEnd(m, 5, 60)).toEqual(m)
  })

  it('clears an end that a new start has passed', () => {
    expect(markStart({ start: 2, end: 8 }, 7.5, 60)).toEqual({ start: 7.5, end: null })
    expect(markStart({ start: 2, end: 8 }, 3, 60)).toEqual({ start: 3, end: 8 })
  })

  it('a span needs both marks, in order', () => {
    expect(spanOf(empty)).toBeNull()
    expect(spanOf({ start: 3, end: null })).toBeNull()
    expect(spanOf({ start: null, end: 3 })).toBeNull()
    expect(spanOf(undefined)).toBeNull()
    expect(spanOf({ start: 3, end: 3 + MIN_SECTION })).toEqual({ start: 3, end: 3 + MIN_SECTION })
  })
})

describe('fine nudges', () => {
  it('offers small steps both ways', () => {
    expect([...NUDGE_STEPS].sort((a, b) => a - b)).toEqual([-0.5, -0.1, 0.1, 0.5])
  })

  it('moves a mark by exactly the step, with no floating-point drift', () => {
    let m: Marks = { start: 1, end: 9 }
    for (let i = 0; i < 7; i++) m = nudge(m, 'start', 0.1, 60)
    expect(m.start).toBe(1.7)
    m = nudge(m, 'end', -0.5, 60)
    expect(m.end).toBe(8.5)
  })

  it('stays inside the source and keeps the section at least MIN_SECTION long', () => {
    expect(nudge({ start: 0.05, end: 9 }, 'start', -0.5, 60).start).toBe(0)
    expect(nudge({ start: 1, end: 59.8 }, 'end', 0.5, 60).end).toBe(60)
    expect(nudge({ start: 5, end: 5 + MIN_SECTION + 0.05 }, 'start', 0.5, 60).start).toBe(5.05)
    expect(nudge({ start: 5, end: 5 + MIN_SECTION + 0.05 }, 'end', -0.5, 60).end).toBe(5 + MIN_SECTION)
  })

  it('leaves a missing mark alone', () => {
    expect(nudge(empty, 'start', 0.1, 60)).toEqual(empty)
  })
})

describe('mapping between her track and a reference', () => {
  const track = { start: 30, end: 50 }
  const ref = { start: 112, end: 152 } // the same section, twice as long on a slow reference

  it('maps start to start, end to end, and in between proportionally', () => {
    expect(mapTime(track, ref, 30)).toBe(112)
    expect(mapTime(track, ref, 50)).toBe(152)
    expect(mapTime(track, ref, 40)).toBe(132)
    expect(mapTime(ref, track, 132)).toBe(40)
  })

  it('round-trips', () => {
    for (const t of [30, 31.7, 44.44, 50]) expect(mapTime(ref, track, mapTime(track, ref, t))).toBeCloseTo(t, 9)
  })
})

describe('play ranges', () => {
  it('starts a little before the section so she hears it coming', () => {
    expect(PRE_ROLL).toBeGreaterThan(0)
    expect(playRange({ start: 10, end: 20 })).toEqual({ from: 10 - PRE_ROLL, to: 20 })
    expect(playRange({ start: 0.5, end: 20 })).toEqual({ from: 0, to: 20 })
    expect(playRange({ start: 10, end: 20 }, 0)).toEqual({ from: 10, to: 20 })
  })
})

describe('song order', () => {
  it('orders sections by where they start on her track; unmarked ones last, oldest first', () => {
    const a = section('a', 40, 50)
    const b = section('b', 10, 20)
    const c = section('c', null, null, '2031-01-02T00:00:00.000Z')
    const d = section('d', null, null, '2031-01-01T00:00:00.000Z')
    expect(orderSections([a, c, b, d]).map((s) => s.id)).toEqual(['b', 'a', 'd', 'c'])
  })

  it('finds the section before', () => {
    const a = section('a', 40, 50)
    const b = section('b', 10, 20)
    expect(previousSection([a, b], 'a')?.id).toBe('b')
    expect(previousSection([a, b], 'b')).toBeNull()
    expect(previousSection([a, b], 'zzz')).toBeNull()
  })
})

describe('showing times', () => {
  it('reads as minutes, seconds and tenths', () => {
    expect(formatTime(0)).toBe('0:00.0')
    expect(formatTime(5.34)).toBe('0:05.3')
    expect(formatTime(65.35)).toBe('1:05.4')
    expect(formatTime(600)).toBe('10:00.0')
  })
})
