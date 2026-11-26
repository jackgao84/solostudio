/**
 * Fun that rewards effort only (version 1.1).
 * - Her stage: each section is a lighting rig with a light for every ladder step; a ticked step
 *   switches its light on, so her progress map is the stage filling up. On show day every light is on,
 *   whatever is ticked.
 * - A K-pop style D-day countdown: "D-12", then "D-DAY".
 * - Build the line: a line's words shuffled into chips that she taps back in order. A chip that isn't
 *   next just doesn't join; nothing is counted.
 * - Celebrations for doing things: a light and its switch-on sound for each ticked step, a cheer when a
 *   ladder's last step is ticked, confetti for her first full Showtime. Never for how well she did.
 */
import { describe, expect, it } from 'vitest'
import { KID_COPY } from '../../src/content/kid'
import { chipsFor, nextChip, tapChip, lineBuilt } from '../../src/model/buildline'
import { celebrateShowtime, celebrationsForTick } from '../../src/model/celebrate'
import { addDays } from '../../src/model/dates'
import { LADDERS, LADDER_IDS } from '../../src/model/ladders'
import { ddayLabel, stageRigs } from '../../src/model/stage'
import { defaultSave, emptyProgress, type SaveData } from '../../src/storage/schema'

const TODAY = '2031-03-20'

function save(): SaveData {
  const d = defaultSave()
  d.show = { name: 'Showcase', date: addDays(TODAY, 12) }
  d.sections = [
    { id: 'ch', name: 'Chorus', lines: [], track: { start: 10, end: 17 }, refs: {}, createdAt: '2031-03-01T00:01:00.000Z' },
    { id: 'v1', name: 'Verse 1', lines: [], track: { start: 2, end: 9 }, refs: {}, createdAt: '2031-03-01T00:00:00.000Z' },
  ]
  d.progress = { v1: { ...emptyProgress(), rap: { done: ['rap-listen', 'rap-say'], fade: 0, finishedAt: null, review: null }, dance: { done: ['dance-watch'], fade: 0, finishedAt: null, review: null } } }
  return d
}

describe('her stage', () => {
  it('has a rig for each section in song order, with a light for every ladder step', () => {
    const { rigs } = stageRigs(save(), TODAY)
    expect(rigs.map((r) => r.name)).toEqual(['Verse 1', 'Chorus'])
    const all = LADDER_IDS.flatMap((l) => LADDERS[l].map((s) => s.id))
    for (const r of rigs) expect(r.lights.map((l) => l.stepId)).toEqual(all)
  })

  it('switches a light on for each step she has ticked', () => {
    const { rigs, allOn } = stageRigs(save(), TODAY)
    expect(allOn).toBe(false)
    expect(rigs[0].lights.filter((l) => l.on).map((l) => l.stepId)).toEqual(['rap-listen', 'rap-say', 'dance-watch'])
    expect(rigs[1].lights.filter((l) => l.on)).toEqual([])
  })

  it('lights up completely on show day, whatever is ticked', () => {
    const d = save()
    d.show = { name: 'Showcase', date: TODAY }
    const { rigs, allOn } = stageRigs(d, TODAY)
    expect(allOn).toBe(true)
    for (const r of rigs) for (const l of r.lights) expect(l.on).toBe(true)
  })
})

describe('the D-day countdown', () => {
  it('counts down K-pop style', () => {
    expect(ddayLabel(12)).toBe('D-12')
    expect(ddayLabel(1)).toBe('D-1')
    expect(ddayLabel(0)).toBe('D-DAY')
    expect(ddayLabel(-1)).toBeNull()
    expect(KID_COPY.today.dday).toBe('D-{days}')
  })
})

describe('build the line', () => {
  const words = ['w1', 'w2', 'w3', 'w2', 'w5']

  it('shuffles the words into chips, never in their own order', () => {
    for (let a = 0; a < 20; a++) {
      const chips = chipsFor(words, `line-1:${a}`)
      expect(chips.map((c) => c.word).sort()).toEqual([...words].sort())
      expect(chips.map((c) => c.word)).not.toEqual(words)
      expect(new Set(chips.map((c) => c.id)).size).toBe(words.length)
    }
    expect(chipsFor(['only'], 'x').map((c) => c.word)).toEqual(['only'])
  })

  it('takes a chip that is next, and leaves one that isn’t where it is', () => {
    const chips = chipsFor(words, 'line-1:0')
    const id = (w: string, skip: number[] = []) => chips.find((c) => c.word === w && !skip.includes(c.id))!.id
    let placed: number[] = []
    const wrong = tapChip(words, chips, placed, id('w3'))
    expect(wrong).toEqual({ joined: false, placed: [] })
    for (const w of words) {
      const r = tapChip(words, chips, placed, id(w, placed))
      expect(r.joined).toBe(true)
      placed = r.placed
    }
    expect(lineBuilt(words, placed)).toBe(true)
  })

  it('treats the same word on two chips as the same', () => {
    const chips = chipsFor(words, 'line-1:3')
    const twos = chips.filter((c) => c.word === 'w2').map((c) => c.id)
    let placed = tapChip(words, chips, [], chips.find((c) => c.word === 'w1')!.id).placed
    placed = tapChip(words, chips, placed, twos[1]).placed
    expect(placed).toHaveLength(2)
    expect(nextChip(words, chips, placed)).toBe(chips.find((c) => c.word === 'w3')!.id)
  })

  it('keeps no count of taps that didn’t join', () => {
    const r = tapChip(words, chipsFor(words, 's'), [], -1) as unknown as Record<string, unknown>
    expect(Object.keys(r).sort()).toEqual(['joined', 'placed'])
  })
})

describe('celebrations are for doing things', () => {
  it('switch a light on for each new step, and cheer when it finishes a ladder', () => {
    const p = emptyProgress()
    expect(celebrationsForTick(p, 'rap', 'rap-listen')).toEqual(['lightOn'])
    p.rap.done = ['rap-listen', 'rap-say', 'rap-fade', 'rap-memory-75']
    expect(celebrationsForTick(p, 'rap', 'rap-memory-100')).toEqual(['lightOn', 'ladderDone'])
    p.rap.done.push('rap-memory-100')
    expect(celebrationsForTick(p, 'rap', 'rap-memory-100')).toEqual([])
  })

  it('throw confetti for her first full Showtime, once', () => {
    const d = defaultSave()
    expect(celebrateShowtime(d)).toBe(true)
    d.celebrated.firstShowtime = true
    expect(celebrateShowtime(d)).toBe(false)
  })

  it('depend on nothing but what she did', () => {
    expect(celebrationsForTick.length).toBe(3)
    expect(celebrateShowtime.length).toBe(1)
  })
})
