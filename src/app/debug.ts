/** A read-only hook for checks and for a grown-up curious in the console: a copy of the save, the media list. */
import { media, type MediaMeta } from '../storage/media'
import type { SaveData } from '../storage/schema'
import { store } from '../storage/store'

export function installDebugHook(): void {
  ;(window as unknown as { __solostudio: { save(): SaveData; media(): Promise<MediaMeta[]> } }).__solostudio = {
    save: () => JSON.parse(JSON.stringify(store().data)) as SaveData,
    media: async () => (await media()).list(),
  }
}
