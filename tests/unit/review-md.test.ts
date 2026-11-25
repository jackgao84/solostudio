/**
 * REVIEW.md: every line of kid-facing text in one place, for a grown-up to read through.
 *
 * It is built here from src/content (kidStrings()), so it can't drift: this test fails while the
 * committed REVIEW.md differs from what the content gives, and `npm run review` (UPDATE_REVIEW=1)
 * writes it instead. Lines she types or a grown-up types (names, rap lines) are hers, not listed.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { KID_GROUPS, kidStrings } from '../../src/content'

const REVIEW_PATH = join(__dirname, '..', '..', 'REVIEW.md')

/** Markdown-significant characters, escaped so a line shows exactly as written. */
function md(text: string): string {
  return text.replace(/([\\`*_<[\]])/g, '\\$1')
}

function build(): string {
  const all = kidStrings()
  const out: string[] = []
  out.push('# Solo Studio: every line she sees')
  out.push('')
  out.push(
    'Every piece of kid-facing text in the app, grouped by where it appears. Words in {curly brackets} are filled in on the iPad (her name, a section name, a number). The rap lines themselves are typed on the iPad by a grown-up and are never part of the app.',
  )
  out.push('')
  out.push(`- ${all.length} lines in ${KID_GROUPS.length} groups`)
  out.push('')
  out.push('**This file is generated from `src/content`. Don’t edit it by hand.** To change the words, edit the files in `src/content`, then run `npm run review` to rebuild this file. `npm test` fails while it is out of date.')
  out.push('')
  KID_GROUPS.forEach((g, i) => {
    const lines = all.filter((s) => s.group === g.id)
    out.push(`## ${i + 1}. ${g.title} (${lines.length})`)
    out.push('')
    out.push(g.about)
    out.push('')
    let sub = ''
    for (const s of lines) {
      if (s.sub !== sub) {
        sub = s.sub
        if (sub) {
          out.push('')
          out.push(`### ${md(sub)}`)
          out.push('')
        }
      }
      out.push(`- ${md(s.text)} <sub>\`${s.where}\`</sub>`)
    }
    out.push('')
  })
  return out.join('\n').replace(/\n{3,}/g, '\n\n')
}

describe('REVIEW.md', () => {
  it('places every line in a group', () => {
    const ids = new Set(KID_GROUPS.map((g) => g.id))
    const orphans = kidStrings().filter((s) => !ids.has(s.group))
    expect(orphans.map((s) => s.where)).toEqual([])
    expect(new Set(kidStrings().map((s) => s.where)).size).toBe(kidStrings().length)
  })

  it('is up to date with src/content', () => {
    const expected = build()
    if (process.env.UPDATE_REVIEW) writeFileSync(REVIEW_PATH, expected)
    expect(existsSync(REVIEW_PATH), 'REVIEW.md exists (run npm run review)').toBe(true)
    expect(readFileSync(REVIEW_PATH, 'utf8')).toBe(expected)
  })

  it('lists every lesson in full', () => {
    const text = build()
    for (const s of kidStrings().filter((x) => x.group === 'lessons')) expect(text).toContain(md(s.text))
  })
})
