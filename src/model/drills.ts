/**
 * Start anywhere and jump back in (the rejoin drill).
 *
 * Start anywhere drops her into a random section: shaky sections are SHAKY_WEIGHT times as likely,
 * and she never lands in the same one twice in a row.
 *
 * Jump back in plays a section of her track and, once in the rep, either the music drops out for 2 to
 * 4 seconds while the track keeps its place, or it jumps ahead one line (from inside a line to the
 * start of the next). She keeps going and picks it back up. Pure, with the randomness passed in.
 */
import type { Span } from './timing'

export const SHAKY_WEIGHT = 3
export const DROPOUT_MIN_S = 2
export const DROPOUT_MAX_S = 4
/** Room before a drop-out starts (she gets going first) and after it ends (she picks it back up). */
const BEFORE_S = 1
const AFTER_S = 0.4

export function pickSection(ids: readonly string[], shaky: ReadonlySet<string>, rand: () => number, previous: string | null): string | null {
  if (ids.length === 0) return null
  const pool = ids.length > 1 ? ids.filter((id) => id !== previous) : ids.slice()
  const weights = pool.map((id) => (shaky.has(id) ? SHAKY_WEIGHT : 1))
  let r = rand() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r < 0) return pool[i]
  }
  return pool[pool.length - 1]
}

export type RejoinEvent = { kind: 'dropout'; at: number; seconds: number } | { kind: 'jump'; at: number; to: number }

const round1 = (x: number) => Math.round(x * 10) / 10

function dropout(span: Span, rand: () => number): RejoinEvent | null {
  // Work on a 0.1 s grid so rounding can never push the drop-out outside the section.
  const lo = Math.ceil((span.start + BEFORE_S) * 10 - 1e-6) / 10
  const hiEnd = Math.floor((span.end - AFTER_S) * 10 + 1e-6) / 10
  const room = hiEnd - lo
  if (room < DROPOUT_MIN_S - 1e-9) return null
  const seconds = Math.floor((DROPOUT_MIN_S + rand() * (Math.min(DROPOUT_MAX_S, room) - DROPOUT_MIN_S)) * 10 + 1e-6) / 10
  const latest = round1(hiEnd - seconds)
  const at = round1(lo + rand() * Math.max(0, latest - lo))
  return { kind: 'dropout', at: Math.min(Math.max(at, lo), latest), seconds }
}

/** One rejoin moment for a rep over `span`, given the section's line starts (track seconds). */
export function planRejoin(starts: readonly number[], span: Span, rand: () => number): RejoinEvent | null {
  const inside = starts.filter((t) => t >= span.start && t <= span.end)
  // A jump needs a line to leave and a later one to land on.
  const jumps: { from: number; to: number }[] = []
  for (let i = 0; i + 1 < inside.length; i++) if (inside[i + 1] - inside[i] >= 0.8) jumps.push({ from: inside[i], to: inside[i + 1] })
  const wantJump = jumps.length > 0 && rand() < 0.5
  if (wantJump) {
    const j = jumps[Math.floor(rand() * jumps.length) % jumps.length]
    const at = round1(j.from + 0.3 + rand() * Math.max(0, (j.to - j.from) * 0.4 - 0.3))
    return { kind: 'jump', at: Math.min(at, j.to - 0.3), to: j.to }
  }
  return dropout(span, rand)
}
