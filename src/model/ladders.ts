/**
 * The three ladders every section has. She ticks each rung herself ("I did it") or goes again; no
 * rung is ever scored. The words for each rung live in src/content/ladders.ts.
 */
import type { LadderId, Reference, RefRole, Section } from '../storage/schema'
import { spanOf } from './timing'

export type Source = 'listen' | 'track' | 'tutorial' | 'mirrored'
export type Words = 'show' | 'fade' | 'hidden' | 'optional'
export type Energy = 'none' | 'half' | 'full'

export interface StepDef {
  id: string
  ladder: LadderId
  source: Source
  /** Playback speed, 0.5–1. */
  speed: number
  words: Words
  /** A video is on screen (a reference to follow or watch). */
  video: boolean
  energy: Energy
  /** Plays from the section before through this one. */
  link: boolean
  /** The 8-count shows beside the lyrics. */
  counts: boolean
}

export const LADDER_IDS: readonly LadderId[] = ['rap', 'dance', 'together']

function step(id: string, ladder: LadderId, source: Source, speed: number, words: Words, energy: Energy, link = false): StepDef {
  return { id, ladder, source, speed, words, video: source !== 'track', energy, link, counts: source !== 'tutorial' }
}

export const LADDERS: Record<LadderId, readonly StepDef[]> = {
  rap: [
    step('rap-listen', 'rap', 'listen', 0.75, 'show', 'none'),
    step('rap-say', 'rap', 'track', 0.75, 'show', 'none'),
    step('rap-fade', 'rap', 'track', 0.75, 'fade', 'none'),
    step('rap-memory-75', 'rap', 'track', 0.75, 'hidden', 'none'),
    step('rap-memory-100', 'rap', 'track', 1, 'hidden', 'none'),
  ],
  dance: [
    step('dance-watch', 'dance', 'tutorial', 1, 'hidden', 'none'),
    step('dance-follow-50', 'dance', 'mirrored', 0.5, 'hidden', 'full'),
    step('dance-follow-75', 'dance', 'mirrored', 0.75, 'hidden', 'full'),
    step('dance-follow-100', 'dance', 'mirrored', 1, 'hidden', 'full'),
    step('dance-memory', 'dance', 'track', 1, 'hidden', 'full'),
  ],
  together: [
    step('together-mark-75', 'together', 'track', 0.75, 'optional', 'half'),
    step('together-mark-100', 'together', 'track', 1, 'optional', 'half'),
    step('together-full-100', 'together', 'track', 1, 'optional', 'full'),
    step('together-linked', 'together', 'track', 1, 'optional', 'full', true),
  ],
}

const BY_ID = new Map(LADDER_IDS.flatMap((l) => LADDERS[l].map((s) => [s.id, s] as const)))

export function stepById(id: string): StepDef | null {
  return BY_ID.get(id) ?? null
}

/** Which references each source can use, best first. */
export const REF_PREFERENCE: Record<Exclude<Source, 'track'>, readonly RefRole[]> = {
  listen: ['listen', 'original', 'slow'],
  tutorial: ['tutorialParts', 'tutorialFull'],
  mirrored: ['mirrored'],
}

function usable(r: Reference): boolean {
  return r.kind === 'youtube' ? !!r.youtubeId : !!r.mediaId
}

/** The reference a step plays for this section: the first preferred one marked on the section. */
export function pickReference(refs: readonly Reference[], section: Section, source: Source): Reference | null {
  if (source === 'track') return null
  const marked = (r: Reference) => usable(r) && !!spanOf(section.refs[r.id])
  for (const role of REF_PREFERENCE[source]) {
    const r = refs.find((x) => x.role === role && marked(x))
    if (r) return r
  }
  if (source === 'mirrored') return refs.find((r) => r.kind === 'local' && r.mirror && marked(r)) ?? null
  return null
}
