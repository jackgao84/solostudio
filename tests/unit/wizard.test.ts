/**
 * Much lighter setup (version 1.2): a wizard that can be paused and resumed. The app is usable once
 * the first three steps are done (her track, her lines, where each section starts); the rest are
 * optional. No other step is ever required.
 *  - Lines: every line pasted into one box, each section headed by its name in square brackets
 *    (picked from the standard list, or a custom name), with an optional meaning line ("= …") under
 *    any line. Saving it keeps everything already learned for sections with the same name.
 *  - Section starts: one play of her track, a tap as each section starts; each section ends where
 *    the next begins (the last at the end of her track), with nudges afterwards.
 *  - Line timing: each section's lines spread evenly as a first guess.
 *  - Beat: a click to check the tempo and the first "1" against, never tapped by hand in the wizard.
 *  - While a tutorial plays, the app's 8-count is hidden (the tutorial calls its own).
 */
import { describe, expect, it } from 'vitest'
import { LADDERS } from '../../src/model/ladders'
import { clickTimes, nudgeStart, parseSongText, setupUsable, songText, applySongText, spreadLines, startsFromTaps, stepsDone } from '../../src/model/setup'
import { tickStep } from '../../src/model/progress'
import { REQUIRED_WIZARD_STEPS, defaultSave, emptyProgress } from '../../src/storage/schema'
import { lyricLine, meaningLine } from '../fixtures/placeholders'

const BOX = [
  '[Verse 1]',
  lyricLine(1, 'Verse 1'),
  lyricLine(2, 'Verse 1'),
  `= ${meaningLine(2, 'Verse 1')}`,
  '',
  '[chorus]',
  lyricLine(1, 'Chorus'),
  '[Dance break]',
  '[Sparkle part]',
  lyricLine(1, 'Sparkle part'),
].join('\n')

describe('the lines box', () => {
  it('reads sections, lines and meaning lines; standard names are tidied, custom names kept', () => {
    const r = parseSongText(BOX)
    expect(r.problems).toEqual([])
    expect(r.sections.map((s) => s.name)).toEqual(['Verse 1', 'Chorus', 'Dance break', 'Sparkle part'])
    expect(r.sections[0].lines).toEqual([
      { lyric: lyricLine(1, 'Verse 1'), meaning: '' },
      { lyric: lyricLine(2, 'Verse 1'), meaning: meaningLine(2, 'Verse 1') },
    ])
    expect(r.sections[2].lines).toEqual([])
  })

  it('says plainly what to fix: lines before the first section name, a meaning with no line above', () => {
    expect(parseSongText(`${lyricLine(1, 'Intro')}\n[Intro]`).problems).toHaveLength(1)
    expect(parseSongText(`[Intro]\n= ${meaningLine(1, 'Intro')}`).problems).toHaveLength(1)
    expect(parseSongText('').problems).toHaveLength(1)
  })

  it('round-trips: what was saved shows in the box the same way', () => {
    const d = defaultSave()
    d.sections = applySongText(d, parseSongText(BOX).sections, new Date('2031-03-03T10:00:00Z'))
    expect(parseSongText(songText(d.sections)).sections).toEqual(parseSongText(BOX).sections)
  })

  it('keeps everything she has done in a section with the same name, and its marks', () => {
    const d = defaultSave()
    d.sections = applySongText(d, parseSongText(BOX).sections, new Date('2031-03-03T10:00:00Z'))
    const v1 = d.sections[0]
    v1.track = { start: 2, end: 9 }
    v1.lines[0].breaths = [1]
    v1.lines[0].time = 2.4
    d.progress[v1.id] = tickStep(emptyProgress(), 'rap', LADDERS.rap[0].id, '2031-03-03')
    const edited = BOX.replace(lyricLine(2, 'Verse 1'), lyricLine(3, 'Verse 1'))
    const again = applySongText(d, parseSongText(edited).sections, new Date('2031-03-04T10:00:00Z'))
    expect(again[0].id).toBe(v1.id)
    expect(again[0].track).toEqual({ start: 2, end: 9 })
    expect(again[0].lines[0]).toMatchObject({ lyric: lyricLine(1, 'Verse 1'), breaths: [1], time: 2.4 })
    expect(again[0].lines[1].lyric).toBe(lyricLine(3, 'Verse 1'))
    expect(again.map((s) => s.name)).toEqual(['Verse 1', 'Chorus', 'Dance break', 'Sparkle part'])
  })

  it('marks a line with a meaning under it as Korean said by sound', () => {
    const d = defaultSave()
    const s = applySongText(d, parseSongText(BOX).sections, new Date('2031-03-03T10:00:00Z'))
    expect(s[0].lines.map((l) => l.lang)).toEqual(['en', 'ko'])
  })
})

