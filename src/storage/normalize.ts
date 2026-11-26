/**
 * Fills in anything missing from a stored or imported save, field by field, so an older or partial
 * document always loads. Unknown fields are dropped. A complete save comes back unchanged.
 */
import { KID_COPY } from '../content/kid'
import { DEFAULT_REFS } from '../content/references'
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_HOLIDAY_MINUTES,
  DEFAULT_SCHOOL_MINUTES,
  STAGE_NAME_MAX,
  STAGE_THEMES,
  STICK_COLOURS,
  defaultSave,
  defaultSettings,
  defaultShowtime,
  defaultSound,
  defaultStage,
  SKILL_LESSON_IDS,
  WIZARD_STEPS,
  PART_NAME_MAX,
  PART_SPEEDS,
  type MyPart,
  type PartSpeed,
  type DayActivity,
  type LessonState,
  type SkillLessonId,
  type WizardState,
  type WizardStep,
  type DayState,
  type LadderProgress,
  type Line,
  type Marks,
  type Notes,
  type PlanSettings,
  type Reference,
  type Reflection,
  type ReviewState,
  type SaveData,
  type Section,
  type SectionProgress,
  type Show,
  type ShowtimeSettings,
  type SoundSettings,
  type StageSettings,
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

const clampNum = (v: unknown, lo: number, hi: number, d: number): number => Math.min(hi, Math.max(lo, num(v, d) as number))
const isDay = (k: string) => /^\d{4}-\d{2}-\d{2}$/.test(k)

function stage(v: unknown): StageSettings {
  const o = isObj(v) ? v : {}
  const d = defaultStage()
  return {
    name: str(o.name).trim().slice(0, STAGE_NAME_MAX),
    theme: (STAGE_THEMES as readonly string[]).includes(str(o.theme)) ? (o.theme as StageSettings['theme']) : d.theme,
    stick: (STICK_COLOURS as readonly string[]).includes(str(o.stick)) ? (o.stick as StageSettings['stick']) : d.stick,
  }
}

function sound(v: unknown): SoundSettings {
  const o = isObj(v) ? v : {}
  const d = defaultSound()
  return {
    voiceOn: bool(o.voiceOn, d.voiceOn),
    voiceVolume: clampNum(o.voiceVolume, 0, 1, d.voiceVolume),
    effectsOn: bool(o.effectsOn, d.effectsOn),
    effectsVolume: clampNum(o.effectsVolume, 0, 1, d.effectsVolume),
    audience: bool(o.audience, d.audience),
  }
}

function showtimeSettings(v: unknown): ShowtimeSettings {
  const o = isObj(v) ? v : {}
  const d = defaultShowtime()
  return { breaths: Math.round(clampNum(o.breaths, 1, 5, d.breaths)), walkOnSeconds: Math.round(clampNum(o.walkOnSeconds, 3, 30, d.walkOnSeconds)) }
}

function notes(v: unknown): Notes {
  const o = isObj(v) ? v : {}
  const teacher: Record<string, string> = {}
  if (isObj(o.teacher)) for (const [k, t] of Object.entries(o.teacher)) if (typeof t === 'string' && t.trim()) teacher[k] = t
  const f = isObj(o.forHer) ? o.forHer : null
  return { teacher, forHer: f && typeof f.text === 'string' && f.text.trim() ? { text: f.text, at: str(f.at), seen: bool(f.seen, false) } : null }
}

function activity(v: unknown): DayActivity {
  const o = isObj(v) ? v : {}
  return {
    seconds: Math.max(0, Math.round(num(o.seconds, 0) as number)),
    ticks: arr(o.ticks).filter((t): t is Obj => isObj(t) && typeof t.section === 'string' && typeof t.step === 'string').map((t) => ({ section: t.section as string, step: t.step as string })),
    shaky: strs(o.shaky),
  }
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

function lessons(v: unknown): LessonState {
  const o = isObj(v) ? v : {}
  const known = (x: unknown): x is SkillLessonId => typeof x === 'string' && (SKILL_LESSON_IDS as readonly string[]).includes(x)
  const done = [...new Set(arr(o.done).filter(known))]
  const videos: LessonState['videos'] = {}
  if (isObj(o.videos)) {
    for (const [k, x] of Object.entries(o.videos)) {
      if (!known(k) || !isObj(x) || typeof x.youtubeId !== 'string' || !YOUTUBE_ID.test(x.youtubeId)) continue
      videos[k] = { youtubeId: x.youtubeId, start: Math.max(0, Math.round((num(x.start, 0) as number) * 10) / 10) }
    }
  }
  return { done, videos }
}

function wizard(v: unknown): WizardState {
  const o = isObj(v) ? v : {}
  const known = (x: unknown): x is WizardStep => typeof x === 'string' && (WIZARD_STEPS as readonly string[]).includes(x)
  return { at: known(o.at) ? o.at : null, done: [...new Set(arr(o.done).filter(known))] }
}

/** Her parts: each needs an id, a source and a loop that runs forwards; the rest is filled in. */
function parts(v: unknown): MyPart[] {
  const out: MyPart[] = []
  const ids = new Set<string>()
  for (const x of arr(v)) {
    if (!isObj(x) || typeof x.id !== 'string' || !x.id || ids.has(x.id) || typeof x.source !== 'string' || !x.source) continue
    const from = num(x.from)
    const to = num(x.to)
    if (from == null || to == null || from < 0 || to <= from) continue
    ids.add(x.id)
    const name = str(x.name).trim().slice(0, PART_NAME_MAX).trim() || KID_COPY.room.partName.replace('{n}', String(out.length + 1))
    const done = PART_SPEEDS.filter((sp) => arr(x.done).includes(sp)) as PartSpeed[]
    out.push({ id: x.id, name, source: x.source, from, to, done, createdAt: str(x.createdAt, new Date(0).toISOString()) })
  }
  return out
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
  const log: Record<string, DayActivity> = {}
  if (isObj(o.activity)) for (const [k, v] of Object.entries(o.activity)) if (isDay(k)) log[k] = activity(v)
  const tour = isObj(o.tour) ? o.tour : {}
  const celebrated = isObj(o.celebrated) ? o.celebrated : {}
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
    stage: stage(o.stage),
    sound: sound(o.sound),
    showtime: showtimeSettings(o.showtime),
    notes: notes(o.notes),
    activity: log,
    tour: { seen: bool(tour.seen, false) },
    celebrated: { firstShowtime: bool(celebrated.firstShowtime, false) },
    narration: { on: bool(isObj(o.narration) ? o.narration.on : undefined, true) },
    lessons: lessons(o.lessons),
    wizard: wizard(o.wizard),
    parts: parts(o.parts),
  }
}

export function versionOf(raw: unknown): number | null {
  return isObj(raw) && typeof raw.schemaVersion === 'number' ? raw.schemaVersion : null
}
