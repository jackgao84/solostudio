/**
 * The fade-out step of the rap ladder: the words of each line fade a few at a time until she says
 * the whole section from memory. Spacing rule: hidden words are spread out (never two side by side)
 * until half the line is gone, and the first word stays as a cue until the very last level.
 */
import { describe, expect, it } from 'vitest'
import { FADE_MAX_STEP, fadeLevels, fadeOrder, hiddenWords, sectionFadeLevels } from '../../src/model/fade'

const SIZES = Array.from({ length: 24 }, (_, i) => i + 1)
const SEEDS = ['line-a', 'line-b', 'l3', 'x']

describe('fading words a few at a time', () => {
  it('level 0 shows every word and the last level hides them all', () => {
    for (const n of SIZES) {
      for (const seed of SEEDS) {
        expect(hiddenWords(n, seed, 0).size).toBe(0)
        expect(hiddenWords(n, seed, fadeLevels(n)).size).toBe(n)
        expect(hiddenWords(n, seed, fadeLevels(n) + 5).size).toBe(n)
      }
    }
    expect(fadeLevels(0)).toBe(0)
  })

  it('each level hides at least one and at most a few more words, and never brings one back', () => {
    expect(FADE_MAX_STEP).toBe(3)
    for (const n of SIZES) {
      for (const seed of SEEDS) {
        let before = hiddenWords(n, seed, 0)
        for (let level = 1; level <= fadeLevels(n); level++) {
          const now = hiddenWords(n, seed, level)
          for (const i of before) expect(now.has(i), `n=${n} level ${level}: word ${i} came back`).toBe(true)
          const added = now.size - before.size
          expect(added, `n=${n} level ${level}`).toBeGreaterThanOrEqual(1)
          expect(added, `n=${n} level ${level}`).toBeLessThanOrEqual(FADE_MAX_STEP)
          before = now
        }
      }
    }
  })

  it('spreads hidden words out: none side by side until half the line is hidden', () => {
    for (const n of SIZES) {
      for (const seed of SEEDS) {
        for (let level = 0; level <= fadeLevels(n); level++) {
          const hidden = hiddenWords(n, seed, level)
          if (hidden.size > Math.floor(n / 2)) continue
          for (const i of hidden) expect(hidden.has(i + 1), `n=${n} level ${level}: ${i} and ${i + 1}`).toBe(false)
        }
      }
    }
  })

  it('keeps the first word as a cue until the last level', () => {
    for (const n of SIZES) {
      for (const seed of SEEDS) {
        for (let level = 0; level < fadeLevels(n); level++) expect(hiddenWords(n, seed, level).has(0), `n=${n} level ${level}`).toBe(false)
      }
    }
  })

  it('is the same every time for the same line', () => {
    for (const n of SIZES) {
      expect(fadeOrder(n, 'line-a')).toEqual(fadeOrder(n, 'line-a'))
      expect([...fadeOrder(n, 'line-a')].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i))
    }
  })

  it('a section has as many levels as its longest line', () => {
    expect(sectionFadeLevels([3, 12, 7])).toBe(fadeLevels(12))
    expect(sectionFadeLevels([])).toBe(0)
  })
})
