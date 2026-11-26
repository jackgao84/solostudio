/**
 * Version 1.2 adds three parts to the save: narration (a grown-up can turn the coach's voice off),
 * her lessons (the skill lessons she has finished, and any video a grown-up swapped in for one) and
 * the setup wizard (the step it was paused on, and the steps that are done). Setup has already been
 * done on 1.1, so a version-2 save must carry over:
 *  - everything already in it comes through unchanged (the walk-on time a grown-up chose included);
 *  - narration is on, no skill lesson is finished yet, and the wizard counts the steps a grown-up
 *    already did on 1.1 as done, so nobody is asked to set up again;
 *  - the version-2 document is kept as the backup copy before the new one is written, once;
 *  - a version-2 backup file still imports, and a 1.0 save still comes all the way up.
 */
import { describe, expect, it } from 'vitest'
import { EXPORT_APP, parseImport } from '../../src/storage/backup'
import { KEYS } from '../../src/storage/keys'
import { migrate } from '../../src/storage/migrate'
import { CURRENT_SCHEMA_VERSION, DEFAULT_WALK_ON_SECONDS, WIZARD_STEPS, defaultSave } from '../../src/storage/schema'
import { MemoryStorage, Store, loadSave } from '../../src/storage/store'
import { v1Save } from '../fixtures/v1-save'
import { v2Save } from '../fixtures/v2-save'

const V2_KEYS = Object.keys(v2Save()).filter((k) => k !== 'schemaVersion')
const NEW_KEYS = ['narration', 'lessons', 'wizard'] as const

function storageWith(doc: unknown): MemoryStorage {
  const s = new MemoryStorage()
  s.setItem(KEYS.save, JSON.stringify(doc))
  return s
}

describe('version 3 of the save', () => {
  it('is the current one, and a fresh save has every 1.2 part', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(4)
    const d = defaultSave()
    expect(d.narration).toEqual({ on: true })
    expect(d.lessons).toEqual({ done: [], videos: {} })
    expect(d.wizard).toEqual({ at: null, done: [] })
  })

  it('walks on in 5 seconds by default (one walk-on time for Showtime and for filming)', () => {
    expect(DEFAULT_WALK_ON_SECONDS).toBe(5)
    expect(defaultSave().showtime.walkOnSeconds).toBe(5)
  })

  it('has the wizard’s steps in order: the three that make the app usable first', () => {
    expect(WIZARD_STEPS).toEqual(['track', 'lines', 'starts', 'follow', 'timing', 'beat', 'dates'])
  })
})

describe('a version-2 (1.1) save carries over', () => {
  it('keeps everything the grown-up set up and everything she did, unchanged', () => {
    const v2 = v2Save()
    const { data, info } = loadSave(storageWith(v2))
    expect(info.kind).toBe('migrated')
    expect(data.schemaVersion).toBe(4)
    const got = data as unknown as Record<string, unknown>
    for (const k of V2_KEYS) expect(got[k], k).toEqual(v2[k])
    expect(data.showtime.walkOnSeconds).toBe(8)
  })

  it('turns narration on and starts with no skill lesson finished', () => {
    const { data } = loadSave(storageWith(v2Save()))
    expect(data.narration).toEqual({ on: true })
    expect(data.lessons).toEqual({ done: [], videos: {} })
  })

  it('counts the setup a grown-up already did as done, so the wizard never asks again', () => {
    const { data } = loadSave(storageWith(v2Save()))
    expect(data.wizard.at).toBeNull()
    expect([...data.wizard.done].sort()).toEqual([...WIZARD_STEPS].sort())
  })

  it('leaves a step open only where 1.1 had nothing for it', () => {
    const { data } = loadSave(storageWith(v2Save({ trackMediaId: null, untimed: true })))
    expect(data.wizard.done).not.toContain('track')
    expect(data.wizard.done).not.toContain('timing')
    for (const s of ['lines', 'starts', 'follow', 'beat', 'dates'] as const) expect(data.wizard.done, s).toContain(s)
  })

  it('keeps the version-2 document as the backup copy, then writes the new one, once', () => {
    const storage = storageWith(v2Save())
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
    const viaMigrate = migrate(v2Save()) as Record<string, unknown>
    expect(viaMigrate.schemaVersion).toBe(4)
    expect(loadSave(storageWith(v2Save())).data).toEqual(loadSave(storageWith(viaMigrate)).data)
  })

  it('imports a version-2 backup file with the same result as loading it', () => {
    const v2 = v2Save()
    const r = parseImport(JSON.stringify({ app: EXPORT_APP, exportedAt: '2031-03-06T10:00:00.000Z', schemaVersion: 2, data: v2 }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toEqual(loadSave(storageWith(v2)).data)
  })

  it('brings a 1.0 save all the way up, with its setup counted as done', () => {
    const { data } = loadSave(storageWith(v1Save()))
    expect(data.schemaVersion).toBe(4)
    expect(data.wizard.done).toEqual(expect.arrayContaining(['track', 'lines', 'starts', 'follow', 'timing', 'beat', 'dates']))
  })
})

describe('the 1.2 parts of the save', () => {
  it('are made safe field by field', () => {
    const { data } = loadSave(
      storageWith({
        schemaVersion: 3,
        narration: { on: 'yes' },
        lessons: { done: ['counting', 'not-a-lesson', 4, 'counting'], videos: { counting: { youtubeId: 'N6t8hwKp71g', start: -3 }, marking: { youtubeId: 'bad id!' }, nope: { youtubeId: 'XD00TJ-6WSw', start: 0 } } },
        wizard: { at: 'nowhere', done: ['track', 'lines', 'junk', 'track'] },
      }),
    )
    expect(data.narration.on).toBe(true)
    expect(data.lessons.done).toEqual(['counting'])
    expect(data.lessons.videos).toEqual({ counting: { youtubeId: 'N6t8hwKp71g', start: 0 } })
    expect(data.wizard).toEqual({ at: null, done: ['track', 'lines'] })
  })

  it('never store anything that grades her', () => {
    const keys: string[] = []
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) (keys.push(k), walk(x))
    }
    const d = defaultSave()
    d.lessons.done = ['counting']
    d.lessons.videos = { counting: { youtubeId: 'N6t8hwKp71g', start: 0 } }
    d.wizard = { at: 'starts', done: ['track', 'lines'] }
    for (const k of NEW_KEYS) walk((d as unknown as Record<string, unknown>)[k])
    const grading = /^(scores?|points?|streaks?|stars?|percent(age)?s?|grades?|accuracy|ranks?|levels?|leaderboards?|best|results?|mistakes?|errors?|wrong|correct)$/i
    expect(keys.filter((k) => grading.test(k))).toEqual([])
  })
})
