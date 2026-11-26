/**
 * A grown-up's videos (version 1.4): add any YouTube video under a name they choose, rename any video
 * (the practice room shows every video by its name), swap one for another video, and remove one they
 * added or either karaoke video. The seven videos the app has always started with can be swapped and
 * renamed, never removed: the ladders use them. Pure, so the checks can read it.
 */
import { KID_COPY } from '../content/kid'
import { CORE_ROLES } from '../content/references'
import { VIDEO_NAME_MAX, type Reference, type SaveData } from '../storage/schema'

/** A grown-up's name for a video, trimmed and kept short; an empty one keeps the old name. */
export function cleanVideoName(name: string, old: string): string {
  return name.trim().slice(0, VIDEO_NAME_MAX).trim() || old
}

/** Add a YouTube video under a name (added after every video already there). */
export function addYouTubeVideo(d: Pick<SaveData, 'refs'>, name: string, youtubeId: string, id: string): Reference {
  const ref: Reference = {
    id,
    role: 'added',
    label: cleanVideoName(name, KID_COPY.room.sourceLocal),
    kind: 'youtube',
    youtubeId,
    mediaId: null,
    fileName: '',
    synced: true,
    alreadyMirrored: false,
    mirror: false,
  }
  d.refs.push(ref)
  return ref
}

export function renameVideo(d: Pick<SaveData, 'refs'>, refId: string, name: string): void {
  const ref = d.refs.find((r) => r.id === refId)
  if (ref) ref.label = cleanVideoName(name, ref.label)
}

/** Swap a YouTube video for another; its marks are cleared, since its timing is different. True if it changed. */
export function swapVideo(d: Pick<SaveData, 'refs' | 'sections'>, refId: string, youtubeId: string): boolean {
  const ref = d.refs.find((r) => r.id === refId)
  if (!ref || ref.youtubeId === youtubeId) return false
  ref.youtubeId = youtubeId
  for (const s of d.sections) delete s.refs[refId]
  return true
}

export function canRemove(ref: Pick<Reference, 'role'>): boolean {
  return !(CORE_ROLES as readonly string[]).includes(ref.role)
}

/** Remove a video and its marks (her parts on it stay, and say the video is gone). True if it was removed. */
export function removeVideo(d: Pick<SaveData, 'refs' | 'sections'>, refId: string): boolean {
  const ref = d.refs.find((r) => r.id === refId)
  if (!ref || !canRemove(ref)) return false
  d.refs = d.refs.filter((r) => r.id !== refId)
  for (const s of d.sections) delete s.refs[refId]
  return true
}
