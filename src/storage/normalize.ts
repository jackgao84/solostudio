/**
 * Fills in anything missing from a stored or imported save, field by field, so an older or partial
 * document always loads. Unknown fields are dropped. A complete save comes back unchanged.
 */
import { DEFAULT_REFS } from '../content/references'
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_HOLIDAY_MINUTES,
  DEFAULT_SCHOOL_MINUTES,
  defaultSave,
  defaultSettings,
  type DayState,
  type LadderProgress,
  type Line,
  type Marks,
  type PlanSettings,
  type Reference,
  type Reflection,
  type ReviewState,
  type SaveData,
  type Section,
  type SectionProgress,
  type Show,
} from './schema'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d)
const num = (v: unknown, d: number | null = null): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const strs = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === 'string')

function marks(v: unknown): Marks {
  const o = isObj(v) ? v : {}
  return { start: num(o.start), end: num(o.end) }
}

function line(v: unknown, i: number): Line {
  const o = isObj(v) ? v : {}
  return {
    id: str(o.id, `line-${i + 1}`),
    lyric: str(o.lyric),
    lang: o.lang === 'ko' ? 'ko' : 'en',
    meaning: str(o.meaning),
    breaths: arr(o.breaths).filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0),
    time: num(o.time),
  }
}

function section(v: unknown, i: number): Section {
  const o = isObj(v) ? v : {}
  const refs: Record<string, Marks> = {}
  if (isObj(o.refs)) for (const [k, m] of Object.entries(o.refs)) refs[k] = marks(m)
  return {
    id: str(o.id, `section-${i + 1}`),
    name: str(o.name, `Section ${i + 1}`),
    lines: arr(o.lines).map(line),
    track: marks(o.track),
    refs,
    createdAt: str(o.createdAt, new Date(0).toISOString()),
  }
}

function reference(v: unknown): Reference | null {
  if (!isObj(v) || typeof v.id !== 'string') return null
  const roles = ['listen', 'original', 'performance', 'mirrored', 'tutorialFull', 'tutorialParts', 'slow', 'local']
  return {
    id: v.id,
    role: (roles.includes(str(v.role)) ? v.role : 'local') as Reference['role'],
    label: str(v.label),
    kind: v.kind === 'local' ? 'local' : 'youtube',
    youtubeId: str(v.youtubeId),
    mediaId: typeof v.mediaId === 'string' ? v.mediaId : null,
    fileName: str(v.fileName),
    synced: bool(v.synced, true),
    alreadyMirrored: bool(v.alreadyMirrored, false),
    mirror: bool(v.mirror, false),
  }
}

function review(v: unknown): ReviewState | null {
  if (!isObj(v) || typeof v.due !== 'string') return null
  return { step: num(v.step, 0) as number, due: v.due, shaky: bool(v.shaky, false) }
}

function ladder(v: unknown): LadderProgress {
  const o = isObj(v) ? v : {}
  return { done: strs(o.done), fade: num(o.fade, 0) as number, finishedAt: typeof o.finishedAt === 'string' ? o.finishedAt : null, review: review(o.review) }
}

function progress(v: unknown): SectionProgress {
  const o = isObj(v) ? v : {}
  return { rap: ladder(o.rap), dance: ladder(o.dance), together: ladder(o.together), shaky: bool(o.shaky, false), shakyDue: typeof o.shakyDue === 'string' ? o.shakyDue : null }
}

function show(v: unknown): Show | null {
  if (!isObj(v) || typeof v.date !== 'string') return null
  return { name: str(v.name), date: v.date }
}

function plan(v: unknown): PlanSettings | null {
  if (!isObj(v) || typeof v.startDate !== 'string') return null
  return {
    startDate: v.startDate,
    holidayStart: typeof v.holidayStart === 'string' ? v.holidayStart : null,
    holidayEnd: typeof v.holidayEnd === 'string' ? v.holidayEnd : null,
    schoolMinutes: num(v.schoolMinutes, DEFAULT_SCHOOL_MINUTES) as number,
    holidayMinutes: num(v.holidayMinutes, DEFAULT_HOLIDAY_MINUTES) as number,
    lightWeekday: num(v.lightWeekday, 0) as number,
  }
}

function day(v: unknown): DayState {
  const o = isObj(v) ? v : {}
  return { order: strs(o.order), done: strs(o.done) }
}

function reflection(v: unknown): Reflection | null {
  if (!isObj(v) || typeof v.id !== 'string') return null
  const kinds = ['showtime', 'clip', 'family']
  return {
    id: v.id,
    at: str(v.at),
    kind: (kinds.includes(str(v.kind)) ? v.kind : 'showtime') as Reflection['kind'],
    target: str(v.target, 'run'),
    wentWell: str(v.wentWell),
    workOn: str(v.workOn),
  }
}

export function normalize(raw: unknown): SaveData {
  const d = defaultSave()
  const o = isObj(raw) ? raw : {}
  const setup = isObj(o.setup) ? o.setup : {}
  const profile = isObj(o.profile) ? o.profile : {}
  const track = isObj(o.track) ? o.track : {}
  const tempo = isObj(o.tempo) ? o.tempo : {}
  const settings = isObj(o.settings) ? o.settings : {}
  const defaults = defaultSettings()
  const refs = Array.isArray(o.refs) ? (o.refs.map(reference).filter(Boolean) as Reference[]) : DEFAULT_REFS.map((r) => ({ ...r }))
  const progressOut: Record<string, SectionProgress> = {}
  if (isObj(o.progress)) for (const [k, v] of Object.entries(o.progress)) progressOut[k] = progress(v)
  const days: Record<string, DayState> = {}
  if (isObj(o.days)) for (const [k, v] of Object.entries(o.days)) days[k] = day(v)
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    setup: { complete: bool(setup.complete, false), persistAsked: bool(setup.persistAsked, false), persisted: typeof setup.persisted === 'boolean' ? setup.persisted : null },
    profile: { name: str(profile.name), songName: str(profile.songName) },
    show: show(o.show),
    pastShows: arr(o.pastShows).map(show).filter((s): s is Show => !!s),
    plan: plan(o.plan),
    track: {
      mediaId: typeof track.mediaId === 'string' ? track.mediaId : null,
      fileName: str(track.fileName),
      duration: num(track.duration),
      standInYoutubeId: str(track.standInYoutubeId, d.track.standInYoutubeId),
    },
    refs,
    sections: arr(o.sections).map(section),
    tempo: { bpm: num(tempo.bpm), offset: num(tempo.offset) },
    progress: progressOut,
    days,
    reflections: arr(o.reflections).map(reflection).filter((r): r is Reflection => !!r),
    settings: {
      faceLabUrl: str(settings.faceLabUrl, defaults.faceLabUrl) || defaults.faceLabUrl,
      upAnywayUrl: str(settings.upAnywayUrl, defaults.upAnywayUrl) || defaults.upAnywayUrl,
      showtimeLyrics: bool(settings.showtimeLyrics, defaults.showtimeLyrics),
      trackSpeed: Math.min(1, Math.max(0.5, num(settings.trackSpeed, defaults.trackSpeed) as number)),
      mirrorClips: bool(settings.mirrorClips, defaults.mirrorClips),
    },
  }
}

export function versionOf(raw: unknown): number | null {
  return isObj(raw) && typeof raw.schemaVersion === 'number' ? raw.schemaVersion : null
}
