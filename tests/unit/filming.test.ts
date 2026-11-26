/**
 * Filming with time to get ready (version 1.2). Before any recording: the coach says "Get to your
 * spot" while a countdown shows the walk-on time (5 seconds unless a grown-up changed it), then the
 * "5, 6, 7, 8" count-in on the beat, then the recording and the music start together on the 1.
 * Showtime can be filmed too ("Film my Showtime"): its own walk-on and opening-pose count are her
 * time to get ready.
 */
import { describe, expect, it } from 'vitest'
import { KID_COPY } from '../../src/content/kid'
import { COUNT_IN_WORDS, beatMs, getReadySchedule } from '../../src/model/countin'
import { DEFAULT_WALK_ON_SECONDS } from '../../src/storage/schema'

describe('getting ready to film', () => {
  it('says "Get to your spot", counts down the walk-on time, then counts her in', () => {
    const s = getReadySchedule(DEFAULT_WALK_ON_SECONDS, 120, 1)
    expect(DEFAULT_WALK_ON_SECONDS).toBe(5)
    expect(s.cue).toBe(KID_COPY.cues.getToSpot)
    expect(s.countdown).toEqual([
      { n: 5, at: 0 },
      { n: 4, at: 1000 },
      { n: 3, at: 2000 },
      { n: 2, at: 3000 },
      { n: 1, at: 4000 },
    ])
    expect(s.beats).toEqual([5000, 5500, 6000, 6500])
    expect(s.words).toEqual(COUNT_IN_WORDS)
    expect(s.recordAt).toBe(7000)
  })

  it('uses the walk-on time a grown-up set, and the count-in follows her track’s tempo', () => {
    const s = getReadySchedule(8, 90, 0.75)
    expect(s.countdown.map((c) => c.n)).toEqual([8, 7, 6, 5, 4, 3, 2, 1])
    const beat = beatMs(90, 0.75)
    expect(s.beats[0]).toBe(8000)
    expect(s.recordAt).toBeCloseTo(8000 + 4 * beat, 0)
  })

  it('has the words for filming Showtime', () => {
    expect(KID_COPY.showtime.film).toBe('Film my Showtime')
    expect(KID_COPY.showtime.filmSaved).toMatch(/My clips/)
  })
})
