/**
 * The privacy scan (scripts/privacy-scan.mjs) also catches API keys (1.2): anything shaped like a
 * secret key ("sk_" and a long run of letters and digits), and the exact value of
 * ELEVENLABS_API_KEY when it is set, in any file or commit. It says where, never the key itself.
 *
 * The scan runs here against a throwaway git folder (PRIVACY_ROOT), so no key-shaped text ever sits
 * in this repo: the fake keys are built at run time.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const SCAN = join(__dirname, '..', '..', 'scripts', 'privacy-scan.mjs')
const dirs: string[] = []

function repo(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'solostudio-privacy-'))
  dirs.push(dir)
  execFileSync('git', ['init', '-q'], { cwd: dir })
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text)
  return dir
}

function scan(dir: string, env: Record<string, string> = {}) {
  const r = spawnSync(process.execPath, [SCAN], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', PRIVACY_ROOT: dir, PRIVACY_TERMS: 'Placeholderterm', ...env },
  })
  return { code: r.status, out: `${r.stdout}\n${r.stderr}` }
}

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

const fakeSk = () => ['sk', '_', '3f9a0c7e'.repeat(6)].join('')
const fakePlain = () => ['9c41', 'e07b'.repeat(7)].join('')

describe('the privacy scan and API keys', () => {
  it('passes a clean folder', () => {
    const r = scan(repo({ 'notes.md': 'Nothing secret here.\n' }))
    expect(r.out).toContain('Privacy scan: clean.')
    expect(r.code).toBe(0)
  })

  it('flags a key-shaped string without printing it', () => {
    const key = fakeSk()
    const r = scan(repo({ 'config.ts': `const k = '${key}'\n` }))
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/config\.ts:1: matches an API key/)
    expect(r.out).not.toContain(key)
  })

  it('flags the exact ElevenLabs key from the environment, whatever its shape, without printing it', () => {
    const key = fakePlain()
    const r = scan(repo({ 'voice.log': `request sent with ${key}\n` }), { ELEVENLABS_API_KEY: key })
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/voice\.log:1: matches the ElevenLabs key/)
    expect(r.out).not.toContain(key)
  })

  it('does not flag the variable’s name or a header read from it', () => {
    const r = scan(repo({ 'voice.mjs': "headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }\n" }), { ELEVENLABS_API_KEY: fakePlain() })
    expect(r.out).toContain('Privacy scan: clean.')
    expect(r.code).toBe(0)
  })
})
