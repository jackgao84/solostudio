/**
 * The practice room (version 1.3): practice that needs no setup.
 *  - She picks any video (the mirrored follow-along, the tutorials, the performance, the original,
 *    listen-and-read, any other video a grown-up added) or her track once it is on the iPad, and
 *    plays it with the speed control. A fresh iPad already has videos to pick.
 *  - She makes her own loop by tapping Loop start and Loop end while it plays, and nudges either end;
 *    a loop is at least a second long and never starts before 0.
 *  - She names and saves a loop as one of her parts; she ticks "I did it" on a part at 50, 75 and
 *    100% speed. Her parts are hers to rename or delete.
 *  - Nothing she sees before a grown-up has set anything up tells her to wait for one.
 */
import { describe, expect, it } from 'vitest'
import { kidStrings } from '../../src/content'
import { KID_COPY } from '../../src/content/kid'
import { DEFAULT_REFS } from '../../src/content/references'
import { loopBetween } from '../../src/model/videos'
import {
  NUDGE_S,
  TRACK_SOURCE,
  cleanPartName,
  defaultPartName,
  defaultSource,
  nextPartSpeed,
  nudgeLoop,
  partFinished,
  partRung,
  roomSources,
  tickPart,
} from '../../src/model/room'
import { PART_NAME_MAX, defaultSave, type MyPart } from '../../src/storage/schema'
import { WAIT_FOR_GROWNUP } from '../fixtures/grownup-words'

const part = (over: Partial<MyPart> = {}): MyPart => ({ id: 'p1', name: 'Spin', source: 'ref-mirrored', from: 12.4, to: 15.2, done: [], createdAt: '2031-03-07T10:00:00.000Z', ...over })


describe('what she can pick', () => {
  it('is every video on a fresh iPad, the dance videos first; her track only once it is loaded', () => {
    const d = defaultSave()
    const list = roomSources(d)
    expect(list.map((s) => s.role)).toEqual(['mirrored', 'tutorialParts', 'tutorialFull', 'performance', 'original', 'listen', 'slow'])
    expect(list.map((s) => s.id).sort()).toEqual(DEFAULT_REFS.map((r) => r.id).sort())
    expect(list.some((s) => s.id === TRACK_SOURCE)).toBe(false)
    d.track.mediaId = 'media-track'
    expect(roomSources(d).at(-1)).toMatchObject({ id: TRACK_SOURCE, kind: 'track', role: 'track' })
  })

  it('includes a video a grown-up added from the iPad, and leaves out one with no video in it', () => {
    const d = defaultSave()
    d.refs.push({ id: 'ref-local-1', role: 'local', label: 'Teacher demo', kind: 'local', youtubeId: '', mediaId: 'media-video-1', fileName: 'demo.mov', synced: true, alreadyMirrored: false, mirror: true })
    d.refs.find((r) => r.id === 'ref-slow')!.youtubeId = ''
    const ids = roomSources(d).map((s) => s.id)
    expect(ids).toContain('ref-local-1')
    expect(ids).not.toContain('ref-slow')
  })

  it('opens on the mirrored follow-along, or the first video there is', () => {
    const d = defaultSave()
    expect(defaultSource(d)).toBe('ref-mirrored')
    d.refs = d.refs.filter((r) => r.role !== 'mirrored')
    expect(defaultSource(d)).toBe('ref-tutorialParts')
  })

  it('has a kid-friendly name for every kind of video', () => {
    const R = KID_COPY.room
    for (const k of ['sourceMirrored', 'sourceTutorialParts', 'sourceTutorialFull', 'sourcePerformance', 'sourceOriginal', 'sourceListen', 'sourceSlow', 'sourceTrack', 'sourceLocal'] as const) expect(R[k], k).toBeTruthy()
  })
})

