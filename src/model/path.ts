/**
 * Her lesson path (version 1.2), the home page's backbone. It mixes:
 *  - section lessons built from her sections: Rap, Dance and Together for each, holding that ladder's
 *    rungs. Default order: each section's Rap then Dance, in song order; then each Together; then
 *    Showtime at the end;
 *  - the seven skill lessons, each placed just before the first lesson that needs it.
 * The path order is the default; the plan still decides which lessons are today's.
 * Pure, so the checks can read it.
 */
import type { LadderId, Reference, RefRole, SaveData, Section, SkillLessonId, WizardStep } from '../storage/schema'
import { orderSections, spanOf } from './timing'
import { LADDERS } from './ladders'

export type PathItem = { kind: 'skill'; id: SkillLessonId } | { kind: 'section'; sectionId: string; ladder: LadderId } | { kind: 'showtime' }

export type Need = LadderId | 'showtime'

/** Which skill lessons each kind of lesson needs first, in path order. */
export const SKILL_NEEDS: Record<Need, readonly SkillLessonId[]> = {
  rap: ['counting', 'voice-warm-up'],
  dance: ['counting', 'learning-a-dance'],
  together: ['marking', 'breathing'],
  showtime: ['expressions', 'performing'],
}

export function pathKey(i: PathItem): string {
  return i.kind === 'skill' ? `skill:${i.id}` : i.kind === 'section' ? `section:${i.sectionId}:${i.ladder}` : 'showtime'
}

export function lessonPath(save: Pick<SaveData, 'sections'>): PathItem[] {
  const sections = orderSections(save.sections)
  const lessons: { item: PathItem; need: Need }[] = []
  for (const s of sections) for (const ladder of ['rap', 'dance'] as const) lessons.push({ item: { kind: 'section', sectionId: s.id, ladder }, need: ladder })
  for (const s of sections) lessons.push({ item: { kind: 'section', sectionId: s.id, ladder: 'together' }, need: 'together' })
  lessons.push({ item: { kind: 'showtime' }, need: 'showtime' })
  const placed = new Set<SkillLessonId>()
  const out: PathItem[] = []
  for (const l of lessons) {
    // With no sections yet, every skill lesson still has its place, before Showtime.
    const needs: Need[] = l.need === 'showtime' ? ['rap', 'dance', 'together', 'showtime'] : [l.need]
    for (const id of needs.flatMap((n) => SKILL_NEEDS[n])) {
      if (placed.has(id)) continue
      placed.add(id)
      out.push({ kind: 'skill', id })
    }
    out.push(l.item)
  }
  return out
}

export function isDone(save: Pick<SaveData, 'lessons' | 'progress' | 'celebrated'>, i: PathItem): boolean {
  if (i.kind === 'skill') return save.lessons.done.includes(i.id)
  if (i.kind === 'showtime') return save.celebrated.firstShowtime
  const p = save.progress[i.sectionId]?.[i.ladder]
  return !!p && LADDERS[i.ladder].every((s) => p.done.includes(s.id))
}

/** The skill lessons something needs that she hasn't done yet, in path order. */
export function skillsDue(save: Pick<SaveData, 'lessons'>, need: Need): SkillLessonId[] {
  return SKILL_NEEDS[need].filter((id) => !save.lessons.done.includes(id))
}

/** The first lesson on the path she hasn't finished. */
export function nextUp(save: SaveData): PathItem | null {
  return lessonPath(save).find((i) => !isDone(save, i)) ?? null
}

const usable = (r: Reference) => (r.kind === 'youtube' ? !!r.youtubeId : !!r.mediaId)

/** The tutorial with counts covers the chorus and the dance break; the full one covers the rest. */
export function tutorialRoles(section: Pick<Section, 'name'>): RefRole[] {
  return /chorus|dance ?break/i.test(section.name) && !/pre-?chorus|post-?chorus/i.test(section.name) ? ['tutorialParts', 'tutorialFull'] : ['tutorialFull', 'tutorialParts']
}

const VIDEO_ROLES: Record<LadderId, (s: Section) => RefRole[]> = {
  rap: () => ['listen', 'original', 'slow'],
  dance: (s) => tutorialRoles(s),
  together: () => ['mirrored'],
}

/**
 * The video a section lesson shows: one marked on this section if there is one (it starts there),
 * else the right one for the ladder from its start. No marks are ever needed.
 */
export function sectionLessonVideo(save: Pick<SaveData, 'refs'>, section: Section, ladder: LadderId): { ref: Reference; start: number } | null {
  const roles = VIDEO_ROLES[ladder](section)
  const candidates = roles.flatMap((role) => save.refs.filter((r) => r.role === role && usable(r)))
  // Marked (or given a chapter time) on this section: the usual order of preference, as in 1.1.
  const preferred = (ladder === 'dance' ? (['tutorialParts', 'tutorialFull'] as RefRole[]) : roles).flatMap((role) => save.refs.filter((r) => r.role === role && usable(r)))
  const marked = preferred.find((r) => section.refs[r.id]?.start != null)
  if (marked) return { ref: marked, start: section.refs[marked.id]!.start! }
  const first = candidates[0]
  return first ? { ref: first, start: 0 } : null
}

/** What a section lesson needs that setup hasn't covered yet (as wizard steps). */
export function lessonGaps(save: SaveData, sectionId: string, ladder: LadderId): WizardStep[] {
  const s = save.sections.find((x) => x.id === sectionId)
  if (!s) return []
  const gaps: WizardStep[] = []
  if (!save.track.mediaId && !save.track.standInYoutubeId) gaps.push('track')
  if (ladder === 'rap' && !s.lines.length) gaps.push('lines')
  if (!spanOf(s.track)) gaps.push('starts')
  return gaps
}
