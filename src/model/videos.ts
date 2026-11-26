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
import { guideReady } from './guide'
import { REF_PREFERENCE, stepById, type Source, type StepDef } from './ladders'
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

function roles(source: Exclude<Source, 'track'>, section: Pick<Section, 'name'>): RefRole[] {
  return source === 'tutorial' ? tutorialRoles(section) : [...REF_PREFERENCE[source]]
}

export function stepVideo(save: Pick<SaveData, 'refs'>, section: Pick<Section, 'refs' | 'name'>, source: Source): StepVideo | null {
  if (source === 'track') return null
  const ofRoles = (rs: readonly RefRole[]) => rs.flatMap((role) => save.refs.filter((r) => r.role === role && usable(r)))
  const localMirror = source === 'mirrored' ? save.refs.filter((r) => r.kind === 'local' && r.mirror && usable(r)) : []
  // Marked on this section: the step's usual order of preference (as in 1.1).
  const marked = [...ofRoles(REF_PREFERENCE[source]), ...localMirror].find((r) => spanOf(section.refs[r.id]))
  if (marked) {
    const span = spanOf(section.refs[marked.id])!
    return { ref: marked, from: playRange(span).from, span }
  }
  // Not marked: the video that covers this part, from a chapter time or its start.
  const candidates = [...ofRoles(roles(source, section)), ...localMirror]
  const chapter = candidates.find((r) => section.refs[r.id]?.start != null)
  if (chapter) return { ref: chapter, from: section.refs[chapter.id]!.start!, span: null }
  const first = candidates.find((r) => r.kind === 'youtube') ?? candidates[0]
  return first ? { ref: first, from: 0, span: null } : null
}

/** How the rap ladder fades the singer's voice (version 1.4): with the guide file, or with the karaoke videos. */
export type RapMode = 'guide' | 'videos'

export function rapMode(save: Pick<SaveData, 'guide' | 'track'>): RapMode {
  return guideReady(save) ? 'guide' : 'videos'
}

/**
 * With no guide file, the rap ladder fades the singer's voice with videos (version 1.4): listen with
 * the listen-and-read video, say it with Voice guide, say it with Karaoke, then from memory over her
 * track. With a guide file every rung plays her track, with the voice at Full, Light, then Off.
 */
const RAP_VIDEOS: Record<string, Source> = {
  'rap-listen': 'listen',
  'rap-say': 'voiceGuide',
  'rap-fade': 'karaoke',
  'rap-memory-75': 'track',
  'rap-memory-100': 'track',
}

const hasRole = (save: Pick<SaveData, 'refs'>, role: RefRole) => save.refs.some((r) => r.role === role && usable(r))

/**
 * What a step plays. The dance and together ladders play their own source. The rap ladder plays her
 * track throughout with a guide file; otherwise its videos, and where a grown-up removed a karaoke
 * video, the 1.3 rung (her track, or the listen-and-read video on a part with no lines, where the
 * words would light up).
 */
export function stepSource(step: Pick<StepDef, 'id' | 'ladder' | 'source' | 'words'>, section: Pick<Section, 'lines'>, save: Pick<SaveData, 'refs' | 'guide' | 'track'>): Source {
  if (step.ladder !== 'rap') return step.source
  if (rapMode(save) === 'guide') return 'track'
  const video = RAP_VIDEOS[step.id] ?? step.source
  if ((video === 'voiceGuide' || video === 'karaoke') && hasRole(save, video)) return video
  if (video === 'listen') return 'listen'
  if (section.lines.length) return step.source
  return step.words === 'show' ? 'listen' : 'track'
}

/**
 * A rung on a karaoke video that isn't marked on this section (no start tapped on it) opens in the
 * practice room on that video, with her loop buttons (version 1.4): the room's source id, or null when
 * the rung stays on the practice screen.
 */
export function stepRoom(save: Pick<SaveData, 'refs' | 'guide' | 'track'>, section: Section, step: StepDef): string | null {
  const source = stepSource(step, section, save)
  if (source !== 'voiceGuide' && source !== 'karaoke') return null
  const v = stepVideo(save, section, source)
  if (!v || v.span || v.from > 0 || section.refs[v.ref.id]?.start != null) return null
  return v.ref.id
}

/** Where a rung opens: the practice screen, or the practice room on its karaoke video. `extra` is added to the query (session=1). */
export function stepRoute(save: Pick<SaveData, 'refs' | 'guide' | 'track' | 'sections'>, sectionId: string, stepId: string, extra = ''): string {
  const section = save.sections.find((s) => s.id === sectionId)
  const step = stepById(stepId)
  const room = section && step ? stepRoom(save, section, step) : null
  if (room) return `/room?section=${encodeURIComponent(sectionId)}&step=${encodeURIComponent(stepId)}&source=${encodeURIComponent(room)}${extra ? `&${extra}` : ''}`
  return `/practice/${sectionId}/${stepId}${extra ? `?${extra}` : ''}`
}

/** Her loop between two taps (either order), at least a second long. */
export function loopBetween(a: number, b: number): { from: number; to: number } {
  const from = Math.round(Math.min(a, b) * 100) / 100
  const to = Math.round(Math.max(Math.max(a, b), from + 1) * 100) / 100
  return { from, to }
}
