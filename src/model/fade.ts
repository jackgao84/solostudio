/**
 * The fade-out step: a line's words hide a few at a time. Hidden words are spread out (the odd-placed
 * words go first, so none sit side by side until half the line is hidden), and the first word stays
 * as a cue until the last level. The order is fixed per line, so it fades the same way every time.
 */
import { seeded, shuffle } from './rng'

export const FADE_MAX_STEP = 3

/** Words hidden per level: about a quarter of the line, 1 to 3. */
export function fadeStep(n: number): number {
  return Math.min(FADE_MAX_STEP, Math.max(1, Math.ceil(n / 4)))
}

/** The level at which every word is hidden (0 for an empty line). */
export function fadeLevels(n: number): number {
  if (n <= 0) return 0
  return Math.ceil((n - 1) / fadeStep(n)) + 1
}

/** The order in which a line's words hide. */
export function fadeOrder(n: number, seed: string): number[] {
  const rand = seeded(`fade:${seed}:${n}`)
  const odd: number[] = []
  const even: number[] = []
  for (let i = 1; i < n; i++) (i % 2 === 1 ? odd : even).push(i)
  return n > 0 ? [...shuffle(odd, rand), ...shuffle(even, rand), 0] : []
}

export function hiddenWords(n: number, seed: string, level: number): Set<number> {
  if (n <= 0 || level <= 0) return new Set()
  if (level >= fadeLevels(n)) return new Set(Array.from({ length: n }, (_, i) => i))
  const count = Math.min(level * fadeStep(n), n - 1)
  return new Set(fadeOrder(n, seed).slice(0, count))
}

/** A section fades over as many levels as its longest line needs. */
export function sectionFadeLevels(wordCounts: readonly number[]): number {
  return wordCounts.reduce((a, n) => Math.max(a, fadeLevels(n)), 0)
}
