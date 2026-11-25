/**
 * Line sync. Tap-along records when each line starts on her track (in the track's own seconds), so
 * one tap-along serves every speed. Lines light up a moment early: LINE_LEAD real seconds, which is
 * LINE_LEAD × rate in media seconds, so it feels the same at 50% as at 100%.
 */
import { tapToMediaTime, type Span } from './timing'

/** Lines light up this many real seconds before they start. */
export const LINE_LEAD = 0.2
/** Two line starts must be at least this far apart (media seconds). */
export const MIN_LINE_GAP = 0.3
/** Words are spread over this share of a line; the rest is the breath before the next line. */
export const WORDS_SHARE = 0.85

export function wordsOf(lyric: string): string[] {
  return lyric.split(/\s+/).filter(Boolean)
}

/**
 * Start times for every line: tapped times as they are; untimed lines spread evenly between their
 * timed neighbours (or the section's start and end). Null when lines are untimed and there are no marks.
 */
export function lineStarts(times: readonly (number | null)[], span: Span | null): number[] | null {
  const n = times.length
  if (n === 0) return []
  if (times.every((t) => t != null)) return times.slice() as number[]
  if (!span) return null
  const out: number[] = new Array(n)
  let i = 0
  while (i < n) {
    if (times[i] != null) {
      out[i] = times[i] as number
      i++
      continue
    }
    let j = i
    while (j < n && times[j] == null) j++
    const m = j - i
    const next = j < n ? (times[j] as number) : span.end
    if (i === 0) {
      // A leading run starts at the section's start.
      for (let k = 0; k < m; k++) out[i + k] = span.start + ((next - span.start) * k) / m
    } else {
      const prev = out[i - 1]
      for (let k = 0; k < m; k++) out[i + k] = prev + ((next - prev) * (k + 1)) / (m + 1)
    }
    i = j
  }
  return out.map((x) => Math.round(x * 1000) / 1000)
}

/** The line lit at media time `t` while playing at `rate`: -1 before the first. */
export function activeLine(starts: readonly number[], t: number, rate: number, lead: number = LINE_LEAD): number {
  let active = -1
  for (let i = 0; i < starts.length; i++) if (starts[i] - lead * rate <= t + 1e-9) active = i
  return active
}

/**
 * Tap-along: record line `index` at the moment of a tap. Null (nothing changes) when the tap isn't
 * after the line before. Later lines that are no longer after it lose their times.
 */
export function recordLineTap(times: readonly (number | null)[], index: number, currentTime: number, rate: number): (number | null)[] | null {
  const v = tapToMediaTime(currentTime, rate)
  for (let k = index - 1; k >= 0; k--) {
    const prev = times[k]
    if (prev != null) {
      if (v < prev + MIN_LINE_GAP) return null
      break
    }
  }
  const out = times.slice()
  out[index] = v
  for (let k = index + 1; k < out.length; k++) {
    const later = out[k]
    if (later != null && later < v + MIN_LINE_GAP) out[k] = null
  }
  return out
}

/**
 * How many words of a line have been said by media time `t` (karaoke): words share the first
 * WORDS_SHARE of the line, longer words taking longer. The word being said is at index litWords().
 */
export function litWords(words: readonly string[], lineStart: number, lineEnd: number, t: number): number {
  const n = words.length
  if (n === 0 || t <= lineStart) return 0
  const span = Math.max(0.05, (lineEnd - lineStart) * WORDS_SHARE)
  const weights = words.map((w) => Math.max(1, w.replace(/[^\p{L}\p{N}]/gu, '').length))
  const total = weights.reduce((a, b) => a + b, 0)
  let at = lineStart
  let done = 0
  for (const w of weights) {
    at += (span * w) / total
    if (t >= at - 1e-9) done++
    else break
  }
  return done
}
