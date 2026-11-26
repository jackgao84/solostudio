/**
 * Version 1.4, part 1: karaoke videos in the app.
 *  - Two more default videos under their own names: "Voice guide (light)" (81BPeeksFqo, the singer's
 *    voice turned down low) and "Karaoke (no voice)" (d_-jC3519xI). Both play in time with the music.
 *  - A grown-up can add any YouTube video under a name they choose, and rename, swap or remove it.
 *    Every video appears in the practice room by its name.
 *  - With no guide file, the rap ladder fades the singer's voice: listen with the listen-and-read
 *    video, say it with Voice guide, say it with Karaoke, then from memory over her track. She can
 *    always go back a step, and that never counts against her.
 *  - A rung whose karaoke video isn't marked on the section opens it in the practice room with her
 *    loop buttons; once a grown-up has tapped the section starts on it, the rung plays it from there.
 */
import { describe, expect, it } from 'vitest'
import { STEP_COPY, stepCopyFor } from '../../src/content/ladders'
import { DEFAULT_REFS } from '../../src/content/references'
import { LADDERS, stepBefore, stepById } from '../../src/model/ladders'
import { nextStep, tickStep } from '../../src/model/progress'
import { addYouTubeVideo, canRemove, removeVideo, renameVideo, swapVideo } from '../../src/model/refs'
import { roomSources, videoName } from '../../src/model/room'
import { rapMode, stepRoom, stepRoute, stepSource, stepVideo } from '../../src/model/videos'
import { VIDEO_NAME_MAX, defaultSave, emptyProgress, type SaveData, type Section } from '../../src/storage/schema'

const D = '2031-03-07'

function sectionOn(marked: Record<string, { start: number | null; end: number | null }>, lines = 2): Section {
  return {
    id: 's1',
    name: 'Verse 1',
    lines: Array.from({ length: lines }, (_, i) => ({ id: `l${i}`, lyric: `Line ${i + 1} of Verse 1`, lang: 'en' as const, meaning: '', breaths: [], time: 10 + i * 2 })),
    track: { start: 10, end: 20 },
    refs: marked,
    createdAt: '2031-01-01T00:00:00.000Z',
  }
}

const everywhere = (d: SaveData) => Object.fromEntries(d.refs.map((r) => [r.id, { start: 30, end: 41 }]))
const rap = (id: string) => stepById(id)!

describe('the two karaoke videos', () => {
  it('are defaults under their own names, playing in time with the music', () => {
    const guide = DEFAULT_REFS.find((r) => r.role === 'voiceGuide')!
    const karaoke = DEFAULT_REFS.find((r) => r.role === 'karaoke')!
    expect(guide).toMatchObject({ id: 'ref-voiceGuide', kind: 'youtube', youtubeId: '81BPeeksFqo', label: 'Voice guide (light)', synced: true, alreadyMirrored: false })
    expect(karaoke).toMatchObject({ id: 'ref-karaoke', kind: 'youtube', youtubeId: 'd_-jC3519xI', label: 'Karaoke (no voice)', synced: true, alreadyMirrored: false })
  })

  it('leave the seven earlier default videos as they were, first in the list', () => {
    expect(DEFAULT_REFS.slice(0, 7).map((r) => [r.role, r.youtubeId])).toEqual([
      ['listen', '6DBtz2enWSA'],
      ['original', 'JSFG-IE8n_c'],
      ['performance', 'XD00TJ-6WSw'],
      ['mirrored', 'PBhzOdOIFEY'],
      ['tutorialFull', 'vVWmbpHj4Eg'],
      ['tutorialParts', 'FIl3O1uBjQQ'],
      ['slow', 'UI4-leflJ00'],
    ])
  })
})

