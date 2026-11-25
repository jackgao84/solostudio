/**
 * Line sync: tap-along times each line on her track, and lines light up karaoke style at any speed
 * from 50% to 100%. Times are always in her track's own seconds, so one tap-along serves every speed;
 * the small "light up early" lead is in real (wall-clock) seconds, so it feels the same at any speed.
 */
import { describe, expect, it } from 'vitest'
import { LINE_LEAD, MIN_LINE_GAP, activeLine, lineStarts, litWords, recordLineTap, wordsOf } from '../../src/model/sync'
import { TAP_LATENCY } from '../../src/model/timing'
import { lyricLine, placeholderWords } from '../fixtures/placeholders'

/** Every speed she can practise at: 50% to 100% in 5% steps. */
const SPEEDS = Array.from({ length: 11 }, (_, i) => Math.round((0.5 + i * 0.05) * 100) / 100)

/** True line starts on the track (seconds). */
const TRUE_STARTS = [12.0, 14.35, 16.8, 19.05, 21.6, 23.9]

/** Tap-along at `rate`: she taps each line TAP_LATENCY real seconds after it starts. */
function tapAlong(rate: number): (number | null)[] {
  let times: (number | null)[] = TRUE_STARTS.map(() => null)
  TRUE_STARTS.forEach((t, i) => {
    const next = recordLineTap(times, i, t + TAP_LATENCY * rate, rate)
    expect(next, `tap ${i} at ${rate}`).not.toBeNull()
    times = next!
  })
  return times
}

describe('tap-along', () => {
  it('records each line at the moment it really starts, at every speed', () => {
    for (const rate of SPEEDS) {
      const times = tapAlong(rate)
      times.forEach((t, i) => expect(t, `line ${i} at ${rate}`).toBeCloseTo(TRUE_STARTS[i], 2))
    }
  })

  it('refuses a tap that is not after the line before', () => {
    const times = [10, null, null]
    expect(recordLineTap(times, 1, 10 + MIN_LINE_GAP / 2, 1)).toBeNull()
    expect(recordLineTap(times, 1, 9, 1)).toBeNull()
  })

  it('re-tapping a line clears later times that are no longer after it', () => {
    const times = [10, 12, 14, 16]
    const next = recordLineTap(times, 1, 15 + TAP_LATENCY, 1)!
    expect(next[0]).toBe(10)
    expect(next[1]).toBeCloseTo(15, 2)
    expect(next[2]).toBeNull()
    expect(next[3]).toBe(16)
  })

  it('does not change the list it was given', () => {
    const times = [10, null]
    recordLineTap(times, 1, 12, 1)
    expect(times).toEqual([10, null])
  })
})

describe('lines light up at every speed', () => {
  it('each line lights LINE_LEAD real seconds before it starts, whatever the speed', () => {
    expect(LINE_LEAD).toBeGreaterThan(0)
    expect(LINE_LEAD).toBeLessThanOrEqual(0.4)
    for (const tapRate of SPEEDS) {
      const starts = lineStarts(tapAlong(tapRate), { start: 11, end: 26 })!
      for (const rate of SPEEDS) {
        starts.forEach((_s, i) => {
          // In media seconds the lead shrinks with the speed: LINE_LEAD real seconds = LINE_LEAD × rate.
          const lightsAt = TRUE_STARTS[i] - LINE_LEAD * rate
          expect(activeLine(starts, lightsAt - 0.02 * rate, rate), `before line ${i} (tap ${tapRate}, play ${rate})`).toBe(i - 1)
          expect(activeLine(starts, lightsAt + 0.02 * rate, rate), `line ${i} (tap ${tapRate}, play ${rate})`).toBe(i)
        })
      }
    }
  })

  it('is -1 before the first line and stays on the last line after it', () => {
    const starts = [5, 7, 9]
    expect(activeLine(starts, 0, 1)).toBe(-1)
    expect(activeLine(starts, 100, 1)).toBe(2)
  })
})

describe('lines that have not been tapped yet', () => {
  it('spreads untimed lines evenly across the section', () => {
    expect(lineStarts([null, null, null, null], { start: 10, end: 18 })).toEqual([10, 12, 14, 16])
  })

  it('fills gaps between tapped lines evenly', () => {
    expect(lineStarts([10, null, null, 16], { start: 10, end: 20 })).toEqual([10, 12, 14, 16])
    expect(lineStarts([null, 12, null], { start: 10, end: 16 })).toEqual([10, 12, 14])
  })

  it('needs the section marks when some lines are untimed', () => {
    expect(lineStarts([null, null], null)).toBeNull()
    expect(lineStarts([3, 5], null)).toEqual([3, 5])
  })
})

describe('words within a line', () => {
  it('splits a typed line into words', () => {
    expect(wordsOf(`  ${lyricLine(3, 'Verse 1')}  `)).toEqual(['Line', '3', 'of', 'Verse', '1'])
    expect(wordsOf('')).toEqual([])
  })

  it('lights words in order across the line, all lit before the next line', () => {
    const words = placeholderWords(6)
    expect(litWords(words, 10, 14, 9.9)).toBe(0)
    expect(litWords(words, 10, 14, 10)).toBeGreaterThanOrEqual(0)
    let last = 0
    for (let t = 10; t <= 14; t += 0.05) {
      const n = litWords(words, 10, 14, t)
      expect(n).toBeGreaterThanOrEqual(last)
      last = n
    }
    expect(litWords(words, 10, 14, 13.9)).toBe(6)
  })

  it('gives longer words more time', () => {
    const words = ['a', 'bbbbbbbbbbbb', 'c']
    // Halfway through the line the long middle word is still being said.
    expect(litWords(words, 0, 10, 4)).toBe(1)
  })
})
