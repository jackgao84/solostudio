/**
 * Media in IndexedDB ("solostudio:media"): her track, local reference videos and her clips. Nothing
 * here ever leaves the iPad. Bytes and the small records that describe them live in separate stores,
 * so listing clips never loads any video.
 *
 * Safari stores Blobs directly. Where a browser can't (private browsing, some test browsers), the
 * bytes are stored as an ArrayBuffer instead; either way a Blob comes back out.
 */
import { MEDIA_DB, MEDIA_STORE, META_STORE } from './keys'

export type MediaKind = 'track' | 'video' | 'clip'

export interface MediaMeta {
  id: string
  kind: MediaKind
  name: string
  type: string
  size: number
  createdAt: number
  /** Clips: 'section:<id>' or 'run'. Empty otherwise. */
  group: string
}

export interface MediaRecord extends MediaMeta {
  blob: Blob
}

interface StoredBytes {
  id: string
  type: string
  blob?: Blob
  buffer?: ArrayBuffer
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error ?? new Error('IndexedDB request failed'))
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
  })
}

export interface OpenOptions {
  factory?: IDBFactory
  /** false: always store ArrayBuffers (as a browser that can't store Blobs would). */
  storeBlobs?: boolean
}

export class MediaDb {
  readonly name = MEDIA_DB
  private blobsWork: boolean

  private constructor(
    private readonly db: IDBDatabase,
    storeBlobs: boolean,
  ) {
    this.blobsWork = storeBlobs
    // Another page wants to delete or upgrade the database: let it.
    db.onversionchange = () => db.close()
  }

  static async open(opts: OpenOptions = {}): Promise<MediaDb> {
    const factory = opts.factory ?? indexedDB
    const open = factory.open(MEDIA_DB, 1)
    open.onupgradeneeded = () => {
      const db = open.result
      if (!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'id' })
    }
    const db = await req(open)
    return new MediaDb(db, opts.storeBlobs !== false)
  }

  private async write(meta: MediaMeta, bytes: StoredBytes): Promise<void> {
    const tx = this.db.transaction([MEDIA_STORE, META_STORE], 'readwrite')
    const finished = done(tx)
    try {
      tx.objectStore(MEDIA_STORE).put(bytes)
      tx.objectStore(META_STORE).put(meta)
    } catch (err) {
      try {
        tx.abort()
      } catch {
        /* already finished */
      }
      await finished.catch(() => undefined)
      throw err
    }
    await finished
  }

  async put(rec: MediaRecord): Promise<void> {
    const meta: MediaMeta = { id: rec.id, kind: rec.kind, name: rec.name, type: rec.type, size: rec.size, createdAt: rec.createdAt, group: rec.group }
    if (this.blobsWork) {
      try {
        await this.write(meta, { id: rec.id, type: rec.type, blob: rec.blob })
        return
      } catch {
        this.blobsWork = false
      }
    }
    const buffer = await rec.blob.arrayBuffer()
    await this.write(meta, { id: rec.id, type: rec.type, buffer })
  }

  async get(id: string): Promise<MediaRecord | null> {
    const tx = this.db.transaction([MEDIA_STORE, META_STORE], 'readonly')
    const [bytes, meta] = await Promise.all([req(tx.objectStore(MEDIA_STORE).get(id)) as Promise<StoredBytes | undefined>, req(tx.objectStore(META_STORE).get(id)) as Promise<MediaMeta | undefined>])
    if (!bytes || !meta) return null
    const blob = bytes.blob instanceof Blob ? bytes.blob : new Blob(bytes.buffer ? [bytes.buffer] : [], { type: bytes.type })
    return { ...meta, blob: blob.type === meta.type ? blob : new Blob([blob], { type: meta.type }) }
  }

  async has(id: string): Promise<boolean> {
    const tx = this.db.transaction(META_STORE, 'readonly')
    return (await req(tx.objectStore(META_STORE).count(id))) > 0
  }

  async delete(id: string): Promise<void> {
    const tx = this.db.transaction([MEDIA_STORE, META_STORE], 'readwrite')
    tx.objectStore(MEDIA_STORE).delete(id)
    tx.objectStore(META_STORE).delete(id)
    await done(tx)
  }

  /** Records without bytes, oldest first. */
  async list(kind?: MediaKind): Promise<MediaMeta[]> {
    const tx = this.db.transaction(META_STORE, 'readonly')
    const all = (await req(tx.objectStore(META_STORE).getAll())) as MediaMeta[]
    return all.filter((m) => !kind || m.kind === kind).sort((a, b) => a.createdAt - b.createdAt)
  }

  close(): void {
    this.db.close()
  }
}

let shared: Promise<MediaDb> | null = null

/** The app's one connection (opened on first use). */
export function media(): Promise<MediaDb> {
  if (!shared) {
    shared = MediaDb.open().catch((err: unknown) => {
      shared = null
      throw err
    })
  }
  return shared
}

export function newMediaId(kind: MediaKind): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${kind}-${rand}`
}
