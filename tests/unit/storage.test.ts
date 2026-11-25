/**
 * Storage: the save document in localStorage (prefixed keys, a backup copy, recovery from a broken
 * save), the backup file (everything except media), and media in IndexedDB (prefixed database name,
 * a Blob in and a Blob out, with an ArrayBuffer fallback where Blobs can't be stored).
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { EXPORT_APP, IMPORT_ERRORS, backupFileName, exportJson, parseImport } from '../../src/storage/backup'
import { KEYS, MEDIA_DB, PREFIX } from '../../src/storage/keys'
import { MediaDb, type MediaKind } from '../../src/storage/media'
import { requestPersistence } from '../../src/storage/persist'
import { CURRENT_SCHEMA_VERSION, defaultSave, emptyProgress, type SaveData } from '../../src/storage/schema'
import { MemoryStorage, Store, loadSave } from '../../src/storage/store'
import { lyricLine, meaningLine } from '../fixtures/placeholders'

function richSave(): SaveData {
  const d = defaultSave()
  d.setup.complete = true
  d.profile = { name: 'Performer', songName: '' }
  d.show = { name: 'Showcase', date: '2031-04-12' }
  d.plan = { startDate: '2031-03-03', holidayStart: '2031-03-29', holidayEnd: null, schoolMinutes: 45, holidayMinutes: 120, lightWeekday: 0 }
  d.track = { mediaId: 'media-track-1', fileName: 'practice-track.m4a', duration: 182.4, standInYoutubeId: '' }
  d.refs.push({ id: 'ref-local-1', role: 'local', label: 'Teacher demo', kind: 'local', youtubeId: '', mediaId: 'media-video-1', fileName: 'demo.mov', synced: true, alreadyMirrored: false, mirror: true })
  d.sections = [
    {
      id: 'v1',
      name: 'Verse 1',
      lines: [
        { id: 'l1', lyric: lyricLine(1, 'Verse 1'), lang: 'en', meaning: '', breaths: [2], time: 12.5 },
        { id: 'l2', lyric: lyricLine(2, 'Verse 1'), lang: 'ko', meaning: meaningLine(2, 'Verse 1'), breaths: [], time: 15.1 },
      ],
      track: { start: 12, end: 24 },
      refs: { 'ref-listen': { start: 40, end: 56 } },
      createdAt: '2031-03-03T10:00:00.000Z',
    },
  ]
  d.tempo = { bpm: 132, offset: 0.62 }
  d.progress = { v1: { ...emptyProgress(), rap: { done: ['rap-listen'], fade: 0, finishedAt: null, review: null } } }
  d.days = { '2031-03-03': { order: [], done: ['2031-03-03-0-warmup'] } }
  d.reflections = [{ id: 'r1', at: '2031-03-03T18:00:00.000Z', kind: 'showtime', target: 'run', wentWell: 'I kept going', workOn: 'Breathing' }]
  return d
}

describe('every key, cache and database is prefixed', () => {
  it('uses "solostudio:"', () => {
    expect(PREFIX).toBe('solostudio:')
    for (const k of Object.values(KEYS)) expect(k.startsWith(PREFIX)).toBe(true)
    expect(MEDIA_DB.startsWith(PREFIX)).toBe(true)
  })
})

describe('the save document', () => {
  it('starts fresh with no sections and no lines, and is written straight away', () => {
    const storage = new MemoryStorage()
    const store = new Store(storage, 0)
    expect(store.data.sections).toEqual([])
    expect(store.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(storage.getItem(KEYS.save)).not.toBeNull()
    for (const k of storage.keys()) expect(k.startsWith(PREFIX), k).toBe(true)
  })

  it('saves changes and loads them back', () => {
    const storage = new MemoryStorage()
    const store = new Store(storage, 0)
    store.update((d) => {
      d.profile.name = 'Performer'
    })
    store.flush()
    expect(new Store(storage, 0).data.profile.name).toBe('Performer')
  })

  it('keeps the previous document as the backup before replacing it', () => {
    const storage = new MemoryStorage()
    const store = new Store(storage, 0)
    store.replace(richSave())
    store.writeBackup()
    store.replace(defaultSave())
    expect(JSON.parse(storage.getItem(KEYS.backup)!).sections).toHaveLength(1)
  })

  it('recovers from the backup when the save is broken, and starts fresh when both are', () => {
    const storage = new MemoryStorage()
    storage.setItem(KEYS.backup, JSON.stringify(richSave()))
    storage.setItem(KEYS.save, '{not json')
    const a = loadSave(storage)
    expect(a.info.kind).toBe('recovered')
    expect(a.data.sections).toHaveLength(1)
    storage.setItem(KEYS.backup, 'also broken')
    const b = loadSave(storage)
    expect(b.info.kind).toBe('fresh')
    expect(b.data.sections).toEqual([])
  })

  it('fills in anything missing from an older or partial save', () => {
    const storage = new MemoryStorage()
    const partial = { schemaVersion: 1, profile: { name: 'Performer' }, sections: [{ id: 'v1', name: 'Verse 1' }] }
    storage.setItem(KEYS.save, JSON.stringify(partial))
    const { data } = loadSave(storage)
    expect(data.profile).toEqual({ name: 'Performer', songName: '' })
    expect(data.sections[0].lines).toEqual([])
    expect(data.sections[0].track).toEqual({ start: null, end: null })
    expect(data.refs.length).toBeGreaterThan(0)
    expect(data.settings.faceLabUrl).toMatch(/^https:\/\//)
  })

  it('never stores anything that grades her', () => {
    const keys: string[] = []
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) (keys.push(k), walk(x))
    }
    walk(richSave())
    const grading = /^(scores?|points?|streaks?|stars?|percent(age)?s?|grades?|accuracy|ranks?|levels?)$/i
    expect(keys.filter((k) => grading.test(k))).toEqual([])
  })
})

describe('the backup file', () => {
  const now = new Date(2031, 2, 3, 18, 30)

  it('holds everything except media', () => {
    const text = exportJson(richSave(), now)
    const parsed = JSON.parse(text)
    expect(parsed.app).toBe(EXPORT_APP)
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(parsed.data.sections[0].lines).toHaveLength(2)
    expect(parsed.data.reflections).toHaveLength(1)
    expect(parsed.data.track.mediaId).toBe('media-track-1')
    // No media: no data URLs, no base64 blobs, and small.
    expect(text).not.toMatch(/data:|base64|blob:/i)
    expect(text.length).toBeLessThan(20_000)
  })

  it('is named with the date', () => {
    expect(backupFileName(now)).toBe('solostudio-backup-2031-03-03.json')
  })

  it('reads back exactly what was exported, with a summary for the grown-up', () => {
    const save = richSave()
    const result = parseImport(exportJson(save, now))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toEqual(save)
    expect(result.summary).toEqual({ sections: 1, lines: 2, references: save.refs.length, media: ['media-track-1', 'media-video-1'] })
  })

  it('refuses files that are not a Solo Studio backup, kindly', () => {
    expect(parseImport('')).toEqual({ ok: false, error: IMPORT_ERRORS.empty })
    expect(parseImport('hello')).toEqual({ ok: false, error: IMPORT_ERRORS.notOurs })
    expect(parseImport('{"app":"upanyway","data":{}}')).toEqual({ ok: false, error: IMPORT_ERRORS.otherApp })
    const newer = JSON.parse(exportJson(richSave(), now))
    newer.schemaVersion = CURRENT_SCHEMA_VERSION + 1
    newer.data.schemaVersion = CURRENT_SCHEMA_VERSION + 1
    expect(parseImport(JSON.stringify(newer))).toEqual({ ok: false, error: IMPORT_ERRORS.newer })
  })
})

describe('media in IndexedDB', () => {
  async function roundTrip(storeBlobs: boolean) {
    const db = await MediaDb.open({ factory: new IDBFactory(), storeBlobs })
    const blob = new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'audio/mp4' })
    const kinds: MediaKind[] = ['track', 'video', 'clip']
    for (const [i, kind] of kinds.entries()) {
      await db.put({ id: `m${i}`, kind, name: `file-${i}`, type: blob.type, size: blob.size, createdAt: 1000 + i, group: kind === 'clip' ? 'section:v1' : '', blob })
    }
    const got = await db.get('m0')
    expect(got).not.toBeNull()
    expect(got!.blob.size).toBe(5)
    expect(got!.blob.type).toBe('audio/mp4')
    expect(new Uint8Array(await got!.blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
    const clips = await db.list('clip')
    expect(clips.map((c) => c.id)).toEqual(['m2'])
    expect('blob' in clips[0]).toBe(false)
    expect((await db.list()).length).toBe(3)
    await db.delete('m1')
    expect(await db.get('m1')).toBeNull()
    expect(db.name).toBe(MEDIA_DB)
    db.close()
  }

  it('stores and returns Blobs', async () => {
    await roundTrip(true)
  })

  it('falls back to ArrayBuffers where the browser cannot store Blobs', async () => {
    await roundTrip(false)
  })
})

describe('asking the browser to keep storage', () => {
  it('calls navigator.storage.persist() and reports the answer', async () => {
    let calls = 0
    const nav = { storage: { persist: async () => (calls++, true), persisted: async () => false } }
    expect(await requestPersistence(nav)).toBe(true)
    expect(calls).toBe(1)
  })

  it('answers null where persist() is missing or fails', async () => {
    expect(await requestPersistence({})).toBeNull()
    expect(await requestPersistence({ storage: { persist: async () => Promise.reject(new Error('no')) } })).toBeNull()
  })
})
