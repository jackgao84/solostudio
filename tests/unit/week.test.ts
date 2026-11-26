/**
 * The grown-ups' week (version 1.1): a summary of the last 7 days, today included. Days practised and
 * minutes, ladder steps she ticked per section, sections marked shaky, and her "one thing" notes from
 * Showtime, clips and performing for family. Nothing older than 7 days, and nothing graded.
 * The practice log behind it: seconds practised, steps ticked and sections marked shaky, by day.
 */
import { describe, expect, it } from 'vitest'
import { logSeconds, logShaky, logTick, ACTIVITY_KEEP_DAYS } from '../../src/model/activity'
import { addDays } from '../../src/model/dates'
import { weekSummary } from '../../src/model/week'
import { defaultSave, emptyActivity, type SaveData } from '../../src/storage/schema'

const TODAY = '2031-03-20'
/** An ISO time at a local hour on a day (reflections store ISO times; the week goes by her local days). */
const localIso = (day: string, hour = 18) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, hour).toISOString()
}

function save(): SaveData {
  const d = defaultSave()
  d.sections = [
    { id: 'v1', name: 'Verse 1', lines: [], track: { start: 2, end: 9 }, refs: {}, createdAt: '2031-03-01T00:00:00.000Z' },
    { id: 'ch', name: 'Chorus', lines: [], track: { start: 10, end: 17 }, refs: {}, createdAt: '2031-03-01T00:01:00.000Z' },
    { id: 'br', name: 'Dance Break', lines: [], track: { start: 18, end: 25 }, refs: {}, createdAt: '2031-03-01T00:02:00.000Z' },
  ]
  d.activity = {
    [TODAY]: { seconds: 900, ticks: [{ section: 'v1', step: 'rap-fade' }, { section: 'ch', step: 'dance-follow-50' }], shaky: [] },
    [addDays(TODAY, -2)]: { seconds: 1800, ticks: [{ section: 'v1', step: 'rap-say' }], shaky: ['ch'] },
    [addDays(TODAY, -6)]: { seconds: 1500, ticks: [{ section: 'v1', step: 'rap-listen' }, { section: 'ch', step: 'dance-watch' }], shaky: [] },
    // A day with the app open for a moment only.
    [addDays(TODAY, -4)]: { seconds: 20, ticks: [], shaky: [] },
    // Eight days ago: outside the week.
    [addDays(TODAY, -7)]: { seconds: 3000, ticks: [{ section: 'br', step: 'dance-watch' }], shaky: ['br'] },
  }
  d.days = { [addDays(TODAY, -3)]: { order: [], done: [`${addDays(TODAY, -3)}-0-warmup`] } }
  d.reflections = [
    { id: 'r1', at: localIso(addDays(TODAY, -1)), kind: 'showtime', target: 'run', wentWell: 'I kept going', workOn: 'Breathing' },
    { id: 'r2', at: localIso(addDays(TODAY, -9)), kind: 'clip', target: 'v1', wentWell: 'Big energy', workOn: 'A tricky move' },
  ]
  d.progress = { br: { rap: { done: [], fade: 0, finishedAt: null, review: null }, dance: { done: ['dance-watch'], fade: 0, finishedAt: null, review: null }, together: { done: [], fade: 0, finishedAt: null, review: null }, shaky: true, shakyDue: TODAY } }
  return d
}

describe('the grown-ups’ week', () => {
  const w = weekSummary(save(), TODAY)

  it('covers the last 7 days, today included', () => {
    expect(w.from).toBe(addDays(TODAY, -6))
    expect(w.to).toBe(TODAY)
    expect(w.days.map((d) => d.date)).toEqual(Array.from({ length: 7 }, (_, i) => addDays(TODAY, i - 6)))
  })

  it('counts the days she practised and the minutes', () => {
    // Today, 2, 3 (a block done) and 6 days ago, and 1 day ago (a Showtime); not 4 days ago (20 s).
    expect(w.daysPractised).toBe(5)
    expect(w.minutes).toBe(Math.round((900 + 1800 + 1500 + 20) / 60))
  })

  it('lists the ladder steps she ticked for each section, in song order', () => {
    expect(w.bySection.map((s) => [s.name, s.steps])).toEqual([
      ['Verse 1', 3],
      ['Chorus', 2],
      ['Dance Break', 0],
    ])
    expect(w.bySection[0].ladders).toEqual({ rap: 3, dance: 0, together: 0 })
    expect(w.bySection[1].ladders).toEqual({ rap: 0, dance: 2, together: 0 })
  })

  it('lists the sections marked shaky this week, and the ones still shaky now', () => {
    expect(w.shaky.map((s) => [s.name, s.markedThisWeek, s.shakyNow])).toEqual([
      ['Chorus', true, false],
      ['Dance Break', false, true],
    ])
  })

  it('shows her "one thing" notes from the week, newest first', () => {
    expect(w.notes).toEqual([{ date: addDays(TODAY, -1), kind: 'showtime', wentWell: 'I kept going', workOn: 'Breathing' }])
  })

  it('has nothing in it that grades her', () => {
    const keys: string[] = []
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) (keys.push(k), walk(x))
    }
    walk(w)
    expect(keys.filter((k) => /^(scores?|points?|streaks?|stars?|percent\w*|grades?|accuracy|ranks?|levels?|best|mistakes?)$/i.test(k))).toEqual([])
  })

  it('is empty, not broken, before she has practised', () => {
    const empty = weekSummary(defaultSave(), TODAY)
    expect(empty.daysPractised).toBe(0)
    expect(empty.minutes).toBe(0)
    expect(empty.bySection).toEqual([])
    expect(empty.notes).toEqual([])
  })
})

describe('the practice log', () => {
  it('adds practice time, ticked steps and shaky marks to the day', () => {
    const d = defaultSave()
    logSeconds(d, TODAY, 5)
    logSeconds(d, TODAY, 5)
    logTick(d, TODAY, 'v1', 'rap-say')
    logTick(d, TODAY, 'v1', 'rap-say')
    logShaky(d, TODAY, 'ch')
    logShaky(d, TODAY, 'ch')
    expect(d.activity[TODAY]).toEqual({ seconds: 10, ticks: [{ section: 'v1', step: 'rap-say' }], shaky: ['ch'] })
  })

  it('keeps a few months and lets older days go', () => {
    const d = defaultSave()
    d.activity[addDays(TODAY, -ACTIVITY_KEEP_DAYS - 1)] = { ...emptyActivity(), seconds: 60 }
    d.activity[addDays(TODAY, -ACTIVITY_KEEP_DAYS + 1)] = { ...emptyActivity(), seconds: 60 }
    logSeconds(d, TODAY, 5)
    expect(Object.keys(d.activity).sort()).toEqual([addDays(TODAY, -ACTIVITY_KEEP_DAYS + 1), TODAY])
  })
})
