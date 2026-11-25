/**
 * The three ladders each section has (she ticks every rung herself with "I did it" or "Again"), and
 * which reference video each rung plays.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_REFS } from '../../src/content/references'
import { LADDERS, LADDER_IDS, pickReference, stepById } from '../../src/model/ladders'
import type { Reference, Section } from '../../src/storage/schema'

const shape = (ladder: keyof typeof LADDERS) =>
  LADDERS[ladder].map((s) => ({ source: s.source, speed: s.speed, words: s.words, video: s.video, energy: s.energy, link: s.link }))

describe('the rap ladder', () => {
  it('listen and read at 75%, say it with the words at 75%, words fade, from memory at 75%, then at 100%', () => {
    expect(shape('rap')).toEqual([
      { source: 'listen', speed: 0.75, words: 'show', video: true, energy: 'none', link: false },
      { source: 'track', speed: 0.75, words: 'show', video: false, energy: 'none', link: false },
      { source: 'track', speed: 0.75, words: 'fade', video: false, energy: 'none', link: false },
      { source: 'track', speed: 0.75, words: 'hidden', video: false, energy: 'none', link: false },
      { source: 'track', speed: 1, words: 'hidden', video: false, energy: 'none', link: false },
    ])
  })
})

describe('the dance ladder', () => {
  it('watch the tutorial part, follow the mirrored video at 50%, 75% and 100%, then from memory with her track only', () => {
    expect(shape('dance')).toEqual([
      { source: 'tutorial', speed: 1, words: 'hidden', video: true, energy: 'none', link: false },
      { source: 'mirrored', speed: 0.5, words: 'hidden', video: true, energy: 'full', link: false },
      { source: 'mirrored', speed: 0.75, words: 'hidden', video: true, energy: 'full', link: false },
      { source: 'mirrored', speed: 1, words: 'hidden', video: true, energy: 'full', link: false },
      { source: 'track', speed: 1, words: 'hidden', video: false, energy: 'full', link: false },
    ])
  })
})

describe('the together ladder', () => {
  it('mark at half energy rapping at 75%, then at 100%, then full out at 100%, then linked with the section before', () => {
    expect(shape('together')).toEqual([
      { source: 'track', speed: 0.75, words: 'optional', video: false, energy: 'half', link: false },
      { source: 'track', speed: 1, words: 'optional', video: false, energy: 'half', link: false },
      { source: 'track', speed: 1, words: 'optional', video: false, energy: 'full', link: false },
      { source: 'track', speed: 1, words: 'optional', video: false, energy: 'full', link: true },
    ])
  })
})

describe('steps', () => {
  it('have unique ids that name their ladder', () => {
    const ids = LADDER_IDS.flatMap((l) => LADDERS[l].map((s) => s.id))
    expect(new Set(ids).size).toBe(ids.length)
    for (const l of LADDER_IDS) for (const s of LADDERS[l]) {
      expect(s.ladder).toBe(l)
      expect(s.id.startsWith(`${l}-`)).toBe(true)
      expect(stepById(s.id)).toBe(s)
    }
    expect(stepById('nope')).toBeNull()
  })

  it('show the 8-count on every step that plays in time with the music', () => {
    for (const l of LADDER_IDS) for (const s of LADDERS[l]) expect(s.counts, s.id).toBe(s.source !== 'tutorial')
  })

  it('never speed anything outside 50% to 100%', () => {
    for (const l of LADDER_IDS) for (const s of LADDERS[l]) {
      expect(s.speed).toBeGreaterThanOrEqual(0.5)
      expect(s.speed).toBeLessThanOrEqual(1)
    }
  })
})

describe('which video a step plays', () => {
  const refs: Reference[] = DEFAULT_REFS.map((r) => ({ ...r }))
  const local: Reference = {
    id: 'ref-local-1',
    role: 'local',
    label: 'Teacher demo',
    kind: 'local',
    youtubeId: '',
    mediaId: 'm1',
    fileName: 'demo.mp4',
    synced: true,
    alreadyMirrored: false,
    mirror: true,
  }
  const section = (marked: string[]): Section => ({
    id: 's1',
    name: 'Verse 1',
    lines: [],
    track: { start: 10, end: 20 },
    refs: Object.fromEntries(marked.map((id) => [id, { start: 30, end: 41 }])),
    createdAt: '2031-01-01T00:00:00.000Z',
  })

  it('listen and read uses the listen video, else the original, else the slow music', () => {
    expect(pickReference(refs, section(['ref-listen', 'ref-original']), 'listen')?.id).toBe('ref-listen')
    expect(pickReference(refs, section(['ref-original', 'ref-slow']), 'listen')?.id).toBe('ref-original')
    expect(pickReference(refs, section(['ref-slow']), 'listen')?.id).toBe('ref-slow')
  })

  it('the tutorial step prefers the chorus-and-dance-break tutorial when it covers the section', () => {
    expect(pickReference(refs, section(['ref-tutorialFull', 'ref-tutorialParts']), 'tutorial')?.id).toBe('ref-tutorialParts')
    expect(pickReference(refs, section(['ref-tutorialFull']), 'tutorial')?.id).toBe('ref-tutorialFull')
  })

  it('following uses the already-mirrored video, else a local video shown mirrored', () => {
    expect(pickReference([...refs, local], section(['ref-mirrored', 'ref-local-1']), 'mirrored')?.id).toBe('ref-mirrored')
    expect(pickReference([...refs, local], section(['ref-local-1']), 'mirrored')?.id).toBe('ref-local-1')
    expect(pickReference([...refs, { ...local, mirror: false }], section(['ref-local-1']), 'mirrored')).toBeNull()
  })

  it('needs the section marked on that video', () => {
    expect(pickReference(refs, section([]), 'listen')).toBeNull()
    expect(pickReference(refs, section([]), 'tutorial')).toBeNull()
  })

  it('a video with no YouTube id is skipped', () => {
    const blank = refs.map((r) => (r.id === 'ref-listen' ? { ...r, youtubeId: '' } : r))
    expect(pickReference(blank, section(['ref-listen', 'ref-original']), 'listen')?.id).toBe('ref-original')
  })
})
