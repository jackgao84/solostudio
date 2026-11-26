/**
 * Version 1.4 adds to the save: two default videos under their own names ("Voice guide (light)" and
 * "Karaoke (no voice)"), and the guide (a second audio file a grown-up can load: the singer's voice,
 * in time with her track; empty until then).
 * A version-4 (1.3) save must carry over:
 *  - everything already in it comes through unchanged, her parts included; the only change to her
 *    videos is the two new ones, added after the videos already there (a teacher's demo stays);
 *  - the guide starts empty;
 *  - the version-4 document is kept as the backup copy before the new one is written, once;
 *  - a version-4 backup file still imports, and older saves still come all the way up.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_REFS } from '../../src/content/references'
import { EXPORT_APP, parseImport } from '../../src/storage/backup'
import { KEYS } from '../../src/storage/keys'
import { migrate } from '../../src/storage/migrate'
import { CURRENT_SCHEMA_VERSION, defaultSave, emptyGuide, type Reference } from '../../src/storage/schema'
import { MemoryStorage, Store, loadSave } from '../../src/storage/store'
import { v1Save } from '../fixtures/v1-save'
import { v2Save } from '../fixtures/v2-save'
import { v3Save } from '../fixtures/v3-save'
import { v4Save } from '../fixtures/v4-save'

const V4_KEYS = Object.keys(v4Save()).filter((k) => k !== 'schemaVersion' && k !== 'refs')
const NEW_IDS = ['ref-voiceGuide', 'ref-karaoke']
const newRefs = () => DEFAULT_REFS.filter((r) => NEW_IDS.includes(r.id)).map((r) => ({ ...r }))

function storageWith(doc: unknown): MemoryStorage {
  const s = new MemoryStorage()
  s.setItem(KEYS.save, JSON.stringify(doc))
  return s
}

describe('version 5 of the save', () => {
  it('is the current one; a fresh save has both karaoke videos and no guide yet', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(5)
    const d = defaultSave()
    expect(d.refs.map((r) => r.id)).toEqual(DEFAULT_REFS.map((r) => r.id))
    expect(d.refs.filter((r) => NEW_IDS.includes(r.id))).toEqual(newRefs())
    expect(d.guide).toEqual(emptyGuide())
    expect(d.guide.mediaId).toBeNull()
    expect(d.guide.mixId).toBeNull()
    expect(d.guide.kind).toBeNull()
  })
})

describe('a version-4 (1.3) save carries over', () => {
  it('keeps everything the grown-up set up and everything she did, her parts included', () => {
    const v4 = v4Save()
    const { data, info } = loadSave(storageWith(v4))
    expect(info).toEqual({ kind: 'migrated', from: 4 })
    expect(data.schemaVersion).toBe(5)
    const got = data as unknown as Record<string, unknown>
    for (const k of V4_KEYS) expect(got[k], k).toEqual(v4[k])
    expect(data.parts.map((p) => p.name)).toEqual(['Spin', 'The hook'])
  })

  it('adds the two karaoke videos after the videos already there, and changes none of those', () => {
    const v4 = v4Save()
    const { data } = loadSave(storageWith(v4))
    expect(data.refs).toEqual([...(v4.refs as Reference[]), ...newRefs()])
  })

  it('never adds a karaoke video twice', () => {
    const v4 = v4Save()
    ;(v4.refs as Reference[]).push({ ...newRefs()[1], youtubeId: 'aaaaaaaaaaa', label: 'Our karaoke' })
    const { data } = loadSave(storageWith(v4))
    expect(data.refs.filter((r) => r.role === 'karaoke')).toEqual([{ ...newRefs()[1], youtubeId: 'aaaaaaaaaaa', label: 'Our karaoke' }])
    expect(data.refs.filter((r) => r.role === 'voiceGuide')).toHaveLength(1)
  })

  it('starts with no guide', () => {
    expect(loadSave(storageWith(v4Save())).data.guide).toEqual(emptyGuide())
  })

  it('keeps the version-4 document as the backup copy, then writes the new one, once', () => {
    const storage = storageWith(v4Save())
    const before = storage.getItem(KEYS.save)
    const store = new Store(storage, 0)
    expect(store.loadInfo.kind).toBe('migrated')
    expect(storage.getItem(KEYS.backup)).toBe(before)
    expect(JSON.parse(storage.getItem(KEYS.save)!).schemaVersion).toBe(5)
    const saved = storage.getItem(KEYS.save)
    const again = new Store(storage, 0)
    expect(again.loadInfo.kind).toBe('loaded')
    expect(storage.getItem(KEYS.save)).toBe(saved)
    expect(storage.getItem(KEYS.backup)).toBe(before)
  })

  it('is the same through migrate() on its own or the store', () => {
    const viaMigrate = migrate(v4Save()) as Record<string, unknown>
    expect(viaMigrate.schemaVersion).toBe(5)
    expect((viaMigrate.refs as Reference[]).map((r) => r.id).slice(-2)).toEqual(NEW_IDS)
    expect(loadSave(storageWith(v4Save())).data).toEqual(loadSave(storageWith(viaMigrate)).data)
  })

  it('imports a version-4 backup file with the same result as loading it', () => {
    const v4 = v4Save()
    const r = parseImport(JSON.stringify({ app: EXPORT_APP, exportedAt: '2031-03-07T10:00:00.000Z', schemaVersion: 4, data: v4 }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toEqual(loadSave(storageWith(v4)).data)
  })

  it('brings 1.0, 1.1 and 1.2 saves all the way up, with both karaoke videos and no guide', () => {
    for (const old of [v1Save(), v2Save(), v3Save()]) {
      const { data } = loadSave(storageWith(old))
      expect(data.schemaVersion).toBe(5)
      expect(data.refs.map((r) => r.id).slice(-2)).toEqual(NEW_IDS)
      expect(data.guide).toEqual(emptyGuide())
    }
  })
})

describe('the guide in the save', () => {
  it('is made safe field by field', () => {
    const { data } = loadSave(
      storageWith({
        schemaVersion: 5,
        track: { mediaId: 'media-track-1', fileName: 'practice-track.m4a', duration: 182.4, standInYoutubeId: '' },
        guide: { mediaId: 'media-guide-1', fileName: 'guide.m4a', duration: 'long', kind: 'loud', guess: 'vocals', offset: 'x', mixId: 7, forTrack: 'media-track-1', singer: '  A singer with a very long name that keeps going  ' },
      }),
    )
    expect(data.guide.mediaId).toBe('media-guide-1')
    expect(data.guide.fileName).toBe('guide.m4a')
    expect(data.guide.duration).toBeNull()
    expect(data.guide.kind).toBeNull()
    expect(data.guide.guess).toBe('vocals')
    expect(data.guide.offset).toBe(0)
    expect(data.guide.mixId).toBeNull()
    expect(data.guide.forTrack).toBe('media-track-1')
    expect(data.guide.singer.length).toBeLessThanOrEqual(30)
    expect(data.guide.singer).toBe(data.guide.singer.trim())
  })

  it('keeps a confirmed guide through a save and a reload', () => {
    const storage = new MemoryStorage()
    const store = new Store(storage, 0)
    const guide = { mediaId: 'media-guide-1', fileName: 'guide.m4a', duration: 182.4, kind: 'mix' as const, guess: 'mix' as const, offset: 0.12, mixId: 'media-mix-1', forTrack: 'media-track-1', singer: 'Her idol' }
    store.update((d) => {
      d.guide = { ...guide }
    })
    expect(new Store(storage, 0).data.guide).toEqual(guide)
  })

  it('never stores anything that grades her', () => {
    const grading = /^(scores?|points?|streaks?|stars?|percent(age)?s?|grades?|accuracy|ranks?|leaderboards?|best|results?|mistakes?|errors?|wrong|correct)$/i
    expect(Object.keys(defaultSave().guide).filter((k) => grading.test(k))).toEqual([])
  })
})
