/**
 * Lessons become the home page (version 1.2). Her lesson path mixes:
 *  - the eight skill lessons, each just before the first lesson that needs it (counting, the voice
 *    warm-up and rap basics before her first rap lesson, learning a dance before her first dance lesson, marking and
 *    breathing before her first together lesson, expressions and performing before Showtime);
 *  - section lessons built from her sections: Rap, Dance and Together for each, holding that ladder's
 *    rungs. The default order: each section's Rap then Dance, in song order; then each Together.
 * The path order is the default; the plan still decides which lessons are today's. With no dates
 * set yet, today's lessons are the next ones on the path, in a day that keeps the voice and water
 * rules. A lesson that needs something setup hasn't covered says what (and which wizard step).
 */
import { describe, expect, it } from 'vitest'
import { KID_COPY } from '../../src/content/kid'
import { SECTION_LESSON_COPY } from '../../src/content/learn'
import { kidStrings } from '../../src/content'
import { addDays } from '../../src/model/dates'
import { LADDERS } from '../../src/model/ladders'
import { SKILL_NEEDS, isDone, lessonGaps, lessonPath, pathKey, sectionLessonVideo, skillsDue, type PathItem } from '../../src/model/path'
import { dayOk, planDay, planInputFrom } from '../../src/model/plan'
import { tickStep } from '../../src/model/progress'
import { sessionItems } from '../../src/model/session'
import { todayPlan } from '../../src/model/today'
import { SKILL_LESSON_IDS, defaultSave, emptyProgress, type SaveData, type Section } from '../../src/storage/schema'
import { lyricLine } from '../fixtures/placeholders'

const T = '2031-03-03'

function section(id: string, name: string, start: number | null, lines = 2): Section {
  return {
    id,
    name,
    lines: Array.from({ length: lines }, (_, i) => ({ id: `${id}-l${i}`, lyric: lyricLine(i + 1, name), lang: 'en', meaning: '', breaths: [], time: null })),
    track: { start, end: start == null ? null : start + 8 },
    refs: {},
    createdAt: '2031-01-01T00:00:00.000Z',
  }
}

function save(opts: { plan?: boolean; skillsDone?: boolean } = {}): SaveData {
  const d = defaultSave()
  d.setup.complete = true
  d.track.mediaId = 'media-track'
  d.sections = [section('s1', 'Intro', 2), section('s2', 'Verse 1', 10), section('s3', 'Chorus', 18)]
  d.tempo = { bpm: 120, offset: 0.5 }
  if (opts.plan) {
    d.show = { name: 'Showcase', date: addDays(T, 30) }
    d.plan = { startDate: T, holidayStart: null, holidayEnd: null, schoolMinutes: 45, holidayMinutes: 120, lightWeekday: 6 }
  }
  if (opts.skillsDone) d.lessons.done = [...SKILL_LESSON_IDS]
  return d
}

const key = (i: PathItem) => pathKey(i)

describe('her lesson path', () => {
  it('puts each skill lesson just before the first lesson that needs it', () => {
    expect(lessonPath(save()).map(key)).toEqual([
      'skill:counting',
      'skill:voice-warm-up',
      'skill:rap-basics',
      'section:s1:rap',
      'skill:learning-a-dance',
      'section:s1:dance',
      'section:s2:rap',
      'section:s2:dance',
      'section:s3:rap',
      'section:s3:dance',
      'skill:marking',
      'skill:breathing',
      'section:s1:together',
      'section:s2:together',
      'section:s3:together',
      'skill:expressions',
      'skill:performing',
      'showtime',
    ])
    expect(SKILL_NEEDS.together).toEqual(['marking', 'breathing'])
  })

  it('follows her sections in song order, and still has every skill lesson with no sections yet', () => {
    const d = save()
    d.sections.reverse()
    expect(lessonPath(d).filter((i) => i.kind === 'section' && i.ladder === 'rap').map(key)).toEqual(['section:s1:rap', 'section:s2:rap', 'section:s3:rap'])
    d.sections = []
    expect(lessonPath(d).filter((i) => i.kind === 'skill').map(key).sort()).toEqual(SKILL_LESSON_IDS.map((id) => `skill:${id}`).sort())
  })

  it('counts a section lesson finished when every rung of its ladder is ticked, and a skill lesson when she did it', () => {
    const d = save()
    let p = emptyProgress()
    for (const s of LADDERS.rap) p = tickStep(p, 'rap', s.id, T)
    d.progress.s1 = p
    d.lessons.done = ['counting']
    expect(isDone(d, { kind: 'section', sectionId: 's1', ladder: 'rap' })).toBe(true)
    expect(isDone(d, { kind: 'section', sectionId: 's1', ladder: 'dance' })).toBe(false)
    expect(isDone(d, { kind: 'skill', id: 'counting' })).toBe(true)
    expect(isDone(d, { kind: 'skill', id: 'marking' })).toBe(false)
    expect(skillsDue(d, 'rap')).toEqual(['voice-warm-up', 'rap-basics'])
    expect(skillsDue(d, 'together')).toEqual(['marking', 'breathing'])
  })
})

