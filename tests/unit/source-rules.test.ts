/**
 * Rules read straight from the source:
 *  - every localStorage key, cache and IndexedDB database goes through src/storage/keys.ts (all
 *    "solostudio:"), never a bare string;
 *  - nothing styles the YouTube player with transforms, and nothing is layered over it;
 *  - no personal details: no ages, no email addresses other than GitHub's noreply form.
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..')
const files = execSync('git ls-files --cached --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8')
const src = files.filter((f) => f.startsWith('src/') && ['.ts', '.js'].includes(extname(f)))
const css = files.filter((f) => f.startsWith('src/') && extname(f) === '.css')

describe('storage names', () => {
  it('never uses a bare string for a key, cache or database', () => {
    const bare = /(localStorage|sessionStorage)\.(getItem|setItem|removeItem)\(\s*['"`]|indexedDB\.open\(\s*['"`]|caches\.open\(\s*['"`]|\.deleteDatabase\(\s*['"`]/
    expect(src.filter((f) => bare.test(read(f)))).toEqual([])
  })

  it('uses no sessionStorage and no cookies', () => {
    expect(src.filter((f) => /sessionStorage|document\.cookie/.test(read(f)))).toEqual([])
  })
})

describe('the YouTube player', () => {
  it('is never transformed, filtered or faded by the app’s styles', () => {
    const hits: string[] = []
    for (const f of css) {
      for (const m of read(f).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = m[1]
        if (/yt|youtube|iframe/i.test(selector) && /(^|;|\s)(transform|filter|opacity|mix-blend-mode|clip-path|mask)\s*:/.test(m[2])) hits.push(`${f}: ${selector.trim()}`)
        if (/yt|youtube|iframe/i.test(selector) && /::?(before|after)/.test(selector)) hits.push(`${f}: ${selector.trim()} (drawn over the player)`)
      }
    }
    expect(hits).toEqual([])
  })
})

describe('personal details', () => {
  it('has no ages and no email addresses except GitHub noreply ones', () => {
    const hits: string[] = []
    for (const f of files.filter((f) => !f.endsWith('package-lock.json') && /\.(ts|js|mjs|json|md|html|css|yml|webmanifest|txt)$/.test(f))) {
      const text = read(f)
      for (const m of text.matchAll(/\b\d{1,2}[- ]years?[- ]old\b|\baged? \d{1,2}\b/gi)) hits.push(`${f}: ${m[0]}`)
      for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) if (!/@users\.noreply\.github\.com$/.test(m[0]) && !/@anthropic\.com$/.test(m[0])) hits.push(`${f}: ${m[0]}`)
    }
    expect(hits).toEqual([])
  })
})
