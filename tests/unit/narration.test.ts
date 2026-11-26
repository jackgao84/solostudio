/**
 * Narration (version 1.2): a warm coach's voice, recorded once with ElevenLabs by `npm run voice` and
 * kept in the repo as small mono MP3s (public/voice, listed in src/content/voice-manifest.json).
 *  - Every lesson script, every fixed cue phrase and every standard section name has its own clip,
 *    recorded from exactly the words in src/content (so what she hears matches what she reads).
 *  - A clip is only reused while its words, voice and settings are unchanged (its file name is a
 *    hash of all of them), so a changed line can never play an old recording.
 *  - Only a custom section name falls back to the iPad's voice: "Next: {custom}, Rap, 75% speed" is
 *    the coach saying "Next", the iPad saying the name, then the coach again.
 *  - The voice script regenerates only what changed and never prints or stores the key.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { speechPlan } from '../../src/audio/speech-plan'
import { BLOCK_COPY, DRILL_COPY } from '../../src/content/blocks'
import { KID_COPY } from '../../src/content/kid'
import { LADDER_COPY } from '../../src/content/ladders'
import { LESSONS } from '../../src/content/lessons'
import { STANDARD_SECTIONS, lessonScript, narrationLines } from '../../src/content/narration'
import manifest from '../../src/content/voice-manifest.json'
import { COUNT_IN_WORDS } from '../../src/model/countin'
import { LADDERS } from '../../src/model/ladders'
import { showtimeRoutine } from '../../src/model/routine'
import { defaultShowtime } from '../../src/storage/schema'
import { fill } from '../../src/ui/dom'
import { FORMAT, MODEL, SETTINGS, VOICE, clipHash, planVoice } from '../../scripts/voice-lib.mjs'

const ROOT = join(__dirname, '..', '..')
const VOICE_DIR = join(ROOT, 'public', 'voice')

interface Clip {
  text: string
  file: string
  chars: number
  bytes: number
  ms: number
}
const clips = manifest.clips as Clip[]
const byText = new Map(clips.map((c) => [c.text, c]))

/** A cue that plays as one recorded clip. */
function oneClip(text: string): boolean {
  const plan = speechPlan(text)
  return plan.length === 1 && plan[0].kind === 'clip'
}

describe('the recorded voice', () => {
  it('is the chosen coach, in small mono MP3s', () => {
    expect(manifest.voice).toBe(VOICE.name)
    expect(manifest.model).toBe(MODEL)
    expect(manifest.format).toBe(FORMAT)
    expect(FORMAT).toBe('mp3_22050_32')
  })

  it('has a clip for every narrated line, recorded from exactly its words, voice and settings', () => {
    const missing: string[] = []
    for (const line of narrationLines()) {
      const c = byText.get(line.text)
      if (!c || c.file !== `${clipHash(line)}.mp3`) missing.push(line.text)
    }
    expect(missing).toEqual([])
  })

  it('keeps no clip for a line that is no longer narrated, and every clip file is there', () => {
    const wanted = new Set(narrationLines().map((l) => l.text))
    expect(clips.filter((c) => !wanted.has(c.text)).map((c) => c.text)).toEqual([])
    const files = existsSync(VOICE_DIR) ? readdirSync(VOICE_DIR).filter((f) => !f.startsWith('.')) : []
    expect(files.sort()).toEqual(clips.map((c) => c.file).sort())
  })

  it('is small: mono MPEG-2 layer III at 22.05 kHz and 32 kbps, nothing over 600 KB, under 10 MB in all', () => {
    let total = 0
    const odd: string[] = []
    for (const c of clips) {
      const path = join(VOICE_DIR, c.file)
      const buf = readFileSync(path)
      total += statSync(path).size
      expect(buf.length, c.file).toBe(c.bytes)
      let i = 0
      if (buf.subarray(0, 3).toString('latin1') === 'ID3') i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9])
      while (i < buf.length - 4 && !(buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0)) i++
      const [b1, b2, b3] = [buf[i + 1], buf[i + 2], buf[i + 3]]
      const version = (b1 >> 3) & 3 // 2 = MPEG-2
      const layer = (b1 >> 1) & 3 // 1 = layer III
      const bitrate = (b2 >> 4) & 15 // MPEG-2 layer III: 4 = 32 kbps
      const rate = (b2 >> 2) & 3 // MPEG-2: 0 = 22.05 kHz
      const mono = ((b3 >> 6) & 3) === 3
      if (version !== 2 || layer !== 1 || bitrate !== 4 || rate !== 0 || !mono || buf.length > 600_000) odd.push(c.file)
    }
    expect(odd).toEqual([])
    expect(total).toBeLessThan(10_000_000)
  })
})

