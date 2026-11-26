/**
 * A read-only hook for checks and for a grown-up curious in the console: a copy of the save, the
 * media list, the sound effects played so far, and (1.4) what the guided player is doing.
 */
import { playedSounds, type PlayedSound } from '../audio/sfx'
import { guidedState, hearNow } from '../media/guided'
import { media, type MediaMeta } from '../storage/media'
import type { SaveData } from '../storage/schema'
import { store } from '../storage/store'

export function installDebugHook(): void {
  ;(window as unknown as { __solostudio: { save(): SaveData; media(): Promise<MediaMeta[]>; sounds(): PlayedSound[]; voice(): Record<string, unknown> | null; hear(freqs: number[]): number[] } }).__solostudio = {
    save: () => JSON.parse(JSON.stringify(store().data)) as SaveData,
    media: async () => (await media()).list(),
    sounds: () => playedSounds(),
    // Version 1.4: the guided player on screen (level, gains, time, speed) and how strong a few tones are in what plays.
    voice: () => guidedState(),
    hear: (freqs) => hearNow(freqs),
  }
}
