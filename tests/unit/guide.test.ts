/**
 * Version 1.4, part 2: a guide file in the app.
 *  - A grown-up loads a second audio file, the guide: either a full guide mix of her cut (her music
 *    with the voice in it) or the voice on its own, the same length as her track. The app works out
 *    which (and, for a full mix, how it lines up with her track); a grown-up confirms it.
 *  - The voice control (Off, Light, Full) wherever her track plays. Her track and the guide are kept
 *    side by side in one four-channel file, so the voice stays exactly in time with her track at every
 *    speed; the control only changes how loud the voice is (and for a full mix, crossfades it).
 *  - With a guide file the rap ladder uses it instead of the karaoke videos: listen at Full, say it at
 *    Light, say it at Off, then from memory.
 *  - Recording and Showtime start at Off, with Light as a choice before she begins.
 * Every signal here is made on the spot (tones and seeded noise): no song audio is ever in the repo.
 */
import { describe, expect, it } from 'vitest'
import { KID_COPY } from '../../src/content/kid'
import { stepCopyFor } from '../../src/content/ladders'
import { LIGHT_GAIN, START_CHOICES, analyseGuide, guideReady, guideWav, rungVoice, voiceGains, voiceTitle } from '../../src/model/guide'
import { LADDERS } from '../../src/model/ladders'
import { rapMode, stepSource } from '../../src/model/videos'
import { VOICE_LEVELS, defaultSave, type SaveData, type Section } from '../../src/storage/schema'

const SR = 8000

/** A seeded random source, so every run hears the same "music". */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32 - 0.5
  }
}

/** Something music-like: a low tone, a chord and irregular noisy hits (never periodic over seconds). */
function music(seconds: number, seed = 1): Float32Array {
  const n = Math.round(seconds * SR)
  const r = rng(seed)
  const out = new Float32Array(n)
  let last = 0
  let next = 0
  for (let i = 0; i < n; i++) {
    if (i >= next) {
      last = i
      next = i + Math.round(SR * (0.18 + (r() + 0.5) * 0.4))
    }
    const sinceHit = (i - last) / SR
    out[i] = 0.15 * Math.sin((2 * Math.PI * 110 * i) / SR) + 0.08 * Math.sin((2 * Math.PI * 277 * i) / SR) + 0.4 * r() * Math.exp(-sinceHit * 12)
  }
  return out
}

/** Something voice-like: a gliding tone in phrases with gaps. */
function voice(seconds: number, seed = 7): Float32Array {
  const n = Math.round(seconds * SR)
  const r = rng(seed)
  const out = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const on = Math.sin(2 * Math.PI * 0.7 * t) > -0.3 ? 1 : 0
    phase += (2 * Math.PI * (520 + 80 * Math.sin(2 * Math.PI * 0.9 * t))) / SR
    out[i] = on * (0.3 * Math.sin(phase) + 0.03 * r())
  }
  return out
}

const add = (a: Float32Array, b: Float32Array) => a.map((x, i) => x + (b[i] ?? 0))
/** The same signal, starting `s` seconds later (silence first). */
const delayed = (a: Float32Array, s: number) => {
  const k = Math.round(s * SR)
  const out = new Float32Array(a.length + k)
  out.set(a, k)
  return out
}

function ready(save: SaveData): SaveData {
  save.track = { mediaId: 'media-track-1', fileName: 'track.m4a', duration: 180, standInYoutubeId: '' }
  save.guide = { mediaId: 'media-guide-1', fileName: 'guide.m4a', duration: 180, kind: 'vocals', guess: 'vocals', offset: 0, mixId: 'media-mix-1', forTrack: 'media-track-1', singer: '' }
  return save
}

const section: Section = {
  id: 's1',
  name: 'Verse 1',
  lines: [],
  track: { start: 10, end: 20 },
  refs: {},
  createdAt: '2031-01-01T00:00:00.000Z',
}

