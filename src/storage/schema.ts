/**
 * The save document: everything the app keeps except media (her track, local videos and clips live
 * in IndexedDB, see media.ts). One JSON document under KEYS.save, versioned.
 *
 * Nothing here grades her: there are no scores, points, streaks or percentages. A step is either
 * ticked ("I did it") or not yet.
 */
import { DEFAULT_REFS } from '../content/references'

export const CURRENT_SCHEMA_VERSION = 1

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
}

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

/** A fresh save: no sections, no lines, the default reference videos. */
export function defaultSave(_now: Date = new Date()): SaveData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    setup: { complete: false, persistAsked: false, persisted: null },
    profile: { name: '', songName: '' },
    show: null,
    pastShows: [],
    plan: null,
    track: { mediaId: null, fileName: '', duration: null, standInYoutubeId: '' },
    refs: DEFAULT_REFS.map((r) => ({ ...r })),
    sections: [],
    tempo: { bpm: null, offset: null },
    progress: {},
    days: {},
    reflections: [],
    settings: defaultSettings(),
  }
}
