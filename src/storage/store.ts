/**
 * The save store: one JSON document under KEYS.save. All writes go through update(), which changes
 * the live document, saves it shortly after (debounced) and tells subscribers. Storage is injectable
 * so unit tests run in node with an in-memory map.
 */
import { KEYS } from './keys'
import { normalize, versionOf } from './normalize'
import { CURRENT_SCHEMA_VERSION, defaultSave, type SaveData } from './schema'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class MemoryStorage implements StorageLike {
  private map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value))
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
  keys(): string[] {
    return [...this.map.keys()]
  }
}

export interface LoadResult {
  data: SaveData
  info: { kind: 'loaded' | 'fresh' | 'recovered' | 'newer' }
}

function parse(text: string | null): unknown {
  if (text == null) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

/** Load the save; a broken one is replaced by the backup, and a missing or broken pair by a fresh save. */
export function loadSave(storage: StorageLike): LoadResult {
  const raw = parse(storage.getItem(KEYS.save))
  const v = versionOf(raw)
  if (raw !== undefined && v !== null) {
    if (v > CURRENT_SCHEMA_VERSION) return { data: normalize(raw), info: { kind: 'newer' } }
    return { data: normalize(raw), info: { kind: 'loaded' } }
  }
  const backup = parse(storage.getItem(KEYS.backup))
  if (backup !== undefined && versionOf(backup) !== null) return { data: normalize(backup), info: { kind: 'recovered' } }
  return { data: defaultSave(), info: { kind: 'fresh' } }
}

type Listener = (data: SaveData) => void

export class Store {
  private doc: SaveData
  private listeners = new Set<Listener>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private dirty = false
  readonly loadInfo: LoadResult['info']
  /** Set when the save could not be written (for example, storage full). Shown to grown-ups. */
  lastWriteError: string | null = null

  constructor(
    private readonly storage: StorageLike,
    private readonly debounceMs = 150,
  ) {
    const result = loadSave(storage)
    this.doc = result.data
    this.loadInfo = result.info
    if (result.info.kind === 'fresh' || result.info.kind === 'recovered') {
      this.dirty = true
      this.flush()
    }
  }

  get data(): SaveData {
    return this.doc
  }

  update(fn: (draft: SaveData) => void): void {
    fn(this.doc)
    this.dirty = true
    this.schedule()
    this.emit()
  }

  /** Replace the whole document (import, reset). Written straight away. */
  replace(next: SaveData): void {
    this.doc = next
    this.dirty = true
    this.flush()
    this.emit()
  }

  /** Keep the current document as the backup (before an import or a reset). */
  writeBackup(): void {
    try {
      this.storage.setItem(KEYS.backup, JSON.stringify(this.doc))
    } catch (err) {
      this.lastWriteError = String(err)
    }
  }

  /** Write unsaved changes now. */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (!this.dirty || this.loadInfo.kind === 'newer') return
    try {
      this.storage.setItem(KEYS.save, JSON.stringify(this.doc))
      this.dirty = false
      this.lastWriteError = null
    } catch (err) {
      this.lastWriteError = String(err)
    }
  }

  /** Another tab of the app wrote the save: take its copy. */
  reloadFromStorage(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.doc = loadSave(this.storage).data
    this.dirty = false
    this.emit()
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private schedule(): void {
    if (this.debounceMs <= 0) return this.flush()
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), this.debounceMs)
  }

  private emit(): void {
    for (const fn of [...this.listeners]) {
      try {
        fn(this.doc)
      } catch (err) {
        console.warn('[solostudio] listener failed', err)
      }
    }
  }
}

let instance: Store | null = null

export function initStore(storage: StorageLike): Store {
  instance = new Store(storage)
  return instance
}

export function store(): Store {
  if (!instance) throw new Error('store not initialised')
  return instance
}
