/**
 * Section timing. A grown-up marks where a section starts and ends on her track and on each
 * reference by tapping while it plays, then fine-tunes with nudges. Times are in each source's own
 * seconds, rounded to hundredths.
 */
import type { Marks, Section } from '../storage/schema'

export interface Span {
  start: number
  end: number
}

/** The shortest section, in seconds. */
export const MIN_SECTION = 1
/** The nudge buttons, in seconds. */
export const NUDGE_STEPS = [-0.5, -0.1, 0.1, 0.5] as const
/** How late a tap usually lands after the moment it means, in real (wall-clock) seconds. */
export const TAP_LATENCY = 0.15
/** Sections play from a little before their start, so she hears them coming. */
export const PRE_ROLL = 2

export function round2(x: number): number {
  return Math.round((x + Math.sign(x) * 1e-9) * 100) / 100
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x))
}

/**
 * The media time a tap means: the current time less the reaction time. The reaction time is in real
 * seconds, so at 50% speed the media has moved on only half as far.
 */
export function tapToMediaTime(currentTime: number, rate: number, latency: number = TAP_LATENCY): number {
  return Math.max(0, round2(currentTime - latency * rate))
}

const top = (duration: number | null) => (duration != null && Number.isFinite(duration) && duration > 0 ? duration : Infinity)

export function markStart(m: Marks, t: number, duration: number | null): Marks {
  const start = round2(clamp(t, 0, top(duration)))
  const end = m.end != null && m.end - start < MIN_SECTION - 1e-9 ? null : m.end
  return { start, end }
}

export function markEnd(m: Marks, t: number, duration: number | null): Marks {
  const end = round2(clamp(t, 0, top(duration)))
  if (m.start != null && end - m.start < MIN_SECTION - 1e-9) return { ...m }
  return { start: m.start, end }
}

export function nudge(m: Marks, which: 'start' | 'end', delta: number, duration: number | null): Marks {
  const now = m[which]
  if (now == null) return { ...m }
  let lo = 0
  let hi = top(duration)
  if (which === 'start' && m.end != null) hi = Math.min(hi, m.end - MIN_SECTION)
  if (which === 'end' && m.start != null) lo = Math.max(lo, m.start + MIN_SECTION)
  const next = round2(clamp(now + delta, lo, hi))
  return { ...m, [which]: next }
}

export function spanOf(m: Marks | null | undefined): Span | null {
  if (!m || m.start == null || m.end == null) return null
  if (m.end - m.start < MIN_SECTION - 1e-9) return null
  return { start: m.start, end: m.end }
}

/** A moment in one span, mapped proportionally onto another. */
export function mapTime(from: Span, to: Span, t: number): number {
  const len = from.end - from.start
  if (len <= 0) return to.start
  return to.start + ((t - from.start) * (to.end - to.start)) / len
}

export function playRange(span: Span, preRoll: number = PRE_ROLL): { from: number; to: number } {
  return { from: Math.max(0, round2(span.start - preRoll)), to: span.end }
}

/** Song order: by where each section starts on her track; unmarked ones last, oldest first. */
export function orderSections<T extends Pick<Section, 'track' | 'createdAt'>>(sections: readonly T[]): T[] {
  return sections
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const sa = a.s.track.start
      const sb = b.s.track.start
      if (sa != null && sb != null && sa !== sb) return sa - sb
      if (sa != null && sb == null) return -1
      if (sa == null && sb != null) return 1
      if (a.s.createdAt !== b.s.createdAt) return a.s.createdAt < b.s.createdAt ? -1 : 1
      return a.i - b.i
    })
    .map((x) => x.s)
}

export function previousSection<T extends Pick<Section, 'id' | 'track' | 'createdAt'>>(sections: readonly T[], id: string): T | null {
  const ordered = orderSections(sections)
  const i = ordered.findIndex((s) => s.id === id)
  return i > 0 ? ordered[i - 1] : null
}

/** "1:05.4". */
export function formatTime(t: number): string {
  const tenths = Math.round(Math.max(0, t) * 10 + 1e-6)
  const m = Math.floor(tenths / 600)
  const s = Math.floor((tenths % 600) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${tenths % 10}`
}
