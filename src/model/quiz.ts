/**
 * Quick test, missing words: about a third of each line's words are blanked (never two side by side),
 * she says them, then taps to reveal and check herself. Each new attempt blanks different words.
 */
import { seeded, shuffle } from './rng'

function pick(n: number, seed: string): number[] {
  const count = Math.max(1, Math.round(n / 3))
  const rand = seeded(seed)
  const chosen = new Set<number>()
  for (const i of shuffle(Array.from({ length: n }, (_, k) => k), rand)) {
    if (chosen.size >= count) break
    if (chosen.has(i - 1) || chosen.has(i + 1)) continue
    chosen.add(i)
  }
  // A greedy pass can box itself in; the evenly spaced fallback always fits.
  if (chosen.size < count) {
    chosen.clear()
    const offset = Math.floor(rand() * 2)
    for (let i = offset; i < n && chosen.size < count; i += 2) chosen.add(i)
    for (let i = 1 - offset; i < n && chosen.size < count; i += 2) if (!chosen.has(i - 1) && !chosen.has(i + 1)) chosen.add(i)
  }
  return [...chosen].sort((a, b) => a - b)
}

export function chooseBlanks(n: number, seed: string, attempt: number): number[] {
  if (n <= 0) return []
  if (n === 1) return [0]
  let blanks = pick(n, `blanks:${seed}:${attempt}`)
  if (attempt > 0) {
    const before = chooseBlanks(n, seed, attempt - 1).join(',')
    for (let salt = 1; salt < 20 && blanks.join(',') === before; salt++) blanks = pick(n, `blanks:${seed}:${attempt}:${salt}`)
  }
  return blanks
}
