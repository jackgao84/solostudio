/**
 * Version 1.1 adds new parts to the save (her stage, sounds, the Showtime routine's settings, notes
 * from grown-ups, a practice log for the grown-ups' week, the tour, celebrations). A grown-up may
 * already have set everything up on version 1.0, so a version-1 save must carry over:
 *  - everything already in it comes through unchanged, and the new parts start at their defaults;
 *  - the version-1 document is kept as the backup copy before the new one is written, once;
 *  - a version-1 backup file still imports, and a broken save still recovers from a version-1 backup;
 *  - a save from a newer version is never overwritten.
 */
import { describe, expect, it } from 'vitest'
import { EXPORT_APP, parseImport } from '../../src/storage/backup'
import { KEYS } from '../../src/storage/keys'
import { migrate } from '../../src/storage/migrate'
import { CURRENT_SCHEMA_VERSION, defaultSave } from '../../src/storage/schema'
import { MemoryStorage, Store, loadSave } from '../../src/storage/store'
import { v1Save } from '../fixtures/v1-save'

const V1_KEYS = Object.keys(v1Save()).filter((k) => k !== 'schemaVersion')
const NEW_KEYS = ['stage', 'sound', 'showtime', 'notes', 'activity', 'tour', 'celebrated'] as const

function storageWith(doc: unknown): MemoryStorage {
  const s = new MemoryStorage()
  s.setItem(KEYS.save, JSON.stringify(doc))
  return s
}

describe('the save’s version', () => {
  it('is 2, and a fresh save has every new part', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2)
    const d = defaultSave() as unknown as Record<string, unknown>
    for (const k of NEW_KEYS) expect(d[k], k).toBeDefined()
  })
})