describe('today’s lessons', () => {
  it('come from the plan when there is one, with any skill lesson due just before what needs it', () => {
    const d = save({ plan: true })
    const day = planDay(planInputFrom(d)!, T)!
    expect(todayPlan(d, T)).toEqual(day)
    const items = sessionItems(d, day, T)
    expect(items[0]).toMatchObject({ kind: 'routine', type: 'warmup' })
    const firstPractice = items.findIndex((i) => i.kind === 'practice')
    const ladder = (items[firstPractice] as { stepId: string }).stepId.split('-')[0] as 'rap' | 'dance'
    const before = items.slice(1, firstPractice).map((i) => (i.kind === 'lesson' ? i.lessonId : i.kind))
    expect(before).toEqual([...SKILL_NEEDS[ladder]])
    // Each skill lesson comes up once.
    const lessons = items.filter((i) => i.kind === 'lesson').map((i) => (i as { lessonId: string }).lessonId)
    expect(new Set(lessons).size).toBe(lessons.length)
  })

  it('leave skill lessons out once she has done them', () => {
    const d = save({ plan: true, skillsDone: true })
    const day = planDay(planInputFrom(d)!, T)!
    expect(sessionItems(d, day, T).filter((i) => i.kind === 'lesson')).toEqual([])
  })

  it('with no dates set, are the next lessons on her path in a day that keeps the voice and water rules', () => {
    const d = save({ skillsDone: true })
    expect(d.plan).toBeNull()
    const day = todayPlan(d, T)!
    expect(day).not.toBeNull()
    expect(day.blocks[0].type).toBe('warmup')
    expect(day.blocks.at(-1)!.type).toBe('cooldown')
    expect(dayOk(day.blocks)).toBe(true)
    const practised = day.blocks.filter((b) => ['rap', 'dance', 'together'].includes(b.type)).map((b) => `section:${b.sectionIds[0]}:${b.type}`)
    expect(practised.length).toBeGreaterThanOrEqual(2)
    const path = lessonPath(d).map(key).filter((k) => k.startsWith('section:'))
    expect(practised).toEqual(path.slice(0, practised.length))
    expect(day.minutes).toBeGreaterThanOrEqual(30)
    expect(day.minutes).toBeLessThanOrEqual(50)
  })

  it('with no sections yet, there is nothing to practise today', () => {
    const d = save()
    d.sections = []
    expect(todayPlan(d, T)).toBeNull()
  })
})

describe('a section lesson', () => {
  it('plays the right video for its section, marked or not', () => {
    const d = save()
    const s = d.sections[2] // Chorus
    expect(sectionLessonVideo(d, s, 'rap')?.ref.role).toBe('listen')
    expect(sectionLessonVideo(d, s, 'dance')?.ref.role).toBe('tutorialParts')
    expect(sectionLessonVideo(d, d.sections[1], 'dance')?.ref.role).toBe('tutorialFull')
    expect(sectionLessonVideo(d, s, 'together')?.ref.role).toBe('mirrored')
    // Where it is marked, it starts there; where it isn't, from the start.
    expect(sectionLessonVideo(d, s, 'together')?.start).toBe(0)
    s.refs['ref-mirrored'] = { start: 41.5, end: 49 }
    expect(sectionLessonVideo(d, s, 'together')?.start).toBe(41.5)
  })

  it('says plainly what setup hasn’t covered yet, and which step opens it', () => {
    const d = save()
    expect(lessonGaps(d, 's1', 'rap')).toEqual([])
    d.sections[0].lines = []
    expect(lessonGaps(d, 's1', 'rap')).toEqual(['lines'])
    expect(lessonGaps(d, 's1', 'dance')).toEqual([])
    d.sections[1].track = { start: null, end: null }
    expect(lessonGaps(d, 's2', 'together')).toEqual(['starts'])
    d.track = { mediaId: null, fileName: '', duration: null, standInYoutubeId: '' }
    expect(lessonGaps(d, 's2', 'together')).toEqual(['track', 'starts'])
    for (const k of ['needsTrack', 'needsLines', 'needsStarts', 'askGrownUp', 'openStep'] as const) expect(KID_COPY.learn[k]).toBeTruthy()
  })

  it('has a short narrated intro for each ladder', () => {
    for (const ladder of ['rap', 'dance', 'together'] as const) {
      const intro = SECTION_LESSON_COPY[ladder].intro
      expect(intro.length, ladder).toBeGreaterThanOrEqual(2)
      expect(intro.join(' ').split(/\s+/).length, ladder).toBeLessThanOrEqual(70)
    }
  })
})

describe('her words', () => {
  it('never tell her a grown-up must mark a video first', () => {
    const tellsHerToWait = (t: string) => /grown-up/i.test(t) && /\bmark(s|ed)?\b/i.test(t) && /\b(video|videos|on one)\b/i.test(t)
    expect(kidStrings().filter((s) => tellsHerToWait(s.text)).map((s) => `${s.where}: ${s.text}`)).toEqual([])
  })
})
