/**
 * The guide (version 1.4): the singer's voice, in time with her track. Pure, so the checks can read it.
 */
import type { SaveData } from '../storage/schema'

/** A guide she can hear: confirmed, and built for the track that is on the iPad now. */
export function guideReady(save: Pick<SaveData, 'guide' | 'track'>): boolean {
  const g = save.guide
  return !!g.kind && !!g.mixId && !!save.track.mediaId && g.forTrack === save.track.mediaId
}
