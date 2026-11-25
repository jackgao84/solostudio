/**
 * Spacing: a finished ladder comes back for a check after 1, 3 and 7 days (then every 7). A section
 * she marks shaky comes back sooner: the next day, and first in the list. Nothing here is a score.
 */
import { describe, expect, it } from 'vitest'
import { addDays } from '../../src/model/dates'
import { dueItems, markShaky, nextStep, reviewLadder, tickStep } from '../../src/model/progress'
import { LADDERS } from '../../src/model/ladders'
import { REVIEW_GAPS, isDue, reviewed, startReviews } from '../../src/model/spacing'
import { emptyProgress, type SectionProgress } from '../../src/storage/schema'

const D = '2031-03-02'

function finishLadder(p: SectionProgress, ladder: 'rap' | 'dance' | 'together', day: string): SectionProgress {
  let out = p
  for (const step of LADDERS[ladder]) out = tickStep(out, ladder, step.id, day)
  return out
}

describe('review gaps', () => {
  it('are 1, 3 and 7 days', () => {
    expect([...REVIEW_GAPS]).toEqual([1, 3, 7])
  })

  it('a finished ladder is due the next day, then 3 days after that, then 7, then every 7', () => {
    let s = startReviews(D)
    expect(s.due).toBe(addDays(D, 1))
    s = reviewed(s, addDays(D, 1))
    expect(s.due).toBe(addDays(D, 4))
    s = reviewed(s, addDays(D, 4))
    expect(s.due).toBe(addDays(D, 11))
    s = reviewed(s, addDays(D, 11))
    expect(s.due).toBe(addDays(D, 18))
  })

  it('counts from the day she actually reviewed', () => {
    let s = startReviews(D)
    s = reviewed(s, addDays(D, 3)) // two days late
    expect(s.due).toBe(addDays(D, 6))
  })

  it('is due on or after its day', () => {
    const s = startReviews(D)
    expect(isDue(s, D)).toBe(false)
    expect(isDue(s, addDays(D, 1))).toBe(true)
    expect(isDue(s, addDays(D, 9))).toBe(true)
  })
})

describe('ticking steps', () => {
  it('ticks steps in any order and finishes the ladder when every step is ticked', () => {
    let p = emptyProgress()
    const steps = LADDERS.rap
    expect(nextStep(p, 'rap')?.id).toBe(steps[0].id)
    p = tickStep(p, 'rap', steps[1].id, D)
    expect(nextStep(p, 'rap')?.id).toBe(steps[0].id)
    p = finishLadder(p, 'rap', D)
    expect(nextStep(p, 'rap')).toBeNull()
    expect(p.rap.finishedAt).toBe(D)
    expect(p.rap.review?.due).toBe(addDays(D, 1))
  })

  it('ticking a step twice changes nothing', () => {
    const once = tickStep(emptyProgress(), 'dance', LADDERS.dance[0].id, D)
    expect(tickStep(once, 'dance', LADDERS.dance[0].id, D)).toEqual(once)
  })

  it('does not change the progress it was given', () => {
    const p = emptyProgress()
    tickStep(p, 'rap', LADDERS.rap[0].id, D)
    expect(p).toEqual(emptyProgress())
  })
})

describe('shaky sections come back sooner', () => {
  it('moves every finished ladder of the section to tomorrow', () => {
    let p = finishLadder(emptyProgress(), 'rap', D)
    p = reviewLadder(p, 'rap', addDays(D, 1))
    p = reviewLadder(p, 'rap', addDays(D, 4)) // next due in 7 days
    expect(p.rap.review?.due).toBe(addDays(D, 11))
    const day = addDays(D, 5)
    p = markShaky(p, day)
    expect(p.shaky).toBe(true)
    expect(p.rap.review?.due).toBe(addDays(day, 1))
    expect(p.rap.review?.shaky).toBe(true)
    // After a good check it climbs the gaps again from the start.
    p = reviewLadder(p, 'rap', addDays(day, 1))
    expect(p.shaky).toBe(false)
    expect(p.rap.review?.due).toBe(addDays(day, 1 + REVIEW_GAPS[1]))
  })

  it('lists shaky sections first, then the longest waiting, then song order', () => {
    const progress: Record<string, SectionProgress> = {}
    progress.a = finishLadder(emptyProgress(), 'rap', D) // due D+1
    progress.b = finishLadder(emptyProgress(), 'rap', addDays(D, -3)) // due D-2
    progress.c = markShaky(finishLadder(emptyProgress(), 'dance', D), D) // due D+1, shaky
    progress.d = finishLadder(emptyProgress(), 'together', addDays(D, 5)) // not due yet
    const items = dueItems(progress, ['a', 'b', 'c', 'd'], addDays(D, 1))
    expect(items.map((i) => `${i.sectionId}:${i.ladder}`)).toEqual(['c:dance', 'b:rap', 'a:rap'])
    expect(items[0].shaky).toBe(true)
  })

  it('a shaky section that is not finished yet is listed too, so it comes up in practice', () => {
    const progress: Record<string, SectionProgress> = { a: markShaky(emptyProgress(), D) }
    expect(dueItems(progress, ['a'], D)).toEqual([])
    expect(dueItems(progress, ['a'], addDays(D, 1)).map((i) => i.sectionId)).toEqual(['a'])
  })
})
