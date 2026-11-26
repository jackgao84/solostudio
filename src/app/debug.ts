/**
 * A read-only hook for checks and for a grown-up curious in the console: a copy of the save, the
 * media list, and the sound effects played so far.
 */
import { playedSounds, type PlayedSound } from '../audio/sfx'
import { media, type MediaMeta } from '../storage/media'
import type { SaveData } from '../storage/schema'
import { store } from '../storage/store'

export function installDebugHook(): void {
  ;(window as unknown as { __solostudio: { save(): SaveData; media(): Promise<MediaMeta[]>; sounds(): PlayedSound[] } }).__solostudio = {
    save: () => JSON.parse(JSON.stringify(store().data)) as SaveData,
    media: async () => (await media()).list(),
    sounds: () => playedSounds(),
  }
}
