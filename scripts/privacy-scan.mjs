/**
 * Privacy scan: every file in the repo (tracked, or new and not ignored) and every commit's message,
 * author and committer, searched for private words. The words come from .private/terms.txt (one per
 * line, never committed) and/or PRIVACY_TERMS (comma-separated), so this script itself names nothing.
 * Also flags email addresses other than GitHub noreply ones, ages written out, anything shaped like a
 * secret API key ("sk_" and a long run of letters and digits), and the exact value of
 * ELEVENLABS_API_KEY when it is set (1.2). It reports where, never the matching text.
 * PRIVACY_ROOT points it at another folder (the unit check uses a throwaway one).
 *
 *   npm run privacy
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.PRIVACY_ROOT ? resolve(process.env.PRIVACY_ROOT) : fileURLToPath(new URL('..', import.meta.url))
const termsFile = join(ROOT, '.private', 'terms.txt')
const terms = [
  ...(existsSync(termsFile) ? readFileSync(termsFile, 'utf8').split('\n') : []),
  ...(process.env.PRIVACY_TERMS ?? '').split(','),
]
  .map((t) => t.trim())
  .filter(Boolean)
if (!terms.length) {
  console.error('No private terms: add .private/terms.txt (one per line) or set PRIVACY_TERMS.')
  process.exit(2)
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** A single capitalised word is matched exactly (so a name never matches "aria-label"); anything else ignores case. */
const patterns = terms.map((t) => {
  const single = /^[A-Z][A-Za-z]*$/.test(t)
  return { term: t, re: single ? new RegExp(`\\b${esc(t)}\\b(?!-)`) : new RegExp(`\\b${esc(t)}\\b`, 'i') }
})
const generic = [
  { term: 'email address', re: /[A-Za-z0-9._%+-]+@(?!users\.noreply\.github\.com\b|anthropic\.com\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { term: 'an age', re: /\b\d{1,2}[- ]years?[- ]old\b|\baged? \d{1,2}\b/i },
  { term: 'an API key', re: /\bsk_[A-Za-z0-9]{20,}/ },
]
const elevenKey = (process.env.ELEVENLABS_API_KEY ?? '').trim()
if (elevenKey.length >= 8) generic.push({ term: 'the ElevenLabs key', re: new RegExp(esc(elevenKey)) })

const hits = []
const scan = (where, text) => {
  for (const p of [...patterns, ...generic]) {
    const lines = text.split('\n')
    lines.forEach((line, i) => {
      if (p.re.test(line)) hits.push(`${where}:${i + 1}: matches ${patterns.includes(p) ? 'a private term' : p.term}`)
    })
  }
}

const files = execSync('git ls-files --cached --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
for (const f of files) {
  // Binary files aren't text: images, fonts and (1.2) the coach's MP3 clips.
  if (f === 'package-lock.json' || /\.(png|jpg|ico|woff2?|mp3)$/.test(f)) continue
  scan(f, readFileSync(join(ROOT, f), 'utf8'))
}
let log = ''
try {
  log = execSync("git log --format='commit %H%nauthor %an <%ae>%ncommitter %cn <%ce>%n%B%n'", { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
} catch {
  log = ''
}
scan('git log', log)

console.log(`Scanned ${files.length} files and ${(log.match(/^commit /gm) ?? []).length} commits for ${terms.length} private terms.`)
if (hits.length) {
  console.log(hits.join('\n'))
  process.exit(1)
}
console.log('Privacy scan: clean.')
