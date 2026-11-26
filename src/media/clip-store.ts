/**
 * Keeping a clip she filmed (on the iPad only, in IndexedDB): the newest 3 per section and the newest
 * 3 run-throughs stay. Returns how many older clips made room.
 */
import { clipsToDelete, groupOf } from '../model/clips'
import { media, newMediaId } from '../storage/media'

export async function keepClip(blob: Blob, target: string): Promise<number> {
  const db = await media()
  const group = groupOf(target)
  await db.put({ id: newMediaId('clip'), kind: 'clip', name: target, type: blob.type, size: blob.size, createdAt: Date.now(), group, blob })
  const old = clipsToDelete(await db.list('clip'), group)
  for (const c of old) await db.delete(c.id)
  return old.length
}

export function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const t of ['video/mp4', 'video/webm']) if (MediaRecorder.isTypeSupported(t)) return t
  return ''
}
