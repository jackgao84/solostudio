/**
 * The coach's narration (version 1.2): records every line in src/content/narration.ts with
 * ElevenLabs into public/voice/<hash>.mp3 and lists them in src/content/voice-manifest.json.
 * Only new or changed lines are recorded (a clip's file name is a hash of its words and settings);
 * clips nobody says any more are removed. It reports the characters used.
 *
 *   npm run voice              record what changed (needs ELEVENLABS_API_KEY)
 *   npm run voice -- --dry-run say what would be recorded, and the characters it would use
 *   node scripts/voice.mjs --check   fail if any line has no clip (no key, no network; run by the build)
 *
 * The key is read from ELEVENLABS_API_KEY only. It is never printed, logged or written anywhere.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runnerImport } from 'vite'
import { FORMAT, MODEL, SETTINGS, VOICE, clipHash, mp3DurationMs, planVoice } from './voice-lib.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const MANIFEST = join(ROOT, 'src', 'content', 'voice-manifest.json')
const DIR = join(ROOT, 'public', 'voice')
const args = new Set(process.argv.slice(2))
const KEY = (process.env.ELEVENLABS_API_KEY ?? '').trim()
/** Anything printed goes through here, so the key can never appear even inside an error. */
const clean = (s) => (KEY ? String(s).split(KEY).join('[key]') : String(s))
const say = (s) => console.log(clean(s))

const { module: narration } = await runnerImport(join(ROOT, 'src', 'content', 'narration.ts'), { configFile: false, logLevel: 'silent', root: ROOT })
const lines = narration.narrationLines()
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { clips: [] }
const files = new Set(existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.mp3')) : [])
const plan = planVoice(lines, manifest, files)
const wouldUse = plan.make.reduce((a, l) => a + l.text.length, 0)

if (args.has('--check')) {
  if (plan.make.length) {
    say(`Voice check: ${plan.make.length} of ${lines.length} lines have no clip yet (about ${wouldUse} characters). Run: npm run voice`)
    for (const l of plan.make.slice(0, 10)) say(`  - ${l.text}`)
    process.exit(1)
  }
  say(`Voice check: all ${lines.length} lines have clips (${VOICE.name}, ${MODEL}, ${FORMAT}).`)
  process.exit(0)
}

say(`${lines.length} lines: ${plan.keep.length} recorded already, ${plan.make.length} to record (${wouldUse} characters), ${plan.remove.length} old clips to remove.`)
if (args.has('--dry-run')) process.exit(0)
if (plan.make.length && !KEY) {
  console.error('ELEVENLABS_API_KEY is not set: nothing recorded.')
  process.exit(2)
}

mkdirSync(DIR, { recursive: true })
const clips = new Map(plan.keep.map((c) => [c.text, c]))
const writeManifest = () => {
  const order = new Map(lines.map((l, i) => [l.text, i]))
  const list = [...clips.values()].sort((a, b) => (order.get(a.text) ?? 1e9) - (order.get(b.text) ?? 1e9))
  writeFileSync(MANIFEST, `${JSON.stringify({ voice: VOICE.name, model: MODEL, format: FORMAT, clips: list }, null, 2)}\n`)
}

async function record(line) {
  const body = { text: line.text, model_id: MODEL, voice_settings: SETTINGS }
  if (line.prev) body.previous_text = line.prev
  if (line.next) body.next_text = line.next
  for (let attempt = 1; ; attempt++) {
    let res
    try {
      res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}?output_format=${FORMAT}`, {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
        body: JSON.stringify(body),
      })
    } catch (err) {
      if (attempt >= 4) throw new Error(`network: ${err?.message ?? err}`)
      await new Promise((r) => setTimeout(r, 1500 * attempt))
      continue
    }
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      const chars = Number(res.headers.get('character-cost')) || line.text.length
      return { buf, chars }
    }
    const detail = (await res.text()).slice(0, 300)
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 2000 * attempt))
      continue
    }
    throw new Error(`HTTP ${res.status}: ${detail}`)
  }
}

let used = 0
let made = 0
const queue = [...plan.make]
const failures = []
async function worker() {
  for (let line = queue.shift(); line; line = queue.shift()) {
    try {
      const { buf, chars } = await record(line)
      const file = `${clipHash(line)}.mp3`
      writeFileSync(join(DIR, file), buf)
      clips.set(line.text, { text: line.text, file, chars, bytes: buf.length, ms: mp3DurationMs(buf) })
      used += chars
      made++
      writeManifest()
      if (made % 20 === 0) say(`  ${made} of ${plan.make.length} recorded…`)
    } catch (err) {
      failures.push(`${line.text.slice(0, 50)}: ${err?.message ?? err}`)
    }
  }
}
await Promise.all([worker(), worker(), worker()])
for (const f of plan.remove) rmSync(join(DIR, f), { force: true })
writeManifest()

const total = [...clips.values()].reduce((a, c) => a + c.chars, 0)
say(`Recorded ${made} clips using ${used} characters; kept ${plan.keep.length}; removed ${plan.remove.length}.`)
say(`All ${clips.size} clips together: ${total} characters, ${Math.round([...clips.values()].reduce((a, c) => a + c.bytes, 0) / 1024)} KB.`)
if (failures.length) {
  say(`${failures.length} lines failed:`)
  for (const f of failures) say(`  - ${f}`)
  process.exit(1)
}
