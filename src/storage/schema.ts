/**
 * The save document: everything the app keeps except media (her track, local videos and clips live
 * in IndexedDB, see media.ts). One JSON document under KEYS.save, versioned.
 *
 * Nothing here grades her: there are no scores, points, streaks or percentages. A step is either
 * ticked ("I did it") or not yet.
 */
import { DEFAULT_REFS } from '../content/references'

/**
 * 1: version 1.0. 2: version 1.1 (stage, sounds, Showtime routine, notes, practice log, tour, celebrations).
 * 3: version 1.2 (narration, her lessons, the setup wizard). 4: version 1.3 (her own parts).
 */
export const CURRENT_SCHEMA_VERSION = 4

export type Lang = 'en' | 'ko'

/** One rap line, typed on the iPad by a grown-up. Korean lines are written in English letters by sound. */
export interface Line {
  id: string
  lyric: string
  lang: Lang
  /** Optional meaning line (for Korean lines). */
  meaning: string
  /** Word indices after which she breathes (a breath mark sits in the gap after word i). */
  breaths: number[]
  /** When the line starts on her track, in seconds (from tap-along); null until timed. */
  time: number | null
}

/** Start and end of a section on one source, in that source's seconds. */
export interface Marks {
  start: number | null
  end: number | null
}

export interface Section {
  id: string
  name: string
  lines: Line[]
  /** Where the section is on her track. */
  track: Marks
  /** Where the section is on each reference, by reference id. */
  refs: Record<string, Marks>
  createdAt: string
}

export type RefRole = 'listen' | 'original' | 'performance' | 'mirrored' | 'tutorialFull' | 'tutorialParts' | 'slow' | 'local'

export interface Reference {
  id: string
  role: RefRole
  /** The grown-up's name for it. */
  label: string
  kind: 'youtube' | 'local'
  /** YouTube video id (kind youtube). */
  youtubeId: string
  /** IndexedDB media id (kind local). */
  mediaId: string | null
  fileName: string
  /** Plays in time with the music, so lyrics and counts can follow it through the section marks. */
  synced: boolean
  /** A YouTube video that is already mirrored (never flipped by the app). */
  alreadyMirrored: boolean
  /** A local video shown mirrored. */
  mirror: boolean
}

export interface Track {
  /** Her track (music with the vocals removed) in IndexedDB; null until a grown-up loads it. */
  mediaId: string | null
  fileName: string
  duration: number | null
  /** Any YouTube video standing in until her track is loaded. */
  standInYoutubeId: string
}

export interface Tempo {
  /** Beats per minute of her track at 100%. */
  bpm: number | null
  /** Track time of a "1" (a downbeat), in seconds. */
  offset: number | null
}

export type LadderId = 'rap' | 'dance' | 'together'

/** Spaced review of a finished ladder: back after 1, 3 and 7 days. */
export interface ReviewState {
  /** Index into REVIEW_GAPS of the gap that set `due`. */
  step: number
  /** YYYY-MM-DD. */
  due: string
  shaky: boolean
}

export interface LadderProgress {
  /** Step ids she has ticked with "I did it". */
  done: string[]
  /** How far the words have faded on the fade-out step (0 = all showing). */
  fade: number
  finishedAt: string | null
  review: ReviewState | null
}

export interface SectionProgress {
  rap: LadderProgress
  dance: LadderProgress
  together: LadderProgress
  /** She marked this section shaky: it comes back sooner. */
  shaky: boolean
  /** When a shaky section comes back (YYYY-MM-DD), or null. */
  shakyDue: string | null
}

export interface Show {
  name: string
  /** YYYY-MM-DD. */
  date: string
}

export interface PlanSettings {
  /** First day of the plan (YYYY-MM-DD): set up, or reset for a new show. */
  startDate: string
  holidayStart: string | null
  holidayEnd: string | null
  schoolMinutes: number
  holidayMinutes: number
  /** 0 = Sunday … 6 = Saturday. */
  lightWeekday: number
}

/** Her changes to one day: the order she chose and the blocks she finished. */
export interface DayState {
  order: string[]
  done: string[]
}

export interface Reflection {
  id: string
  /** ISO time. */
  at: string
  kind: 'showtime' | 'clip' | 'family'
  /** 'run' for the whole track, else a section id. */
  target: string
  wentWell: string
  workOn: string
}

