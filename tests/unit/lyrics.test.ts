/**
 * No lyrics anywhere in the repo. A grown-up types the lines on the iPad and they stay there. This
 * check reads every file in the repo (tracked or new, not ignored) and the commit messages:
 *  - no Korean script anywhere (Korean lines are typed on the iPad, never stored here);
 *  - the app ships no lines: every lyric and meaning string literal in src/ is empty, and a fresh
 *    save has no sections;
 *  - every line in tests, e2e checks and fixtures is a placeholder such as "Line 3 of Verse 1";
 *  - the app never fetches anything: no fetch/XHR/beacons/sockets outside the service worker (except,
 *    since 1.2, src/audio/narration.ts loading the app's own recorded clips from its own voice/
 *    folder), and the only web addresses in the app are YouTube's player, the YouTube watch link and
 *    the family apps.
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultSave } from '../../src/storage/schema'
import { isPlaceholder } from '../fixtures/placeholders'

const ROOT = join(__dirname, '..', '..')
const TEXT = new Set(['.ts', '.js', '.mjs', '.json', '.md', '.html', '.css', '.webmanifest', '.yml', '.yaml', '.txt', '.svg'])

function repoFiles(): string[] {
  const out = execSync('git ls-files --cached --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' })
  return out
    .split('\n')
    .filter(Boolean)
    .filter((f) => TEXT.has(extname(f)) && f !== 'package-lock.json')
}

const read = (f: string) => readFileSync(join(ROOT, f), 'utf8')
const HANGUL = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF]/

/** A lyric or meaning property whose value is a plain string literal. */
const LINE_FIELD = /\b(lyric|meaning)\s*:\s*(['"`])((?:\\.|(?!\2)[^\\])*)\2/g
/** The text argument of the e2e helpers that type a rap line or a meaning line. */
const TYPED = /\btype(?:Lyric|Meaning)\(\s*[^,]+,\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g

describe('no lyrics in the repo', () => {
  const files = repoFiles()

  it('reads the repo', () => {
    expect(files).toContain('src/storage/schema.ts')
    expect(files).toContain('tests/unit/lyrics.test.ts')
  })

  it('has no Korean script in any file', () => {
    const hits = files.filter((f) => HANGUL.test(read(f)))
    expect(hits).toEqual([])
  })

  it('has no Korean script in any commit message', () => {
    let log = ''
    try {
      log = execSync('git log --format=%B', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    } catch {
      log = '' // no commits yet
    }
    expect(HANGUL.test(log)).toBe(false)
  })

  it('ships no lines: every lyric and meaning string in the app is empty, and a fresh save has no sections', () => {
    const hits: string[] = []
    for (const f of files.filter((f) => f.startsWith('src/'))) {
      for (const m of read(f).matchAll(LINE_FIELD)) if (m[3] !== '') hits.push(`${f}: ${m[0]}`)
    }
    expect(hits).toEqual([])
    expect(defaultSave().sections).toEqual([])
  })

  it('uses only placeholders such as "Line 3 of Verse 1" in tests, e2e checks and fixtures', () => {
    const hits: string[] = []
    for (const f of files.filter((f) => /^(tests|e2e)\//.test(f))) {
      const text = read(f)
      if (f.endsWith('.json')) {
        const walk = (v: unknown, key = ''): void => {
          if (Array.isArray(v)) v.forEach((x) => walk(x, key))
          else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k)
          else if ((key === 'lyric' || key === 'meaning') && typeof v === 'string' && !isPlaceholder(v)) hits.push(`${f}: ${key}=${v}`)
        }
        walk(JSON.parse(text))
        continue
      }
      for (const m of text.matchAll(LINE_FIELD)) if (!isPlaceholder(m[3])) hits.push(`${f}: ${m[0]}`)
      for (const m of text.matchAll(TYPED)) if (!isPlaceholder(m[2])) hits.push(`${f}: ${m[0]}`)
    }
    expect(hits).toEqual([])
  })

  it('never fetches lyrics or anything else: no network calls in the app outside the service worker', () => {
    const hits: string[] = []
    const NET = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|new\s+EventSource/
    for (const f of files.filter((f) => f.startsWith('src/') && f !== 'src/sw/sw-template.js')) {
      if (f === 'src/audio/narration.ts') {
        // The one exception (1.2): the coach's clips, from the app's own voice/ folder (precached).
        const text = read(f)
        const calls = text.match(/\bfetch\s*\(/g) ?? []
        const ownClip = /\bfetch\s*\(\s*url\(\s*clip\.file\s*\)\s*\)/.test(text)
        const own = /`\$\{import\.meta\.env\.BASE_URL\}voice\/\$\{file\}`/.test(text)
        if (calls.length !== 1 || !ownClip || !own || /XMLHttpRequest|sendBeacon|new\s+WebSocket|new\s+EventSource/.test(text)) hits.push(f)
        continue
      }
      if (NET.test(read(f))) hits.push(f)
    }
    expect(hits).toEqual([])
  })

  it('links only to YouTube’s player and watch pages and the family apps', () => {
    const allowed = new Set(['www.youtube.com', 'www.youtube-nocookie.com', 'jackgao84.github.io', 'www.w3.org'])
    const hits: string[] = []
    for (const f of files.filter((f) => f.startsWith('src/') || f.startsWith('public/') || f === 'index.html')) {
      for (const m of read(f).matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) if (!allowed.has(m[1].toLowerCase())) hits.push(`${f}: ${m[0]}`)
    }
    expect(hits).toEqual([])
  })
})