describe('what the coach says', () => {
  it('reads every lesson word for word as it is on screen, in one to two minutes', () => {
    for (const l of LESSONS) {
      const script = lessonScript(l)
      expect(script, l.id).toEqual([l.title, ...l.paragraphs, l.tryIt, l.teachersFirst])
      for (const t of script) expect(oneClip(t), `${l.id}: ${t}`).toBe(true)
      const ms = script.reduce((a, t) => a + (byText.get(t)?.ms ?? 0), 0)
      expect(ms, l.id).toBeGreaterThanOrEqual(45_000)
      expect(ms, l.id).toBeLessThanOrEqual(135_000)
    }
  })

  it('says every fixed cue phrase in the coach’s voice', () => {
    const S = KID_COPY.showtime
    const routineCues = showtimeRoutine(defaultShowtime())
      .map((s) => s.cue)
      .filter((c): c is string => !!c)
    const fixed = [
      ...COUNT_IN_WORDS,
      KID_COPY.cues.countIn,
      KID_COPY.cues.getToSpot,
      KID_COPY.cues.again,
      KID_COPY.cues.sessionDone,
      S.breatheIn,
      S.breatheOut,
      ...routineCues,
      KID_COPY.listen.cueStart,
      KID_COPY.listen.cueEnd,
      KID_COPY.tour.slide1,
      KID_COPY.tour.slide2,
      KID_COPY.tour.slide3,
      KID_COPY.tour.slide4,
      KID_COPY.tour.slide5,
      KID_COPY.tour.end,
      ...Object.values(BLOCK_COPY).map((b) => fill(KID_COPY.cues.nextBlock, { block: b.title })),
      ...Object.values(DRILL_COPY).map((b) => fill(KID_COPY.cues.nextBlock, { block: b.title })),
      ...LESSONS.map((l) => fill(KID_COPY.cues.nextBlock, { block: l.title })),
    ]
    expect(fixed.filter((t) => !oneClip(t))).toEqual([])
    expect(KID_COPY.cues.getToSpot).toBe('Get to your spot')
    expect(KID_COPY.cues.again).toBe('Again')
  })

  it('says every standard section name, on its own and in every cue, whatever its capitals', () => {
    expect(STANDARD_SECTIONS).toEqual(['Intro', 'Verse 1', 'Verse 2', 'Pre-chorus', 'Chorus', 'Post-chorus', 'Rap', 'Bridge', 'Dance break', 'Outro'])
    const missing: string[] = []
    for (const name of [...STANDARD_SECTIONS, 'dance Break', 'VERSE 1']) {
      const cues = [name, fill(KID_COPY.cues.nextSection, { section: name })]
      for (const ladder of Object.values(LADDERS))
        for (const step of ladder) cues.push(fill(KID_COPY.cues.nextStep, { section: name, ladder: LADDER_COPY[step.ladder].name, speed: Math.round(step.speed * 100) }))
      for (const c of cues) if (!oneClip(c)) missing.push(c)
    }
    expect(missing).toEqual([])
  })

  it('leaves only a custom section name to the iPad’s voice', () => {
    const name = 'Sparkle part'
    const step = speechPlan(fill(KID_COPY.cues.nextStep, { section: name, ladder: LADDER_COPY.rap.name, speed: 75 }))
    expect(step.map((p) => [p.kind, p.text])).toEqual([
      ['clip', 'Next'],
      ['speech', name],
      ['clip', 'Rap, 75% speed'],
    ])
    expect(speechPlan(fill(KID_COPY.cues.nextSection, { section: name })).map((p) => [p.kind, p.text])).toEqual([
      ['clip', 'Next'],
      ['speech', name],
    ])
    expect(speechPlan(name).map((p) => p.kind)).toEqual(['speech'])
  })
})

describe('the voice script', () => {
  const lines = [{ text: 'Get to your spot' }, { text: '6', prev: '5,', next: '7, 8' }, { text: 'Again' }]

  it('names each clip by a hash of its words, context, voice, model, format and settings', () => {
    const h = clipHash(lines[0])
    expect(h).toMatch(/^[0-9a-f]{16}$/)
    expect(clipHash({ text: 'Get to your spot' })).toBe(h)
    expect(clipHash({ text: 'Get to your spot!' })).not.toBe(h)
    expect(clipHash({ text: 'Get to your spot', prev: 'Ready?' })).not.toBe(h)
    expect(clipHash(lines[0], { voice: 'another-voice' })).not.toBe(h)
    expect(clipHash(lines[0], { model: 'another-model' })).not.toBe(h)
    expect(clipHash(lines[0], { format: 'mp3_44100_128' })).not.toBe(h)
    expect(clipHash(lines[0], { settings: { ...SETTINGS, stability: 0.9 } })).not.toBe(h)
  })

  it('makes only new or changed lines, keeps the rest and removes leftovers', () => {
    const kept = { text: 'Get to your spot', file: `${clipHash(lines[0])}.mp3`, chars: 16, bytes: 6000, ms: 1500 }
    const stale = { text: 'Again', file: '0123456789abcdef.mp3', chars: 5, bytes: 3000, ms: 700 }
    const old = { text: 'A line nobody says now', file: 'fedcba9876543210.mp3', chars: 22, bytes: 9000, ms: 2000 }
    const plan = planVoice(lines, { clips: [kept, stale, old] }, new Set([kept.file, stale.file, old.file, 'stray.mp3']))
    expect(plan.keep.map((c: Clip) => c.text)).toEqual(['Get to your spot'])
    expect(plan.make.map((l: { text: string }) => l.text)).toEqual(['6', 'Again'])
    expect([...plan.remove].sort()).toEqual(['0123456789abcdef.mp3', 'fedcba9876543210.mp3', 'stray.mp3'])
    // A kept clip whose file has gone missing is made again.
    expect(planVoice(lines, { clips: [kept] }, new Set()).make.map((l: { text: string }) => l.text)).toEqual(['Get to your spot', '6', 'Again'])
  })

  it('checks the clips without the key, and never prints a key it is given', () => {
    const fake = ['sk', '_', 'feedface'.repeat(6)].join('')
    const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'voice.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ELEVENLABS_API_KEY: fake } })
    expect(`${r.stdout}${r.stderr}`).not.toContain(fake)
    expect(r.stdout).toMatch(/all \d+ lines have clips/i)
    expect(r.status).toBe(0)
  })
})