describe('a version-1 save carries over', () => {
  it('keeps everything the grown-up set up and everything she did, unchanged', () => {
    const v1 = v1Save()
    const { data, info } = loadSave(storageWith(v1))
    expect(info.kind).toBe('migrated')
    expect(data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    const got = data as unknown as Record<string, unknown>
    for (const k of V1_KEYS) expect(got[k], k).toEqual(v1[k])
  })

  it('starts the new parts at their defaults', () => {
    const { data } = loadSave(storageWith(v1Save({ withShowtime: false })))
    const fresh = defaultSave() as unknown as Record<string, unknown>
    const got = data as unknown as Record<string, unknown>
    for (const k of NEW_KEYS) expect(got[k], k).toEqual(fresh[k])
    expect(data.tour.seen).toBe(false)
    expect(data.activity).toEqual({})
  })

  it('counts a Showtime she already finished as her first, so its confetti never fires late', () => {
    expect(loadSave(storageWith(v1Save({ withShowtime: true }))).data.celebrated.firstShowtime).toBe(true)
    expect(loadSave(storageWith(v1Save({ withShowtime: false }))).data.celebrated.firstShowtime).toBe(false)
  })

  it('keeps the version-1 document as the backup copy, then writes the new one', () => {
    const v1 = v1Save()
    const storage = storageWith(v1)
    const before = storage.getItem(KEYS.save)
    const store = new Store(storage, 0)
    expect(store.loadInfo.kind).toBe('migrated')
    expect(storage.getItem(KEYS.backup)).toBe(before)
    const saved = JSON.parse(storage.getItem(KEYS.save)!)
    expect(saved.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(saved.sections).toEqual(v1.sections)
    expect(saved.progress).toEqual(v1.progress)
  })

  it('migrates once: opening the app again changes nothing', () => {
    const storage = storageWith(v1Save())
    new Store(storage, 0)
    const save1 = storage.getItem(KEYS.save)
    const backup1 = storage.getItem(KEYS.backup)
    const again = new Store(storage, 0)
    expect(again.loadInfo.kind).toBe('loaded')
    expect(storage.getItem(KEYS.save)).toBe(save1)
    expect(storage.getItem(KEYS.backup)).toBe(backup1)
    expect(JSON.parse(save1!)).toEqual(JSON.parse(JSON.stringify(again.data)))
  })

  it('is the same whether it goes through migrate() on its own or the store', () => {
    const v1 = v1Save()
    const viaMigrate = migrate(JSON.parse(JSON.stringify(v1))) as Record<string, unknown>
    expect(viaMigrate.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(loadSave(storageWith(v1)).data).toEqual(loadSave(storageWith(viaMigrate)).data)
  })

  it('recovers from a broken save using a version-1 backup', () => {
    const storage = new MemoryStorage()
    storage.setItem(KEYS.backup, JSON.stringify(v1Save()))
    storage.setItem(KEYS.save, '{broken')
    const { data, info } = loadSave(storage)
    expect(info.kind).toBe('recovered')
    expect(data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(data.sections).toEqual(v1Save().sections)
  })

  it('imports a version-1 backup file, with the same result as loading it', () => {
    const v1 = v1Save()
    const file = JSON.stringify({ app: EXPORT_APP, exportedAt: '2031-03-05T10:00:00.000Z', schemaVersion: 1, data: v1 })
    const r = parseImport(file)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data).toEqual(loadSave(storageWith(v1)).data)
    expect(r.summary.sections).toBe(2)
  })

  it('never overwrites a save from a newer version', () => {
    const newer = { ...v1Save(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 }
    const storage = storageWith(newer)
    const text = storage.getItem(KEYS.save)
    const store = new Store(storage, 0)
    expect(store.loadInfo.kind).toBe('newer')
    store.update((d) => (d.profile.name = 'Someone else'))
    store.flush()
    expect(storage.getItem(KEYS.save)).toBe(text)
  })
})

describe('the new parts of the save', () => {
  it('never store anything that grades her', () => {
    const keys: string[] = []
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) (keys.push(k), walk(x))
    }
    const d = defaultSave()
    d.activity = { '2031-03-03': { seconds: 600, ticks: [{ section: 'v1', step: 'rap-say' }], shaky: ['v1'] } }
    for (const k of NEW_KEYS) walk((d as unknown as Record<string, unknown>)[k])
    const grading = /^(scores?|points?|streaks?|stars?|percent(age)?s?|grades?|accuracy|ranks?|levels?|leaderboards?|best|results?|mistakes?|errors?|wrong|correct)$/i
    expect(keys.filter((k) => grading.test(k))).toEqual([])
  })

  it('are filled in field by field from a partial save, and odd values are made safe', () => {
    const { data } = loadSave(
      storageWith({
        schemaVersion: 2,
        stage: { name: 'x'.repeat(200), theme: 'not-a-theme' },
        sound: { voiceVolume: 7, effectsVolume: -1, voiceOn: 'yes' },
        showtime: { walkOnSeconds: 999, breaths: 0 },
        notes: { teacher: { v1: 'Keep your chin up', v2: 3 }, forHer: { text: 'Have fun', at: '2031-03-03T10:00:00.000Z' } },
        activity: { '2031-03-03': { seconds: 'lots', ticks: [{ section: 'v1', step: 'rap-say' }, 'junk'] }, nonsense: {} },
      }),
    )
    const fresh = defaultSave()
    expect(data.stage.name.length).toBeLessThanOrEqual(40)
    expect(data.stage.theme).toBe(fresh.stage.theme)
    expect(data.sound.voiceVolume).toBe(1)
    expect(data.sound.effectsVolume).toBe(0)
    expect(data.sound.voiceOn).toBe(fresh.sound.voiceOn)
    expect(data.showtime.walkOnSeconds).toBeLessThanOrEqual(30)
    expect(data.showtime.breaths).toBeGreaterThanOrEqual(1)
    expect(data.notes.teacher).toEqual({ v1: 'Keep your chin up' })
    expect(data.notes.forHer).toEqual({ text: 'Have fun', at: '2031-03-03T10:00:00.000Z', seen: false })
    expect(data.activity).toEqual({ '2031-03-03': { seconds: 0, ticks: [{ section: 'v1', step: 'rap-say' }], shaky: [] } })
  })
})
