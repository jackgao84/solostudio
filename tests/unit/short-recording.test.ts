/**
 * A recording stopped straight away (found while making 1.3's checks reliable): WebKit's recorder can
 * hand back an empty clip when Stop comes a few milliseconds after the start, and the app kept that
 * empty clip (pushing out one of her newest 3) and tried to play it. Now:
 *  - a recording runs for at least a moment: a Stop before that takes effect when it has passed;
 *  - a clip with nothing in it is never kept; she is told nothing was recorded and can record again.
 */
import { describe, expect, it } from 'vitest'
import { KID_COPY } from '../../src/content/kid'
import { MIN_RECORD_MS, keepable, stopDelay } from '../../src/model/clips'

describe('a recording stopped straight away', () => {
  it('still runs for a moment, so there is something in it', () => {
    expect(MIN_RECORD_MS).toBeGreaterThanOrEqual(500)
    expect(MIN_RECORD_MS).toBeLessThanOrEqual(1500)
    expect(stopDelay(0)).toBe(MIN_RECORD_MS)
    expect(stopDelay(30)).toBe(MIN_RECORD_MS - 30)
    expect(stopDelay(MIN_RECORD_MS)).toBe(0)
    expect(stopDelay(60_000)).toBe(0)
  })

  it('is never kept when it has nothing in it', () => {
    expect(keepable(0)).toBe(false)
    expect(keepable(4841)).toBe(true)
  })

  it('tells her so, kindly, and she can record again', () => {
    expect(KID_COPY.record.nothingRecorded).toMatch(/Record/)
  })
})
