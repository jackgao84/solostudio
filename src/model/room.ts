/**
 * The practice room (version 1.3): practice that needs no setup. She picks any video, or her track
 * once it is on the iPad; she makes her own loop with Loop start and Loop end and nudges either end;
 * she saves a loop as one of her parts and ticks "I did it" on it at 50, 75 and 100% speed. Pure, so
 * the checks can read it.
 */
import { PART_NAME_MAX, PART_SPEEDS, type MyPart, type PartSpeed, type Reference, type RefRole, type SaveData } from '../storage/schema'
import { fill } from '../ui/dom'

/** A part (or the room) on her track rather than a video. */
export const TRACK_SOURCE = 'track'
/** One tap of a nudge button moves that end of her loop by this much (seconds). */
export const NUDGE_S = 0.2
/** A loop is never shorter than this (seconds). */
export const MIN_LOOP_S = 1

export interface RoomSource {
  /** A reference's id, or TRACK_SOURCE. */
  id: string
  kind: 'youtube' | 'local' | 'track'
  role: RefRole | 'track'
  ref: Reference | null
}

/** The dance videos first, then the rest, then any video a grown-up added from the iPad. */
export const ROOM_ROLE_ORDER: readonly RefRole[] = ['mirrored', 'tutorialParts', 'tutorialFull', 'performance', 'original', 'listen', 'slow', 'local']

const usable = (r: Reference) => (r.kind === 'youtube' ? !!r.youtubeId : !!r.mediaId)

/** Everything she can pick: every video there is, and her track once it is on the iPad. */
export function roomSources(save: Pick<SaveData, 'refs' | 'track'>): RoomSource[] {
  const out: RoomSource[] = []
  for (const role of ROOM_ROLE_ORDER) for (const r of save.refs) if (r.role === role && usable(r)) out.push({ id: r.id, kind: r.kind, role: r.role, ref: r })
  if (save.track.mediaId) out.push({ id: TRACK_SOURCE, kind: 'track', role: 'track', ref: null })
  return out
}

/** Where the room opens: the mirrored follow-along, or the first video there is. */
export function defaultSource(save: Pick<SaveData, 'refs' | 'track'>): string | null {
  const list = roomSources(save)
  return (list.find((s) => s.role === 'mirrored') ?? list[0])?.id ?? null
}

export function sourceById(save: Pick<SaveData, 'refs' | 'track'>, id: string): RoomSource | null {
  return roomSources(save).find((s) => s.id === id) ?? null
}

const round2 = (t: number) => Math.round(t * 100) / 100

/** Move one end of her loop a nudge earlier (-1) or later (1): never below 0, never under a second. */
export function nudgeLoop(loop: { from: number; to: number }, end: 'from' | 'to', dir: -1 | 1): { from: number; to: number } {
  if (end === 'from') {
    const from = round2(Math.max(0, loop.from + dir * NUDGE_S))
    return loop.to - from < MIN_LOOP_S - 1e-9 ? { ...loop } : { from, to: loop.to }
  }
  const to = round2(loop.to + dir * NUDGE_S)
  return to - loop.from < MIN_LOOP_S - 1e-9 ? { ...loop } : { from: loop.from, to }
}

/** "My part 1", "My part 2"…: the next number no part of hers already has. */
export function defaultPartName(parts: readonly Pick<MyPart, 'name'>[], template: string): string {
  const taken = new Set(parts.map((p) => p.name.trim().toLowerCase()))
  for (let n = parts.length + 1; ; n++) {
    const name = fill(template, { n })
    if (!taken.has(name.toLowerCase())) return name
  }
}

/** Her name for a part, trimmed and kept short; an empty one keeps the old name. */
export function cleanPartName(name: string, old: string): string {
  return name.trim().slice(0, PART_NAME_MAX).trim() || old
}

/** The speed she is ticking: the highest of 50, 75 and 100% at or below the speed it plays at. */
export function partRung(speed: number): PartSpeed {
  return [...PART_SPEEDS].reverse().find((s) => speed >= s - 0.005) ?? PART_SPEEDS[0]
}

/** "I did it" at this speed. */
export function tickPart(part: MyPart, speed: number): MyPart {
  const rung = partRung(speed)
  return { ...part, done: PART_SPEEDS.filter((s) => s === rung || part.done.includes(s)) as PartSpeed[] }
}

/** The speed to practise it at next: the slowest she hasn't ticked (full speed once all are ticked). */
export function nextPartSpeed(part: Pick<MyPart, 'done'>): PartSpeed {
  return PART_SPEEDS.find((s) => !part.done.includes(s)) ?? 1
}

export function partFinished(part: Pick<MyPart, 'done'>): boolean {
  return PART_SPEEDS.every((s) => part.done.includes(s))
}
