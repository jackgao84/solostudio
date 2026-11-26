/**
 * Version 1.3 adds one part to the save: her own parts, the loops she names and saves in the
 * practice room (each on one video or her track, with the speeds she has ticked "I did it" at).
 * A version-3 (1.2) save must carry over:
 *  - everything already in it comes through unchanged (narration, her lessons, the wizard included);
 *  - she starts with no parts of her own;
 *  - the version-3 document is kept as the backup copy before the new one is written, once;
 *  - a version-3 backup file still imports, and 1.0 and 1.1 saves still come all the way up.
 */
import { describe, expect, it } from 'vitest'
import { EXPORT_APP, parseImport } from '../../src/storage/backup'
import { KEYS } from '../../src/storage/keys'
import { migrate } from '../../src/storage/migrate'
import { CURRENT_SCHEMA_VERSION, PART_NAME_MAX, PART_SPEEDS, defaultSave } from '../../src/storage/schema'
import { MemoryStorage, Store, loadSave } from '../../src/storage/store'
import { v1Save } from '../fixtures/v1-save'
import { v2Save } from '../fixtures/v2-save'
import { v3Save } from '../fixtures/v3-save'

const V3_KEYS = Object.keys(v3Save()).filter((k) => k !== 'schemaVersion')

function storageWith(doc: unknown): MemoryStorage {
  const s = new MemoryStorage()
  s.setItem(KEYS.save, JSON.stringify(doc))
  return s
}

describe('version 4 of the save', () => {
  it('is the current one, and a fresh save has no parts yet', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(4)
    expect(defaultSave().parts).toEqual([])
  })

  it('ticks a part at 50, 75 and 100% speed, and keeps a part’s name short', () => {
    expect([...PART_SPEEDS]).toEqual([0.5, 0.75, 1])
    expect(PART_NAME_MAX).toBe(40)
  })
})

describe('a version-3 (1.2) save carries over', () => {
  it('keeps everything the grown-up set up and everything she did, unchanged', () => {
    const v3 = v3Save()
    const { data, info } = loadSave(storageWith(v3))
    expect(info).toEqual({ kind: 'migrated', from: 3 })
    expect(data.schemaVersion).toBe(4)
    const got = data as unknown as Record<string, unknown>
    for (const k of V3_KEYS) expect(got[k], k).toEqual(v3[k])
    expect(data.narration.on).toBe(false)
    expect(data.wizard.at).toBe('beat')
  })

  it('starts her with no parts of her own', () => {
    expect(loadSave(storageWith(v3Save())).data.parts).toEqual([])
  })

  it('keeps the version-3 document as the backup copy, then writes the new one, once', () => {
    const storage = storageWith(v3Save())
    const before = storage.getItem(KEYS.save)
    const store = new Store(storage, 0)
    expect(store.loadInfo.kind).toBe('migrated')
    expect(storage.getItem(KEYS.backup)).toBe(before)
    expect(JSON.parse(storage.getItem(KEYS.save)!).schemaVersion).toBe(4)
    const saved = storage.getItem(KEYS.save)
    const again = new Store(storage, 0)
    expect(again.loadInfo.kind).toBe('loaded')
    expect(storage.getItem(KEYS.save)).toBe(saved)
    expect(storage.getItem(KEYS.backup)).toBe(before)
  })

  it('is the same through migrate() on its own or the store', () => {
    const viaMigrate = migrate(v3Save()) as Record<string, unknown>
    expect(viaMigrate.schemaVersion).toBe(4)
    expect(viaMigrate.parts).toEqual([])
    expect(loadSave(storageWith(v3Save())).data).toEqual(loadSave(storageWith(viaMigrate)).data)
  })

  it('imports a version-3 backup file with the same result as loading it', () => {
    const v3 = v3Save()
    const r = parseImport(JSON.stringify({ app: EXPORT_APP, exportedAt: '2031-03-07T10:00:00.000Z', schemaVersion: 3, data: v3 }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toEqual(loadSave(storageWith(v3)).data)
  })

  it('brings 1.0 and 1.1 saves all the way up, with no parts', () => {
    for (const old of [v1Save(), v2Save()]) {
      const { data } = loadSave(storageWith(old))
      expect(data.schemaVersion).toBe(4)
      expect(data.parts).toEqual([])
    }
  })

  it('keeps a part she saved through a save and a reload', () => {
    const storage = new MemoryStorage()
    const store = new Store(storage, 0)
    store.update((d) => {
      d.parts.push({ id: 'part-1', name: 'Spin', source: 'ref-mirrored', from: 12.4, to: 15.2, done: [0.5], createdAt: '2031-03-07T10:00:00.000Z' })
    })
    expect(new Store(storage, 0).data.parts).toEqual([{ id: 'part-1', name: 'Spin', source: 'ref-mirrored', from: 12.4, to: 15.2, done: [0.5], createdAt: '2031-03-07T10:00:00.000Z' }])
  })
})

describe('her parts in the save', () => {
  it('are made safe field by field', () => {
    const long = 'A part with a very long name that goes on and on and on'
    const { data } = loadSave(
      storageWith({
        schemaVersion: 4,
        parts: [
          { id: 'p1', name: '  Spin  ', source: 'ref-mirrored', from: 12.4, to: 15.2, done: [1, 0.5, 0.5, 0.6, 'x'], createdAt: '2031-03-07T10:00:00.000Z' },
          { id: 'p2', name: long, source: 'track', from: 3, to: 9, done: [], createdAt: '2031-03-07T10:01:00.000Z' },
          { id: 'p3', name: '', source: 'ref-original', from: 20, to: 24 },
          { id: 'p1', name: 'Same id again', source: 'ref-mirrored', from: 1, to: 4, done: [] },
          { id: 'bad-times', name: 'Backwards', source: 'ref-mirrored', from: 9, to: 4, done: [] },
          { id: 'no-source', name: 'Nowhere', from: 1, to: 4, done: [] },
          'not a part',
        ],
      }),
    )
    expect(data.parts.map((p) => p.id)).toEqual(['p1', 'p2', 'p3'])
    expect(data.parts[0]).toEqual({ id: 'p1', name: 'Spin', source: 'ref-mirrored', from: 12.4, to: 15.2, done: [0.5, 1], createdAt: '2031-03-07T10:00:00.000Z' })
    expect(data.parts[1].name).toBe(long.slice(0, PART_NAME_MAX).trim())
    expect(data.parts[2].name.length).toBeGreaterThan(0)
    expect(data.parts[2].done).toEqual([])
  })

  it('never store anything that grades her', () => {
    const keys: string[] = []
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) (keys.push(k), walk(x))
    }
    const d = defaultSave()
    d.parts = [{ id: 'p1', name: 'Spin', source: 'ref-mirrored', from: 1, to: 3, done: [0.5, 0.75], createdAt: '2031-03-07T10:00:00.000Z' }]
    walk(d.parts)
    const grading = /^(scores?|points?|streaks?|stars?|percent(age)?s?|grades?|accuracy|ranks?|levels?|leaderboards?|best|results?|mistakes?|errors?|wrong|correct)$/i
    expect(keys.filter((k) => grading.test(k))).toEqual([])
  })
})
