/**
 * The video a practice step plays (version 1.2). No step is ever blocked by missing marks:
 *  - a video marked on this section wins (in the step's order of preference, a teacher's mirrored
 *    demo included), and the marks cue it to the section (and let the lines and counts follow a
 *    video that plays in time with the music);
 *  - otherwise the right video for the step plays from a chapter time a grown-up added (a start on
 *    its own), or from the start: the listen-and-read video, the tutorial that covers this part, the
 *    mirrored follow-along.
 * Her own loop goes round the bit between two taps.
 */
import type { Reference, RefRole, SaveData, Section } from '../storage/schema'
import { REF_PREFERENCE, type Source } from './ladders'
import { tutorialRoles } from './path'
import { playRange, spanOf, type Span } from './timing'

export interface StepVideo {
  ref: Reference
  /** Where it starts playing. */
  from: number
  /** The section on this video, when it is marked (start and end). */
  span: Span | null
}

const usable = (r: Reference) => (r.kind === 'youtube' ? !!r.youtubeId : !!r.mediaId)

function roles(source: Exclude<Source, 'track'>, section: Section): RefRole[] {
  return source === 'tutorial' ? tutorialRoles(section) : [...REF_PREFERENCE[source]]
}

export function stepVideo(save: Pick<SaveData, 'refs'>, section: Section, source: Source): StepVideo | null {
  if (source === 'track') return null
  const candidates = roles(source, section).flatMap((role) => save.refs.filter((r) => r.role === role && usable(r)))
  if (source === 'mirrored') candidates.push(...save.refs.filter((r) => r.kind === 'local' && r.mirror && usable(r)))
  const marked = candidates.find((r) => spanOf(section.refs[r.id]))
  if (marked) {
    const span = spanOf(section.refs[marked.id])!
    return { ref: marked, from: playRange(span).from, span }
  }
  const chapter = candidates.find((r) => section.refs[r.id]?.start != null)
  if (chapter) return { ref: chapter, from: section.refs[chapter.id]!.start!, span: null }
  const first = candidates.find((r) => r.kind === 'youtube') ?? candidates[0]
  return first ? { ref: first, from: 0, span: null } : null
}

/** Her loop between two taps (either order), at least a second long. */
export function loopBetween(a: number, b: number): { from: number; to: number } {
  const from = Math.round(Math.min(a, b) * 100) / 100
  const to = Math.round(Math.max(Math.max(a, b), from + 1) * 100) / 100
  return { from, to }
}