export interface Settings {
  faceLabUrl: string
  upAnywayUrl: string
  /** Lyrics on the Showtime screen. */
  showtimeLyrics: boolean
  /** Speed for free practice on her track, 0.5–1. */
  trackSpeed: number
  /** Show recorded clips mirrored, like the camera preview. */
  mirrorClips: boolean
}

/** Her stage: its name, its colour theme and the colour of her light stick. */
export const STAGE_THEMES = ['neon', 'sunset', 'ocean', 'mint'] as const
export type StageTheme = (typeof STAGE_THEMES)[number]
export const STICK_COLOURS = ['pink', 'violet', 'cyan', 'lime', 'gold'] as const
export type StickColour = (typeof STICK_COLOURS)[number]
export const STAGE_NAME_MAX = 40

export interface StageSettings {
  name: string
  theme: StageTheme
  stick: StickColour
}

/** Spoken cues and sound effects each have their own volume (0–1) and mute. */
export interface SoundSettings {
  voiceOn: boolean
  voiceVolume: number
  effectsOn: boolean
  effectsVolume: number
  /** A gentle crowd and applause in Showtime (always the same, whatever happens). */
  audience: boolean
}

/** The Showtime routine: breaths backstage, and seconds to walk from the iPad to her spot. */
export interface ShowtimeSettings {
  breaths: number
  walkOnSeconds: number
}

export interface NoteForHer {
  text: string
  /** ISO time it was written. */
  at: string
  /** She tapped it: it no longer shows on Today. */
  seen: boolean
}

export interface Notes {
  /** A teacher's note for each section (by section id), typed by a grown-up. */
  teacher: Record<string, string>
  /** A short note from a grown-up, shown on Today until she taps it. */
  forHer: NoteForHer | null
}

/** What she did on one day, for the grown-ups' week. */
export interface DayActivity {
  /** Seconds spent practising (a practice screen open while she was active). */
  seconds: number
  /** Ladder steps she ticked. */
  ticks: { section: string; step: string }[]
  /** Sections she marked shaky. */
  shaky: string[]
}

/** The coach's voice reading lessons and intros aloud (a grown-up can turn it off). */
export interface NarrationSettings {
  on: boolean
}

/**
 * The skill lessons on her lesson path (version 1.2). Their words live in src/content/lessons.ts; the
 * ids are listed here so the save can keep only real ones.
 */
export const SKILL_LESSON_IDS = ['counting', 'learning-a-dance', 'voice-warm-up', 'rap-basics', 'breathing', 'marking', 'expressions', 'performing'] as const
export type SkillLessonId = (typeof SKILL_LESSON_IDS)[number]

/** A YouTube video and where in it to start, in seconds. */
export interface LessonVideo {
  youtubeId: string
  start: number
}

export interface LessonState {
  /** Skill lessons she has finished. */
  done: SkillLessonId[]
  /** A grown-up's own video for a skill lesson, by lesson id (else the default). */
  videos: Partial<Record<SkillLessonId, LessonVideo>>
}

/**
 * The setup wizard's steps, in order. The first three (her track, her lines, where each section
 * starts) make the app usable; the rest are optional and can be done later.
 */
export const WIZARD_STEPS = ['track', 'lines', 'starts', 'follow', 'timing', 'beat', 'dates'] as const
export type WizardStep = (typeof WIZARD_STEPS)[number]
export const REQUIRED_WIZARD_STEPS: readonly WizardStep[] = ['track', 'lines', 'starts']

export interface WizardState {
  /** The step it was paused on (null: not started, or finished). */
  at: WizardStep | null
  done: WizardStep[]
}

/** The speeds she ticks a part at: "I did it" at 50, 75 and 100% speed. */
export const PART_SPEEDS = [0.5, 0.75, 1] as const
export type PartSpeed = (typeof PART_SPEEDS)[number]
export const PART_NAME_MAX = 40

/**
 * One of her parts (version 1.3): a loop she made in the practice room and saved under her own name.
 * Hers to rename or delete. A grown-up's setup never needs to have happened.
 */