describe('the voice control', () => {
  it('has three levels: Off, Light and Full', () => {
    expect([...VOICE_LEVELS]).toEqual(['off', 'light', 'full'])
    expect([KID_COPY.voice.off, KID_COPY.voice.light, KID_COPY.voice.full]).toEqual(['Off', 'Light', 'Full'])
  })

  it('turns the voice on its own up or down over her track, which always plays in full', () => {
    expect(voiceGains('vocals', 'off')).toEqual({ music: 1, guide: 0 })
    expect(voiceGains('vocals', 'light')).toEqual({ music: 1, guide: LIGHT_GAIN })
    expect(voiceGains('vocals', 'full')).toEqual({ music: 1, guide: 1 })
    expect(LIGHT_GAIN).toBeGreaterThan(0.15)
    expect(LIGHT_GAIN).toBeLessThan(0.5)
  })

  it('crossfades a full guide mix with her track, so the music stays at one level', () => {
    expect(voiceGains('mix', 'off')).toEqual({ music: 1, guide: 0 })
    expect(voiceGains('mix', 'full')).toEqual({ music: 0, guide: 1 })
    const light = voiceGains('mix', 'light')
    expect(light.guide).toBe(LIGHT_GAIN)
    expect(light.music + light.guide).toBeCloseTo(1, 10)
  })

  it('is named for whose voice it is, typed on the iPad (never in the app), or the singer’s', () => {
    expect(KID_COPY.voice.title).toContain('{singer}')
    expect(voiceTitle('Coco')).toBe('Coco’s voice')
    expect(voiceTitle('  ')).toBe(KID_COPY.voice.titleNoName)
    expect(voiceTitle('')).toBe('The singer’s voice')
  })

  it('tells a grown-up in one line how to add a guide when there is none', () => {
    expect(KID_COPY.voice.noGuide).toMatch(/grown-up/i)
    expect(KID_COPY.voice.noGuide).toMatch(/Her track/)
    expect(KID_COPY.voice.noGuide.split(/(?<=[.!?])\s+/)).toHaveLength(1)
  })

  it('offers Off and Light before Recording and Showtime begin (they start at Off)', () => {
    expect([...START_CHOICES]).toEqual(['off', 'light'])
  })
})

describe('a guide she can hear', () => {
  it('is confirmed, and built for the track on the iPad now', () => {
    expect(guideReady(defaultSave())).toBe(false)
    const d = ready(defaultSave())
    expect(guideReady(d)).toBe(true)
    expect(guideReady({ ...d, guide: { ...d.guide, kind: null } })).toBe(false)
    expect(guideReady({ ...d, guide: { ...d.guide, mixId: null } })).toBe(false)
    expect(guideReady({ ...d, track: { ...d.track, mediaId: 'media-track-2' } })).toBe(false)
    expect(guideReady({ ...d, track: { ...d.track, mediaId: null } })).toBe(false)
  })
})

describe('with a guide file, the rap ladder uses it instead of the karaoke videos', () => {
  it('plays her track on every rap rung', () => {
    const d = ready(defaultSave())
    expect(rapMode(d)).toBe('guide')
    expect(LADDERS.rap.map((s) => stepSource(s, section, d))).toEqual(['track', 'track', 'track', 'track', 'track'])
    for (const l of ['dance', 'together'] as const) expect(LADDERS[l].map((s) => stepSource(s, section, d))).toEqual(LADDERS[l].map((s) => s.source))
  })

  it('listen at Full, say it at Light, say it at Off, then from memory (Off)', () => {
    expect(LADDERS.rap.map((s) => rungVoice(s.id))).toEqual(['full', 'light', 'off', 'off', 'off'])
    for (const l of ['dance', 'together'] as const) for (const s of LADDERS[l]) expect(rungVoice(s.id), s.id).toBe('off')
  })

  it('names each rung for the voice', () => {
    expect(LADDERS.rap.map((s) => stepCopyFor(s, 'track', 'guide').name)).toEqual(['Listen and read', 'Say it with a light voice', 'Say it with no voice', 'From memory, slow', 'From memory, full speed'])
  })
})

describe('working out what the guide is', () => {
  const m = music(24)
  const v = voice(24)

  it('a file with her music in it is a full guide mix, lined up with her track', () => {
    const a = analyseGuide(m, add(m, v), SR)
    expect(a.guess).toBe('mix')
    expect(Math.abs(a.offset)).toBeLessThan(1 / SR + 1e-9)
    expect(a.similarity).toBeGreaterThan(0.4)
    expect(Math.abs(a.lengthDiff)).toBeLessThan(0.01)
  })

  it('a full guide mix that starts later or earlier is lined up with her track', () => {
    const later = analyseGuide(m, delayed(add(m, v), 0.25), SR)
    expect(later.guess).toBe('mix')
    expect(later.offset).toBeCloseTo(0.25, 3)
    expect(later.lengthDiff).toBeCloseTo(0.25, 2)
    const earlier = analyseGuide(delayed(m, 0.1), add(m, v), SR)
    expect(earlier.guess).toBe('mix')
    expect(earlier.offset).toBeCloseTo(-0.1, 3)
  })

  it('the voice on its own is the voice on its own, played from the top with her track', () => {
    const a = analyseGuide(m, v, SR)
    expect(a.guess).toBe('vocals')
    expect(a.offset).toBe(0)
    expect(a.similarity).toBeLessThan(0.2)
  })

  it('says how much longer or shorter the guide is than her track', () => {
    expect(analyseGuide(m, voice(20), SR).lengthDiff).toBeCloseTo(-4, 2)
  })

  it('copes with silence and very short files', () => {
    expect(analyseGuide(new Float32Array(SR), new Float32Array(SR), SR).guess).toBe('vocals')
    expect(analyseGuide(new Float32Array(10), voice(1), SR).guess).toBe('vocals')
  })
})

