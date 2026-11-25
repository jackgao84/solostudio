/**
 * Tap tempo and the 8-count display: a grown-up taps along with her track (at any speed) to set the
 * tempo, taps once on a "1" to set the downbeat, and the counts follow her track's time.
 */
import { describe, expect, it } from 'vitest'
import { MIN_TAPS, TAP_RESET_GAP, beatLength, bpmFromTaps, countAt, eightsIn, nudgeOffset } from '../../src/model/counts'

const SPEEDS = Array.from({ length: 11 }, (_, i) => Math.round((0.5 + i * 0.05) * 100) / 100)

/** Wall-clock tap times for a song at `bpm` (at 100%) played at `rate`, with a little human wobble. */
function taps(bpm: number, rate: number, n: number, wobble = 0.012): number[] {
  const interval = 60 / (bpm * rate)
  return Array.from({ length: n }, (_, i) => 3 + i * interval + (i % 2 === 0 ? wobble : -wobble))
}

describe('tap tempo', () => {
  it('finds the tempo of her track at 100%, whatever speed it is playing at', () => {
    for (const bpm of [92, 120, 135, 148.5]) {
      for (const rate of SPEEDS) {
        const found = bpmFromTaps(taps(bpm, rate, 9), rate)
        expect(found, `${bpm} bpm at ${rate}`).not.toBeNull()
        expect(Math.abs(found! - bpm), `${bpm} bpm at ${rate}: got ${found}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it('rounds to the nearest half beat per minute', () => {
    const found = bpmFromTaps(taps(120, 1, 8, 0), 1)!
    expect(found * 2).toBe(Math.round(found * 2))
    expect(found).toBe(120)
  })

  it(`needs at least ${MIN_TAPS} taps`, () => {
    expect(bpmFromTaps(taps(120, 1, MIN_TAPS - 1), 1)).toBeNull()
    expect(bpmFromTaps(taps(120, 1, MIN_TAPS), 1)).not.toBeNull()
  })

  it('starts again after a pause longer than TAP_RESET_GAP', () => {
    const old = taps(80, 1, 6, 0)
    const last = old[old.length - 1]
    const fresh = taps(140, 1, 6, 0).map((t) => t - 3 + last + TAP_RESET_GAP + 1)
    expect(bpmFromTaps([...old, ...fresh], 1)).toBe(140)
  })

  it('uses only the most recent taps, so a steadier finish wins', () => {
    const early = taps(100, 1, 4, 0)
    const later = taps(120, 1, 9, 0).map((t) => t - 3 + early[3] + 0.5)
    expect(bpmFromTaps([...early, ...later], 1)).toBe(120)
  })
})

describe('the 8-count', () => {
  const bpm = 120 // a beat every 0.5 s
  const offset = 1.0 // a "1" at 1.0 s on her track

  it('counts 1 to 8 from the downbeat', () => {
    expect(beatLength(bpm)).toBe(0.5)
    expect(countAt(1.0, bpm, offset)).toEqual({ count: 1, eight: 1 })
    expect(countAt(1.49, bpm, offset)).toEqual({ count: 1, eight: 1 })
    expect(countAt(1.5, bpm, offset)).toEqual({ count: 2, eight: 1 })
    expect(countAt(4.5, bpm, offset)).toEqual({ count: 8, eight: 1 })
    expect(countAt(5.0, bpm, offset)).toEqual({ count: 1, eight: 2 })
    expect(countAt(13.0, bpm, offset)).toEqual({ count: 1, eight: 4 })
  })

  it('counts backwards cleanly before the downbeat', () => {
    expect(countAt(0.5, bpm, offset)).toEqual({ count: 8, eight: 0 })
    expect(countAt(0.0, bpm, offset)).toEqual({ count: 7, eight: 0 })
  })

  it('is exact on every beat, with no floating-point slips', () => {
    const b = 60 / 133
    for (let i = 0; i < 64; i++) {
      const t = 2.37 + i * b
      expect(countAt(t, 133, 2.37).count, `beat ${i}`).toBe((i % 8) + 1)
    }
  })

  it('counts the 8-counts in a section', () => {
    expect(eightsIn({ start: 1, end: 17 }, bpm)).toBe(4)
    expect(eightsIn({ start: 1, end: 16.8 }, bpm)).toBe(4)
    expect(eightsIn({ start: 1, end: 2 }, bpm)).toBe(1)
  })

  it('nudges the downbeat by small steps, wrapping within one beat', () => {
    expect(nudgeOffset(1.0, 0.05, bpm)).toBeCloseTo(1.05, 9)
    expect(nudgeOffset(0.02, -0.05, bpm)).toBeCloseTo(0.47, 9)
  })
})
