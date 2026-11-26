/**
 * Her parts feed the path (version 1.3).
 *  - While no grown-up sections exist, her saved parts on the mirrored follow-along are the dance
 *    lessons on her path, in the order they appear in the video, with counting and learning a dance
 *    just before the first. Parts on other videos stay in the practice room.
 *  - Today's dance blocks open them in the practice room: one part each, the next open ones first.
 *  - With no parts yet, the dance block opens the practice room on the mirrored follow-along, with a
 *    short hint on making a loop that the coach reads aloud.
 *  - Rap lessons on a part with no lines play the listen-and-read video (the words are in the video)
 *    and her track, with the same loop buttons.
 *  - Grown-up sections, once they exist, work as now.
 */
import { describe, expect, it } from 'vitest'
import { speechPlan } from '../../src/audio/speech-plan'
import { KID_COPY } from '../../src/content/kid'
import { narrationLines, roomHint } from '../../src/content/narration'
import { addDays } from '../../src/model/dates'
import { LADDERS } from '../../src/model/ladders'
import { isDone, lessonPath, pathKey } from '../../src/model/path'
import { dayOk } from '../../src/model/plan'
import { cueFor, routeFor, sessionItems } from '../../src/model/session'
import { todayPlan } from '../../src/model/today'
import { stepSource } from '../../src/model/videos'
import { SKILL_LESSON_IDS, defaultSave, type MyPart, type SaveData, type Section } from '../../src/storage/schema'
import { fill } from '../../src/ui/dom'
import { lyricLine } from '../fixtures/placeholders'

const T = '2031-03-03'

function part(id: string, from: number, over: Partial<MyPart> = {}): MyPart {
  return { id, name: `Part ${id}`, source: 'ref-mirrored', from, to: from + 3, done: [], createdAt: `2031-03-0${id.length}T10:00:00.000Z`, ...over }
}

/** A fresh iPad (nothing set up) where she has saved parts in the practice room. */
function noSetup(parts: MyPart[] = [], skillsDone = true): SaveData {
  const d = defaultSave()
  d.parts = parts
  if (skillsDone) d.lessons.done = [...SKILL_LESSON_IDS]
  return d
}

function section(id: string, name: string, start: number, lines = 2): Section {
  return {
    id,
    name,
    lines: Array.from({ length: lines }, (_, i) => ({ id: `${id}-l${i}`, lyric: lyricLine(i + 1, name), lang: 'en', meaning: '', breaths: [], time: null })),
    track: { start, end: start + 8 },
    refs: {},
    createdAt: '2031-01-01T00:00:00.000Z',
  }
}

const PARTS = [part('b', 40), part('a', 12), part('c', 70), part('t', 5, { source: 'ref-tutorialParts' })]

describe('her lesson path with no grown-up sections', () => {
  it('has her follow-along parts as the dance lessons, in the order they appear in the video', () => {
    const keys = lessonPath(noSetup(PARTS)).map(pathKey)
    expect(keys.filter((k) => k.startsWith('part:'))).toEqual(['part:a', 'part:b', 'part:c'])
    // Counting and learning a dance come just before the first one; the rest still before Showtime.
    const first = keys.indexOf('part:a')
    expect(keys.slice(first - 2, first)).toEqual(['skill:counting', 'skill:learning-a-dance'])
    expect(keys.at(-1)).toBe('showtime')
    expect(keys.filter((k) => k.startsWith('skill:')).sort()).toEqual(SKILL_LESSON_IDS.map((id) => `skill:${id}`).sort())
  })

  it('leaves parts on other videos in the practice room', () => {
    expect(lessonPath(noSetup(PARTS)).map(pathKey)).not.toContain('part:t')
  })

  it('counts a part finished once it is ticked at 50, 75 and 100% speed', () => {
    const d = noSetup([part('a', 12, { done: [0.5, 0.75] }), part('b', 40, { done: [0.5, 0.75, 1] })])
    expect(isDone(d, { kind: 'part', partId: 'a' })).toBe(false)
    expect(isDone(d, { kind: 'part', partId: 'b' })).toBe(true)
  })

  it('is just as before once a grown-up adds sections: her parts stay in the practice room', () => {
    const d = noSetup(PARTS)
    d.sections = [section('s1', 'Intro', 2), section('s2', 'Verse 1', 10)]
    const keys = lessonPath(d).map(pathKey)
    expect(keys.some((k) => k.startsWith('part:'))).toBe(false)
    const without = { ...d, parts: [] }
    expect(keys).toEqual(lessonPath(without).map(pathKey))
    expect(todayPlan(d, T)).toEqual(todayPlan(without, T))
  })
})

