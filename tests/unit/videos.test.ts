/**
 * No step is ever blocked by missing video marks (version 1.2, from the owner's iPad test of 1.1).
 *  - Tutorials and the listen-and-read video need no marking: they play from the start, or from a
 *    chapter time a grown-up added (a start on its own), with the speed control and her own loop.
 *  - The mirrored follow-along is the only video marked per section (by the optional tapping in
 *    setup); until then it plays from the start.
 *  - Where marks exist, they simply cue the video to that section (and, for a video in time with the
 *    music, let the lines and counts follow it).
 *  - Her own loop: tap where it starts and where it ends while it plays.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_REFS } from '../../src/content/references'
import { loopBetween, stepVideo } from '../../src/model/videos'
import { defaultSave, type Section } from '../../src/storage/schema'

function section(name: string, refs: Section['refs'] = {}): Section {
  return { id: 's1', name, lines: [], track: { start: 10, end: 18 }, refs, createdAt: '2031-01-01T00:00:00.000Z' }
}

describe('the video a step plays', () => {
  const d = defaultSave()

  it('is always there, with no marks at all: from the start', () => {
    for (const source of ['listen', 'tutorial', 'mirrored'] as const) {
      const v = stepVideo(d, section('Verse 1'), source)
      expect(v, source).not.toBeNull()
      expect(v!.from, source).toBe(0)
      expect(v!.span, source).toBeNull()
    }
    expect(stepVideo(d, section('Verse 1'), 'listen')!.ref.role).toBe('listen')
    expect(stepVideo(d, section('Verse 1'), 'mirrored')!.ref.role).toBe('mirrored')
  })

  it('picks the tutorial that covers the part: the one with counts for the chorus and the dance break', () => {
    expect(stepVideo(d, section('Chorus'), 'tutorial')!.ref.role).toBe('tutorialParts')
    expect(stepVideo(d, section('Dance break'), 'tutorial')!.ref.role).toBe('tutorialParts')
    expect(stepVideo(d, section('Verse 2'), 'tutorial')!.ref.role).toBe('tutorialFull')
    expect(stepVideo(d, section('Pre-chorus'), 'tutorial')!.ref.role).toBe('tutorialFull')
  })

  it('starts at a chapter time a grown-up added', () => {
    const v = stepVideo(d, section('Verse 1', { 'ref-tutorialFull': { start: 95, end: null } }), 'tutorial')!
    expect(v.from).toBe(95)
    expect(v.span).toBeNull()
  })

  it('where marks exist, cues the video to the section', () => {
    const v = stepVideo(d, section('Chorus', { 'ref-mirrored': { start: 41, end: 49 } }), 'mirrored')!
    expect(v.span).toEqual({ start: 41, end: 49 })
    expect(v.from).toBeLessThan(41)
  })

  it('prefers a video marked on this section, a teacher’s mirrored demo included', () => {
    const save = defaultSave()
    save.refs = [...DEFAULT_REFS.map((r) => ({ ...r })), { id: 'ref-local-1', role: 'local', label: 'Teacher demo', kind: 'local', youtubeId: '', mediaId: 'media-video-1', fileName: 'demo.mov', synced: true, alreadyMirrored: false, mirror: true }]
    expect(stepVideo(save, section('Dance break', { 'ref-local-1': { start: 1, end: 6 } }), 'mirrored')!.ref.id).toBe('ref-local-1')
    expect(stepVideo(save, section('Dance break'), 'mirrored')!.ref.id).toBe('ref-mirrored')
  })

  it('is null only when the grown-up has removed every video of that kind', () => {
    const save = defaultSave()
    save.refs = save.refs.filter((r) => r.role !== 'mirrored')
    expect(stepVideo(save, section('Verse 1'), 'mirrored')).toBeNull()
  })
})

describe('her own loop', () => {
  it('goes round the bit between her two taps, whichever order, at least a second long', () => {
    expect(loopBetween(12.4, 18.9)).toEqual({ from: 12.4, to: 18.9 })
    expect(loopBetween(18.9, 12.4)).toEqual({ from: 12.4, to: 18.9 })
    expect(loopBetween(12.4, 12.8)).toEqual({ from: 12.4, to: 13.4 })
  })
})
