/**
 * Kid-facing words: kind, short, never grading her, and all in one place (src/content), so REVIEW.md
 * can list every line she sees. The lessons are one-to-two-minute reads that each put her own
 * teachers first.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { kidStrings } from '../../src/content'
import { LESSONS, LESSON_IDS, TEACHERS_FIRST } from '../../src/content/lessons'

const ROOT = join(__dirname, '..', '..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const words = (s: string) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w))
const sentences = (s: string) => s.split(/(?<=[.!?])\s+/).filter((x) => words(x).length > 0)

describe('every line she sees', () => {
  const all = kidStrings()

  it('is gathered from src/content', () => {
    expect(all.length).toBeGreaterThan(150)
    for (const s of all) expect(typeof s.text).toBe('string')
  })

  it('never grades her: no streaks, points, stars, scores or percentages', () => {
    const grading = /\b(streaks?|points?|scores?|stars?|grades?|graded|percent(age)?s?|accuracy|accurate|correct(ly)?|wrong|fail(s|ed|ure)?|perfect(ly)?|level ?up|rank(ed|ing)?|best ever|beat your)\b/i
    const hits = all.filter((s) => grading.test(s.text) || /%(?! speed)/.test(s.text))
    expect(hits.map((s) => `${s.where}: ${s.text}`)).toEqual([])
  })

  it('speaks to her in short sentences', () => {
    const long = all.flatMap((s) => sentences(s.text).filter((x) => words(x).length > 26).map((x) => `${s.where}: ${x}`))
    expect(long).toEqual([])
  })
})

describe('lessons', () => {
  it('are the eight skill lessons, in order', () => {
    expect(LESSON_IDS).toEqual(['counting', 'learning-a-dance', 'voice-warm-up', 'rap-basics', 'breathing', 'marking', 'expressions', 'performing'])
    expect(LESSONS.map((l) => l.id)).toEqual(LESSON_IDS)
  })

  it('take a minute or two to read', () => {
    for (const l of LESSONS) {
      const n = words([...l.paragraphs, l.tryIt].join(' ')).length
      expect(n, l.id).toBeGreaterThanOrEqual(110)
      expect(n, l.id).toBeLessThanOrEqual(330)
      expect([1, 2]).toContain(l.minutes)
    }
  })

  it('are written for a young reader', () => {
    for (const l of LESSONS) {
      const ss = sentences([...l.paragraphs, l.tryIt].join(' '))
      const avg = ss.reduce((a, s) => a + words(s).length, 0) / ss.length
      expect(avg, l.id).toBeLessThanOrEqual(14)
    }
  })

  it('each says her own teachers come first', () => {
    expect(TEACHERS_FIRST).toMatch(/teachers/i)
    expect(TEACHERS_FIRST).toMatch(/first/i)
    for (const l of LESSONS) expect(l.teachersFirst, l.id).toBe(TEACHERS_FIRST)
  })

  it('cover what the brief asks for', () => {
    const text = (id: string) => {
      const l = LESSONS.find((x) => x.id === id)!
      return [l.title, ...l.paragraphs, l.tryIt].join(' ')
    }
    const need: Record<string, RegExp[]> = {
      counting: [/8 counts?|eight counts?|8-count/i, /rhythm|beat/i],
      'learning-a-dance': [/mirror/i, /slow/i, /chunk/i, /chain/i, /short/i, /test yourself/i, /sleep/i],
      'voice-warm-up': [/consonant/i, /water/i, /shout/i, /\brest\b/i, /hoarse/i],
      breathing: [/breath|breathe/i, /stamina/i],
      marking: [/\bmark/i, /energy/i, /headset|mic/i, /full out/i],
      expressions: [/face|expression/i],
      performing: [/\beyes?\b|eye line/i, /face|expression/i, /keep going/i],
    }
    for (const [id, res] of Object.entries(need)) for (const re of res) expect(text(id), `${id} ${re}`).toMatch(re)
  })

  it('link to Face Lab for expressions and to Up Anyway for brave things', () => {
    expect(LESSONS.find((l) => l.id === 'expressions')!.links).toEqual(expect.arrayContaining(['faceLab']))
    expect(LESSONS.find((l) => l.id === 'performing')!.links).toEqual(expect.arrayContaining(['upAnyway']))
  })
})

describe('kid screens keep their words in src/content', () => {
  it('have no sentences or labels written inline', () => {
    const files = [...walk(join(ROOT, 'src/screens/kid')), ...walk(join(ROOT, 'src/ui'))].filter((f) => f.endsWith('.ts'))
    expect(files.length).toBeGreaterThan(3)
    const hits: string[] = []
    for (const f of files) {
      const code = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
      const literals = [...code.matchAll(/'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`/g)].map((m) => (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' '))
      for (const lit of literals) if (/(^|\s)[A-Z][a-z]{2,}/.test(lit) || /[a-z]{2,} [a-z]{2,}.*[.!?]\s*$/.test(lit)) hits.push(`${relative(ROOT, f)}: ${lit}`)
    }
    expect(hits).toEqual([])
  })
})