describe('today with no grown-up sections', () => {
  it('has a dance block for each of her next parts, in path order, keeping the voice and water rules', () => {
    const d = noSetup(PARTS)
    d.parts[1] = { ...d.parts[1], done: [0.5, 0.75, 1] } // part a is finished
    const day = todayPlan(d, T)!
    expect(day.blocks[0].type).toBe('warmup')
    expect(day.blocks.at(-1)!.type).toBe('cooldown')
    expect(dayOk(day.blocks)).toBe(true)
    const dance = day.blocks.filter((b) => b.type === 'dance')
    expect(dance.map((b) => b.partIds)).toEqual([['b'], ['c']])
    expect(day.blocks.some((b) => b.type === 'rap' || b.type === 'together')).toBe(false)
  })

  it('with no parts yet, has one dance block that opens the practice room, about 25 minutes in all', () => {
    const day = todayPlan(noSetup(), T)!
    expect(day.blocks.map((b) => b.type)).toEqual(['warmup', 'dance', 'cooldown'])
    expect(day.blocks[1].partIds ?? []).toEqual([])
    expect(day.minutes).toBeGreaterThanOrEqual(20)
    expect(day.minutes).toBeLessThanOrEqual(30)
  })

  it('with dates set, gives each dance block one of her open parts in turn', () => {
    const d = noSetup(PARTS)
    d.show = { name: 'Showcase', date: addDays(T, 30) }
    d.plan = { startDate: T, holidayStart: null, holidayEnd: null, schoolMinutes: 45, holidayMinutes: 120, lightWeekday: 6 }
    const dance = todayPlan(d, T)!.blocks.filter((b) => b.type === 'dance')
    expect(dance.length).toBeGreaterThan(0)
    for (const b of dance) expect(['a', 'b', 'c']).toContain(b.partIds?.[0])
    expect(dance[0].partIds).toEqual(['a'])
  })
})

describe('today’s session with no grown-up sections', () => {
  it('opens her parts in the practice room, after the skill lessons a dance needs', () => {
    const d = noSetup(PARTS, false)
    const day = todayPlan(d, T)!
    const items = sessionItems(d, day, T)
    expect(items[0]).toMatchObject({ kind: 'routine', type: 'warmup' })
    const rooms = items.filter((i) => i.kind === 'room')
    expect(rooms.map((i) => (i.kind === 'room' ? i.partId : null))).toEqual(['a', 'b', 'c'])
    const firstRoom = items.findIndex((i) => i.kind === 'room')
    expect(items.slice(1, firstRoom).map((i) => (i.kind === 'lesson' ? i.lessonId : i.kind))).toEqual(['counting', 'learning-a-dance'])
    expect(routeFor(rooms[0])).toBe('/room?part=a&session=1')
  })

  it('with no parts yet, opens the practice room on the mirrored follow-along with the hint', () => {
    const d = noSetup()
    const items = sessionItems(d, todayPlan(d, T)!, T)
    const room = items.find((i) => i.kind === 'room')!
    expect(room).toMatchObject({ kind: 'room', partId: null, source: 'ref-mirrored', hint: true })
    expect(routeFor(room)).toBe('/room?source=ref-mirrored&hint=1&session=1')
    expect(cueFor(room, d)).toBe('Next: Dance')
  })

  it('names her part, the ladder and its next speed before it: "Next: Spin, Dance, 50% speed"', () => {
    const d = noSetup([part('a', 12, { name: 'Spin', done: [0.5] })])
    const room = sessionItems(d, todayPlan(d, T)!, T).find((i) => i.kind === 'room')!
    expect(cueFor(room, d)).toBe(fill(KID_COPY.cues.nextStep, { section: 'Spin', ladder: 'Dance', speed: 75 }))
    // The coach says "Next" and "Dance, 75% speed"; only her own name for it is the iPad's voice.
    expect(speechPlan(cueFor(room, d)).map((p) => [p.kind, p.text])).toEqual([
      ['clip', 'Next'],
      ['speech', 'Spin'],
      ['clip', 'Dance, 75% speed'],
    ])
  })
})

describe('the hint on making a loop', () => {
  it('is short, and the coach reads it, word for word', () => {
    const hint = roomHint()
    expect(hint).toEqual([KID_COPY.room.hint1, KID_COPY.room.hint2, KID_COPY.room.hint3])
    expect(hint.join(' ').split(/\s+/).length).toBeLessThanOrEqual(50)
    expect(hint.join(' ')).toMatch(/Loop start/)
    expect(hint.join(' ')).toMatch(/Loop end/)
    const narrated = new Set(narrationLines().map((l) => l.text))
    for (const t of hint) expect(narrated.has(t), t).toBe(true)
  })
})

describe('rap lessons on a part with no lines', () => {
  it('play the listen-and-read video where the words would light up, and her track for the rest', () => {
    const empty = section('s1', 'Verse 1', 2, 0)
    expect(LADDERS.rap.map((s) => stepSource(s, empty))).toEqual(['listen', 'listen', 'track', 'track', 'track'])
    const typed = section('s1', 'Verse 1', 2, 2)
    expect(LADDERS.rap.map((s) => stepSource(s, typed))).toEqual(LADDERS.rap.map((s) => s.source))
    // Dance and together lessons are as before.
    for (const l of ['dance', 'together'] as const) expect(LADDERS[l].map((s) => stepSource(s, empty))).toEqual(LADDERS[l].map((s) => s.source))
  })

  it('never say the lesson must wait for the words', () => {
    const L = KID_COPY.learn
    expect(L.wordsInVideo).toMatch(/words/)
    expect(L.wordsLater).toMatch(/words/)
    for (const t of [L.wordsInVideo, L.wordsLater, KID_COPY.practice.wordsInVideo]) expect(t, t).not.toMatch(/needs?|must|first|wait/i)
  })
})
