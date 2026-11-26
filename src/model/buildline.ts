/**
 * Build the line (version 1.1): a line's words shuffled into chips that she taps back in order. A chip
 * is taken when its word is the next one (the same word on two chips is the same); any other chip
 * just stays where it is. Nothing is counted: no misses, no score.
 */
import { seeded, shuffle } from './rng'

export interface Chip {
  id: number
  word: string
}

/** The words as shuffled chips, never in the line's own order (when there's more than one word). */
export function chipsFor(words: readonly string[], seed: string): Chip[] {
  const chips = words.map((word, id) => ({ id, word }))
  if (new Set(words).size < 2) return chips
  const rand = seeded(`build:${seed}`)
  for (let i = 0; i < 20; i++) {
    const out = shuffle(chips, rand)
    if (out.some((c, k) => c.word !== words[k])) return out
  }
  // Every shuffle came out in order (very short lines): move the first chip to the end.
  return [...chips.slice(1), chips[0]]
}

/** Tap a chip: it joins the line if its word is next. */
export function tapChip(words: readonly string[], chips: readonly Chip[], placed: readonly number[], chipId: number): { joined: boolean; placed: number[] } {
  const chip = chips.find((c) => c.id === chipId)
  if (!chip || placed.includes(chipId) || placed.length >= words.length || chip.word !== words[placed.length]) return { joined: false, placed: [...placed] }
  return { joined: true, placed: [...placed, chipId] }
}

/** The chip that comes next (for a peek), or null when the line is built. */
export function nextChip(words: readonly string[], chips: readonly Chip[], placed: readonly number[]): number | null {
  if (placed.length >= words.length) return null
  return chips.find((c) => !placed.includes(c.id) && c.word === words[placed.length])?.id ?? null
}

export function lineBuilt(words: readonly string[], placed: readonly number[]): boolean {
  return placed.length === words.length
}