describe('where each section starts', () => {
  it('ends each section where the next begins, and the last at the end of her track', () => {
    expect(startsFromTaps([1.2, 9.6, 20.1], 31.5)).toEqual([
      { start: 1.2, end: 9.6 },
      { start: 9.6, end: 20.1 },
      { start: 20.1, end: 31.5 },
    ])
  })

  it('nudges a start and the end before it together, never past a neighbour', () => {
    const marks = startsFromTaps([1.2, 9.6, 20.1], 31.5)
    const moved = nudgeStart(marks, 1, 0.5, 31.5)
    expect(moved[1].start).toBeCloseTo(10.1, 5)
    expect(moved[0].end).toBeCloseTo(10.1, 5)
    const squeezed = nudgeStart(marks, 1, 30, 31.5)
    expect(squeezed[1].start!).toBeLessThan(squeezed[2].start!)
    expect(nudgeStart(marks, 0, -5, 31.5)[0].start).toBe(0)
  })

  it('spreads a section’s lines evenly as a first guess', () => {
    expect(spreadLines(4, { start: 10, end: 18 })).toEqual([10, 12, 14, 16])
    expect(spreadLines(0, { start: 10, end: 18 })).toEqual([])
  })
})

describe('the wizard', () => {
  it('needs only her track, her lines and the section starts', () => {
    expect(REQUIRED_WIZARD_STEPS).toEqual(['track', 'lines', 'starts'])
    const d = defaultSave()
    expect(setupUsable(d)).toBe(false)
    d.track.mediaId = 'media-track'
    d.sections = applySongText(d, parseSongText(BOX).sections, new Date('2031-03-03T10:00:00Z'))
    expect(setupUsable(d)).toBe(false)
    const marks = startsFromTaps([1, 5, 9, 13], 20)
    d.sections.forEach((s, i) => (s.track = marks[i]))
    expect(setupUsable(d)).toBe(true)
    expect(d.show).toBeNull()
    expect(d.tempo.bpm).toBeNull()
    expect(stepsDone(d)).toEqual(expect.arrayContaining(['track', 'lines', 'starts']))
  })

  it('counts an optional step done only when a grown-up did it', () => {
    const d = defaultSave()
    d.tempo = { bpm: 120, offset: 0.5 }
    expect(stepsDone(d)).not.toContain('beat')
    d.wizard.done = ['beat']
    expect(stepsDone(d)).toContain('beat')
  })

  it('plays a click on every beat from the first "1", louder on each 1', () => {
    const c = clickTimes({ bpm: 120, offset: 0.25 }, 0, 2.3)
    expect(c.map((x) => x.at)).toEqual([0.25, 0.75, 1.25, 1.75, 2.25])
    expect(c.map((x) => x.one)).toEqual([true, false, false, false, true])
    expect(clickTimes({ bpm: 120, offset: 4.25 }, 3, 4.4).map((x) => x.at)).toEqual([3.25, 3.75, 4.25])
  })

  it('hides the app’s 8-count while a tutorial plays', () => {
    for (const s of LADDERS.dance.filter((s) => s.source === 'tutorial')) expect(s.counts, s.id).toBe(false)
  })
})