describe('every video appears in the practice room by its name', () => {
  it('the karaoke videos by theirs, after the listen-and-read video; the earlier ones as before', () => {
    const list = roomSources(defaultSave())
    expect(list.map((s) => videoName(s))).toEqual([
      'Mirrored follow-along',
      'Tutorial with counts',
      'Tutorial',
      'Performance',
      'Original',
      'Listen and read',
      'Voice guide (light)',
      'Karaoke (no voice)',
      'Slow music',
    ])
  })

  it('a video a grown-up adds, by the name they chose, after the defaults', () => {
    const d = defaultSave()
    const added = addYouTubeVideo(d, '  Slow karaoke  ', '12345678901', 'ref-added-1')
    expect(added).toMatchObject({ id: 'ref-added-1', role: 'added', kind: 'youtube', youtubeId: '12345678901', label: 'Slow karaoke', synced: true })
    expect(d.refs.at(-1)).toEqual(added)
    const list = roomSources(d)
    expect(list.at(-1)!.id).toBe('ref-added-1')
    expect(videoName(list.at(-1)!)).toBe('Slow karaoke')
  })

  it('a name is kept short, and an empty one becomes the video’s link id rather than nothing', () => {
    const d = defaultSave()
    const long = addYouTubeVideo(d, 'A very long name for a video that goes on and on and on and on', '12345678901', 'ref-added-1')
    expect(long.label.length).toBeLessThanOrEqual(VIDEO_NAME_MAX)
    const blank = addYouTubeVideo(d, '   ', 'abcdefghijk', 'ref-added-2')
    expect(blank.label.trim().length).toBeGreaterThan(0)
  })

  it('a rename shows straight away in the room, for an added video or a default one; an empty rename keeps the name', () => {
    const d = defaultSave()
    addYouTubeVideo(d, 'Slow karaoke', '12345678901', 'ref-added-1')
    renameVideo(d, 'ref-added-1', 'Karaoke at half speed')
    renameVideo(d, 'ref-karaoke', 'Karaoke')
    renameVideo(d, 'ref-tutorialFull', 'Whole dance tutorial')
    renameVideo(d, 'ref-mirrored', '   ')
    const names = Object.fromEntries(roomSources(d).map((s) => [s.id, videoName(s)]))
    expect(names['ref-added-1']).toBe('Karaoke at half speed')
    expect(names['ref-karaoke']).toBe('Karaoke')
    expect(names['ref-tutorialFull']).toBe('Whole dance tutorial')
    expect(names['ref-mirrored']).toBe('Mirrored follow-along')
  })

  it('a swap plays the new video and clears its marks (its timing is different); the same video again changes nothing', () => {
    const d = defaultSave()
    addYouTubeVideo(d, 'Slow karaoke', '12345678901', 'ref-added-1')
    d.sections = [sectionOn(everywhere(d))]
    expect(swapVideo(d, 'ref-added-1', '12345678901')).toBe(false)
    expect(d.sections[0].refs['ref-added-1']).toBeDefined()
    expect(swapVideo(d, 'ref-added-1', 'zyxwvutsrqp')).toBe(true)
    expect(d.refs.find((r) => r.id === 'ref-added-1')!.youtubeId).toBe('zyxwvutsrqp')
    expect(d.sections[0].refs['ref-added-1']).toBeUndefined()
    expect(d.sections[0].refs['ref-karaoke']).toBeDefined()
  })

  it('a grown-up can remove a video they added, or either karaoke video; the earlier seven stay', () => {
    const d = defaultSave()
    addYouTubeVideo(d, 'Slow karaoke', '12345678901', 'ref-added-1')
    d.sections = [sectionOn(everywhere(d))]
    for (const r of d.refs) expect(canRemove(r), r.id).toBe(['ref-added-1', 'ref-voiceGuide', 'ref-karaoke'].includes(r.id))
    expect(removeVideo(d, 'ref-listen')).toBe(false)
    expect(removeVideo(d, 'ref-added-1')).toBe(true)
    expect(removeVideo(d, 'ref-karaoke')).toBe(true)
    expect(d.refs.map((r) => r.id)).not.toContain('ref-added-1')
    expect(d.refs.map((r) => r.id)).not.toContain('ref-karaoke')
    expect(roomSources(d).map((s) => s.id)).not.toContain('ref-added-1')
    expect(Object.keys(d.sections[0].refs)).not.toContain('ref-karaoke')
    expect(Object.keys(d.sections[0].refs)).toContain('ref-listen')
  })
})