describe('her track and the guide in one four-channel file', () => {
  const read = (chunks: ArrayBuffer[]) => {
    const total = chunks.reduce((a, c) => a + c.byteLength, 0)
    const u = new Uint8Array(total)
    let at = 0
    for (const c of chunks) (u.set(new Uint8Array(c), at), (at += c.byteLength))
    return new DataView(u.buffer)
  }
  const str = (v: DataView, at: number, n: number) => String.fromCharCode(...Array.from({ length: n }, (_, i) => v.getUint8(at + i)))
  const frame = (v: DataView, i: number) => [0, 1, 2, 3].map((c) => v.getInt16(44 + (i * 4 + c) * 2, true) / 32767)

  it('is a 16-bit PCM WAV with four channels: her track left and right, then the guide left and right', () => {
    const tl = Float32Array.from([0.5, -0.5, 0.25, 0])
    const tr = Float32Array.from([0.1, 0.2, 0.3, 0.4])
    const gl = Float32Array.from([-0.1, -0.2, -0.3, -0.4])
    const gr = Float32Array.from([0.9, 0.8, 0.7, 0.6])
    const v = read(guideWav([tl, tr], [gl, gr], 44100, 0))
    expect(str(v, 0, 4)).toBe('RIFF')
    expect(str(v, 8, 4)).toBe('WAVE')
    expect(str(v, 12, 4)).toBe('fmt ')
    expect(v.getUint16(20, true)).toBe(1)
    expect(v.getUint16(22, true)).toBe(4)
    expect(v.getUint32(24, true)).toBe(44100)
    expect(v.getUint16(34, true)).toBe(16)
    expect(str(v, 36, 4)).toBe('data')
    expect(v.getUint32(40, true)).toBe(4 * 4 * 2)
    expect(v.getUint32(4, true)).toBe(36 + 4 * 4 * 2)
    expect(v.byteLength).toBe(44 + 4 * 4 * 2)
    for (let i = 0; i < 4; i++) {
      const f = frame(v, i)
      expect(f[0]).toBeCloseTo(tl[i], 3)
      expect(f[1]).toBeCloseTo(tr[i], 3)
      expect(f[2]).toBeCloseTo(gl[i], 3)
      expect(f[3]).toBeCloseTo(gr[i], 3)
    }
  })

  it('is as long as her track, with the guide lined up by its offset (and silence where it has none)', () => {
    const t = Float32Array.from([0, 0, 0, 0, 0, 0])
    const g = Float32Array.from([0.1, 0.2, 0.3, 0.4])
    // The guide runs 2 frames behind her track: her frame i hears the guide's frame i + 2.
    let v = read(guideWav([t], [g], 2, 1))
    expect(v.getUint32(40, true)).toBe(6 * 4 * 2)
    expect([0, 1, 2, 3, 4, 5].map((i) => Math.round(frame(v, i)[2] * 10) / 10)).toEqual([0.3, 0.4, 0, 0, 0, 0])
    // A mono file plays in both ears.
    expect(frame(v, 0)[3]).toBeCloseTo(frame(v, 0)[2], 5)
    // The guide runs ahead: silence until it starts.
    v = read(guideWav([t], [g], 2, -1))
    expect([0, 1, 2, 3, 4, 5].map((i) => Math.round(frame(v, i)[2] * 10) / 10)).toEqual([0, 0, 0.1, 0.2, 0.3, 0.4])
  })

  it('never wraps a loud sample round', () => {
    const v = read(guideWav([Float32Array.from([2, -2])], [Float32Array.from([1.5, -1.5])], 8000, 0))
    expect(frame(v, 0)).toEqual([1, 1, 1, 1])
    expect(frame(v, 1).map((x) => Math.round(x))).toEqual([-1, -1, -1, -1])
  })
})