describe('her own loop', () => {
  it('goes round the bit between Loop start and Loop end, whichever order, at least a second long', () => {
    expect(loopBetween(12.4, 15.2)).toEqual({ from: 12.4, to: 15.2 })
    expect(loopBetween(15.2, 12.4)).toEqual({ from: 12.4, to: 15.2 })
    expect(loopBetween(12.4, 12.6)).toEqual({ from: 12.4, to: 13.4 })
  })

  it('nudges either end by a small step, never below 0 and never shorter than a second', () => {
    expect(NUDGE_S).toBeGreaterThanOrEqual(0.1)
    expect(NUDGE_S).toBeLessThanOrEqual(0.25)
    const l = { from: 12.4, to: 15.2 }
    expect(nudgeLoop(l, 'from', -1)).toEqual({ from: 12.2, to: 15.2 })
    expect(nudgeLoop(l, 'from', 1)).toEqual({ from: 12.6, to: 15.2 })
    expect(nudgeLoop(l, 'to', 1)).toEqual({ from: 12.4, to: 15.4 })
    expect(nudgeLoop(l, 'to', -1)).toEqual({ from: 12.4, to: 15 })
    expect(nudgeLoop({ from: 0.1, to: 3 }, 'from', -1)).toEqual({ from: 0, to: 3 })
    expect(nudgeLoop({ from: 2, to: 3 }, 'to', -1)).toEqual({ from: 2, to: 3 })
    expect(nudgeLoop({ from: 2, to: 3 }, 'from', 1)).toEqual({ from: 2, to: 3 })
  })
})

describe('her parts', () => {
  it('get a name she can keep or change: My part 1, My part 2…', () => {
    expect(defaultPartName([], KID_COPY.room.partName)).toBe('My part 1')
    expect(defaultPartName([part(), part({ id: 'p2', name: 'My part 1' })], KID_COPY.room.partName)).toBe('My part 3')
    expect(defaultPartName([part({ name: 'My part 2' })], KID_COPY.room.partName)).toBe('My part 3')
  })

  it('keep a name short and never empty', () => {
    expect(cleanPartName('  Big spin  ', 'Old')).toBe('Big spin')
    expect(cleanPartName('   ', 'Old')).toBe('Old')
    expect(cleanPartName('x'.repeat(80), 'Old')).toHaveLength(PART_NAME_MAX)
  })

  it('are ticked at 50, 75 and 100% speed, each speed once, then finished', () => {
    expect(partRung(0.5)).toBe(0.5)
    expect(partRung(0.6)).toBe(0.5)
    expect(partRung(0.75)).toBe(0.75)
    expect(partRung(0.9)).toBe(0.75)
    expect(partRung(1)).toBe(1)
    let p = part()
    expect(nextPartSpeed(p)).toBe(0.5)
    p = tickPart(p, 0.5)
    expect(p.done).toEqual([0.5])
    expect(nextPartSpeed(p)).toBe(0.75)
    p = tickPart(tickPart(p, 0.75), 0.75)
    expect(p.done).toEqual([0.5, 0.75])
    expect(partFinished(p)).toBe(false)
    p = tickPart(p, 1)
    expect(p.done).toEqual([0.5, 0.75, 1])
    expect(partFinished(p)).toBe(true)
    expect(nextPartSpeed(p)).toBe(1)
  })
})

describe('her words before any setup', () => {
  it('never tell her to wait for a grown-up on the welcome, home or practice room screens', () => {
    const seen = kidStrings().filter((s) => ['welcome', 'today', 'home', 'room', 'video', 'block'].includes(s.group))
    expect(seen.filter((s) => WAIT_FOR_GROWNUP.test(s.text)).map((s) => `${s.where}: ${s.text}`)).toEqual([])
  })

  it('the check itself catches the lines it is meant to', () => {
    for (const t of ['A grown-up sets things up first. Then it’s all yours.', 'A grown-up needs to set the show date first.', 'A grown-up adds the parts of your song first.', 'Before you start, a grown-up must load your track.'])
      expect(WAIT_FOR_GROWNUP.test(t), t).toBe(true)
    for (const t of ['Grown-ups: press and hold', 'A grown-up can swap this video in the grown-ups’ area.', 'Find someone at home to watch.']) expect(WAIT_FOR_GROWNUP.test(t), t).toBe(false)
  })
})