describe('with no guide file, the rap ladder fades the voice', () => {
  it('is the video ladder until a guide is ready', () => {
    expect(rapMode(defaultSave())).toBe('videos')
  })

  it('listen-and-read video, Voice guide, Karaoke, then her track from memory (lines typed or not)', () => {
    const d = defaultSave()
    for (const lines of [2, 0]) {
      const s = sectionOn(everywhere(d), lines)
      expect(LADDERS.rap.map((st) => stepSource(st, s, d)), `${lines} lines`).toEqual(['listen', 'voiceGuide', 'karaoke', 'track', 'track'])
    }
  })

  it('each rung plays its own video, cued to the section where it is marked', () => {
    const d = defaultSave()
    const s = sectionOn(everywhere(d))
    expect(stepVideo(d, s, 'voiceGuide')).toMatchObject({ ref: { id: 'ref-voiceGuide' }, span: { start: 30, end: 41 } })
    expect(stepVideo(d, s, 'karaoke')).toMatchObject({ ref: { id: 'ref-karaoke' }, span: { start: 30, end: 41 } })
  })

  it('leaves the dance and together ladders as they were', () => {
    const d = defaultSave()
    const s = sectionOn(everywhere(d))
    for (const l of ['dance', 'together'] as const) expect(LADDERS[l].map((st) => stepSource(st, s, d))).toEqual(LADDERS[l].map((st) => st.source))
  })

  it('falls back to her track when a grown-up removed a karaoke video (the 1.3 ladder for that rung)', () => {
    const d = defaultSave()
    removeVideo(d, 'ref-voiceGuide')
    removeVideo(d, 'ref-karaoke')
    expect(LADDERS.rap.map((st) => stepSource(st, sectionOn(everywhere(d)), d))).toEqual(['listen', 'track', 'track', 'track', 'track'])
    // A part with no lines: the listen-and-read video where the words would light up (as in 1.3).
    expect(LADDERS.rap.map((st) => stepSource(st, sectionOn(everywhere(d), 0), d))).toEqual(['listen', 'listen', 'track', 'track', 'track'])
  })

  it('names each rung for what it plays', () => {
    expect(stepCopyFor(rap('rap-say'), 'voiceGuide').name).toBe('Say it with Voice guide')
    expect(stepCopyFor(rap('rap-fade'), 'karaoke').name).toBe('Say it with Karaoke')
    expect(stepCopyFor(rap('rap-listen'), 'listen')).toEqual(STEP_COPY['rap-listen'])
    expect(stepCopyFor(rap('rap-memory-75'), 'track')).toEqual(STEP_COPY['rap-memory-75'])
    expect(stepCopyFor(rap('rap-say'), 'track')).toEqual(STEP_COPY['rap-say'])
    for (const id of ['rap-say', 'rap-fade']) for (const src of ['voiceGuide', 'karaoke'] as const) expect(stepCopyFor(rap(id), src).how.length).toBeGreaterThan(10)
  })
})

describe('a karaoke video that isn’t marked on the section opens in the practice room', () => {
  it('opens the rung in the room on that video, with the section and the rung', () => {
    const d = defaultSave()
    const s = sectionOn({})
    d.sections = [s]
    expect(stepRoom(d, s, rap('rap-say'))).toBe('ref-voiceGuide')
    expect(stepRoom(d, s, rap('rap-fade'))).toBe('ref-karaoke')
    expect(stepRoute(d, 's1', 'rap-say')).toBe('/room?section=s1&step=rap-say&source=ref-voiceGuide')
    expect(stepRoute(d, 's1', 'rap-fade')).toBe('/room?section=s1&step=rap-fade&source=ref-karaoke')
  })

  it('every other rung stays on the practice screen (the listen-and-read video plays from its start, as in 1.3)', () => {
    const d = defaultSave()
    const s = sectionOn({})
    d.sections = [s]
    for (const id of ['rap-listen', 'rap-memory-75', 'rap-memory-100', 'dance-watch', 'dance-follow-50', 'together-mark-75']) {
      expect(stepRoom(d, s, rap(id)), id).toBeNull()
      expect(stepRoute(d, 's1', id)).toBe(`/practice/s1/${id}`)
    }
  })

  it('once a grown-up has tapped where the section starts on it, the rung plays it from there', () => {
    const d = defaultSave()
    const s = sectionOn({ 'ref-voiceGuide': { start: 30, end: 41 }, 'ref-karaoke': { start: 28, end: null } })
    d.sections = [s]
    expect(stepRoom(d, s, rap('rap-say'))).toBeNull()
    expect(stepRoom(d, s, rap('rap-fade'))).toBeNull()
    expect(stepRoute(d, 's1', 'rap-say')).toBe('/practice/s1/rap-say')
    expect(stepVideo(d, s, 'karaoke')).toMatchObject({ ref: { id: 'ref-karaoke' }, from: 28 })
  })

  it('keeps the session going through the room', () => {
    const d = defaultSave()
    d.sections = [sectionOn({})]
    expect(stepRoute(d, 's1', 'rap-say', 'session=1')).toBe('/room?section=s1&step=rap-say&source=ref-voiceGuide&session=1')
    expect(stepRoute(d, 's1', 'rap-listen', 'session=1')).toBe('/practice/s1/rap-listen?session=1')
  })
})

describe('going back a step', () => {
  it('is always there on the rap ladder after its first rung', () => {
    expect(LADDERS.rap.map((s) => stepBefore(s.id)?.id ?? null)).toEqual([null, 'rap-listen', 'rap-say', 'rap-fade', 'rap-memory-75'])
    expect(stepBefore('nope')).toBeNull()
  })

  it('never counts against her: nothing she ticked is unticked, and where she is up to stays put', () => {
    let p = emptyProgress()
    for (const id of ['rap-listen', 'rap-say', 'rap-fade']) p = tickStep(p, 'rap', id, D)
    const before = JSON.parse(JSON.stringify(p))
    // Back to Voice guide and "I did it" there again.
    const again = tickStep(p, 'rap', 'rap-say', D)
    expect(again.rap.done).toEqual(before.rap.done)
    expect(nextStep(again, 'rap')?.id).toBe('rap-memory-75')
    expect(again.shaky).toBe(false)
  })
})