export interface MyPart {
  id: string
  name: string
  /** What it plays on: a reference video's id, or 'track' for her track. */
  source: string
  /** The loop, in that video's (or her track's) seconds. */
  from: number
  to: number
  /** The speeds she has ticked "I did it" at. */
  done: PartSpeed[]
  createdAt: string
}

export interface SaveData {
  schemaVersion: number
  setup: {
    complete: boolean
    /** navigator.storage.persist() has been asked for. */
    persistAsked: boolean
    persisted: boolean | null
  }
  profile: {
    name: string
    songName: string
  }
  show: Show | null
  pastShows: Show[]
  plan: PlanSettings | null
  track: Track
  refs: Reference[]
  sections: Section[]
  tempo: Tempo
  progress: Record<string, SectionProgress>
  days: Record<string, DayState>
  reflections: Reflection[]
  settings: Settings
  stage: StageSettings
  sound: SoundSettings
  showtime: ShowtimeSettings
  notes: Notes
  /** By day (YYYY-MM-DD). */
  activity: Record<string, DayActivity>
  tour: { seen: boolean }
  /** One-off celebrations that have happened. */
  celebrated: { firstShowtime: boolean }
  narration: NarrationSettings
  lessons: LessonState
  wizard: WizardState
  /** Her own parts, made in the practice room (version 1.3). */
  parts: MyPart[]
}

/** The original video (a default reference) stands in for her track until it is loaded. */
export const DEFAULT_STAND_IN = 'JSFG-IE8n_c'

export const DEFAULT_FACE_LAB_URL = 'https://jackgao84.github.io/face-lab/'
export const DEFAULT_UP_ANYWAY_URL = 'https://jackgao84.github.io/upanyway/'

export const DEFAULT_SCHOOL_MINUTES = 45
export const DEFAULT_HOLIDAY_MINUTES = 120

export function emptyLadder(): LadderProgress {
  return { done: [], fade: 0, finishedAt: null, review: null }
}

export function emptyProgress(): SectionProgress {
  return { rap: emptyLadder(), dance: emptyLadder(), together: emptyLadder(), shaky: false, shakyDue: null }
}

export function defaultSettings(): Settings {
  return {
    faceLabUrl: DEFAULT_FACE_LAB_URL,
    upAnywayUrl: DEFAULT_UP_ANYWAY_URL,
    showtimeLyrics: true,
    trackSpeed: 1,
    mirrorClips: true,
  }
}

export const DEFAULT_BREATHS = 3
/** Seconds to walk from the iPad to her spot (Showtime's walk-on, and before any filming). */
export const DEFAULT_WALK_ON_SECONDS = 5

export function defaultStage(): StageSettings {
  return { name: '', theme: 'neon', stick: 'pink' }
}

export function defaultSound(): SoundSettings {
  return { voiceOn: true, voiceVolume: 1, effectsOn: true, effectsVolume: 0.6, audience: true }
}

export function defaultShowtime(): ShowtimeSettings {
  return { breaths: DEFAULT_BREATHS, walkOnSeconds: DEFAULT_WALK_ON_SECONDS }
}

export function emptyActivity(): DayActivity {
  return { seconds: 0, ticks: [], shaky: [] }
}

/** A fresh save: no sections, no lines, the default reference videos. */
export function defaultSave(_now: Date = new Date()): SaveData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    setup: { complete: false, persistAsked: false, persisted: null },
    profile: { name: '', songName: '' },
    show: null,
    pastShows: [],
    plan: null,
    // Until her track is loaded, the original video stands in (a grown-up can change or clear it).
    track: { mediaId: null, fileName: '', duration: null, standInYoutubeId: DEFAULT_STAND_IN },
    refs: DEFAULT_REFS.map((r) => ({ ...r })),
    sections: [],
    tempo: { bpm: null, offset: null },
    progress: {},
    days: {},
    reflections: [],
    settings: defaultSettings(),
    stage: defaultStage(),
    sound: defaultSound(),
    showtime: defaultShowtime(),
    notes: { teacher: {}, forHer: null },
    activity: {},
    tour: { seen: false },
    celebrated: { firstShowtime: false },
    narration: { on: true },
    lessons: { done: [], videos: {} },
    wizard: { at: null, done: [] },
    parts: [],
  }
}
