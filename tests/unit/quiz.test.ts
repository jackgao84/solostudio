/**
 * Quick test, missing words: some words are blanked out, she says them, then taps to reveal and
 * check herself. Nothing is marked right or wrong.
 */
import { describe, expect, it } from 'vitest'
import { chooseBlanks } from '../../src/model/quiz'

describe('choosing blanks', () => {
  it('blanks about a third of the words, at least one, never two side by side', () => {
    for (let n = 1; n <= 30; n++) {
      for (const seed of ['a', 'b', 'line-7']) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const blanks = chooseBlanks(n, seed, attempt)
          expect(blanks.length, `n=${n}`).toBe(Math.max(1, Math.round(n / 3)))
          expect([...blanks].sort((a, b) => a - b)).toEqual(blanks)
          for (let i = 1; i < blanks.length; i++) expect(blanks[i] - blanks[i - 1], `n=${n}`).toBeGreaterThan(1)
          for (const b of blanks) {
            expect(b).toBeGreaterThanOrEqual(0)
            expect(b).toBeLessThan(n)
          }
        }
      }
    }
    expect(chooseBlanks(0, 'a', 0)).toEqual([])
  })

  it('is the same for the same attempt, and changes when she asks for new blanks', () => {
    for (let n = 4; n <= 20; n++) {
      expect(chooseBlanks(n, 'line-1', 2)).toEqual(chooseBlanks(n, 'line-1', 2))
      const sets = new Set(Array.from({ length: 5 }, (_, a) => chooseBlanks(n, 'line-1', a).join(',')))
      expect(sets.size, `n=${n}`).toBeGreaterThanOrEqual(2)
    }
  })
})
