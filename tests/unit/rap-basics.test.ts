/**
 * Rap basics (version 1.2.1): a skill lesson just before her first Rap lesson, with the
 * listen-and-read video. It covers riding the beat, crisp consonants, where to breathe, energy, and
 * learning the Korean lines slowly, sound by sound, one line at a time. Read aloud by the coach in
 * the same voice, word for word, like the others.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_REFS } from '../../src/content/references'
import { LESSONS } from '../../src/content/lessons'
import { lessonPath, pathKey, SKILL_NEEDS } from '../../src/model/path'
import { defaultSave, type Section } from '../../src/storage/schema'

const lesson = () => LESSONS.find((l) => l.id === 'rap-basics')!
const text = () => [lesson().title, ...lesson().paragraphs, lesson().tryIt].join(' ')

function section(id: string, name: string, start: number): Section {
  return { id, name, lines: [], track: { start, end: start + 8 }, refs: {}, createdAt: '2031-01-01T00:00:00.000Z' }
}

describe('Rap basics', () => {
  it('is a skill lesson with the listen-and-read video, from its start', () => {
    expect(lesson()).toBeDefined()
    expect(lesson().title).toBe('Rap basics')
    expect(lesson().video).toEqual({ youtubeId: '6DBtz2enWSA', start: 0 })
    expect(DEFAULT_REFS.find((r) => r.role === 'listen')!.youtubeId).toBe('6DBtz2enWSA')
  })

  it('covers riding the beat, crisp consonants, where to breathe, energy and the Korean lines', () => {
    const t = text()
    for (const re of [/\bbeat\b/i, /\bride|riding\b/i, /consonant/i, /crisp/i, /breath|breathe/i, /energy/i, /Korean/, /sound by sound/i, /one line at a time/i, /slow/i]) expect(t, String(re)).toMatch(re)
  })

  it('sits just before her first Rap lesson', () => {
    expect(SKILL_NEEDS.rap.at(-1)).toBe('rap-basics')
    const d = defaultSave()
    d.sections = [section('a', 'Verse 1', 2), section('b', 'Chorus', 10)]
    const keys = lessonPath(d).map(pathKey)
    expect(keys.indexOf('skill:rap-basics')).toBe(keys.indexOf('section:a:rap') - 1)
    expect(keys.filter((k) => k === 'skill:rap-basics')).toHaveLength(1)
  })
})
