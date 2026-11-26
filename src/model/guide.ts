/**
 * The guide (version 1.4): the singer's voice, in time with her track. Pure, so the checks can read it.
 *
 * - The voice control has three levels: Off, Light and Full. With the voice on its own, her track
 *   always plays in full and the voice is turned up or down over it; with a full guide mix (her music
 *   with the voice in it), the mix is crossfaded with her track, so the music stays at one level.
 * - With a guide file the rap ladder uses it: listen at Full, say it at Light, say it at Off, then from
 *   memory. Recording and Showtime start at Off, with Light as a choice before she begins.
 * - What a guide file is gets worked out from how much of her track is in it: a full mix has her music
 *   in it (lined up by cross-correlating the two), the voice on its own doesn't. A grown-up confirms.
 * - Her track and the guide are written side by side into one four-channel WAV, so one media element
 *   plays both: the voice can't drift from her track at any speed, and the control only changes gains.
 */
import { KID_COPY } from '../content/kid'
import type { GuideKind, SaveData, VoiceLevel } from '../storage/schema'
import { fill } from '../ui/dom'

/** How loud the voice is at Light (about −9 dB). */
export const LIGHT_GAIN = 0.35

/** Recording and Showtime start at Off; Light is the only other choice before she begins. */
export const START_CHOICES: readonly VoiceLevel[] = ['off', 'light']

/** A guide she can hear: confirmed, and built for the track that is on the iPad now. */
export function guideReady(save: Pick<SaveData, 'guide' | 'track'>): boolean {
  const g = save.guide
  return !!g.kind && !!g.mixId && !!save.track.mediaId && g.forTrack === save.track.mediaId
}

/** The gains for her track's channels and the guide's channels at a level. */
export function voiceGains(kind: GuideKind, level: VoiceLevel): { music: number; guide: number } {
  const g = level === 'full' ? 1 : level === 'light' ? LIGHT_GAIN : 0
  return kind === 'mix' ? { music: Math.round((1 - g) * 1000) / 1000, guide: g } : { music: 1, guide: g }
}

const RUNG_VOICE: Record<string, VoiceLevel> = { 'rap-listen': 'full', 'rap-say': 'light' }

/** Where the voice starts on a rung with a guide file: listen at Full, say it at Light, then Off. */
export function rungVoice(stepId: string): VoiceLevel {
  return RUNG_VOICE[stepId] ?? 'off'
}

/** Her control's name: "{singer}’s voice", or "The singer’s voice" until a grown-up types a name. */
export function voiceTitle(singer: string): string {
  const name = singer.trim()
  return name ? fill(KID_COPY.voice.title, { singer: name }) : KID_COPY.voice.titleNoName
}

// ---- Working out what the guide is ---------------------------------------------------------------

export interface GuideAnalysis {
  guess: GuideKind
  /** Seconds the guide runs behind her track (a full mix only; 0 for the voice on its own). */
  offset: number
  /** How much of the guide is her track, 0–1 (normalised correlation at the best alignment). */
  similarity: number
  /** The guide's length minus her track's, in seconds. */
  lengthDiff: number
}

/** About this many samples a second are enough to line two recordings up. */
const WORK_RATE = 8000
/** Only this band is compared (Hz, and a share of the working rate at the top, below any folding). */
const BAND_LOW = 60
const BAND_HIGH = 0.4
/** The furthest apart a full mix and her track are looked for, in seconds. */
const MAX_LAG_S = 2
/** At or above this, the guide has her music in it. */
export const MIX_SIMILARITY = 0.3

/** Every f-th sample after a triangular low-pass (two running averages), so little folds down. */
function decimate(x: Float32Array, f: number): Float32Array {
  if (f <= 1) return x
  const avg = (a: Float32Array) => {
    const out = new Float32Array(a.length)
    let s = 0
    for (let i = 0; i < a.length; i++) {
      s += a[i] - (i >= f ? a[i - f] : 0)
      out[i] = s / f
    }
    return out
  }
  const smooth = avg(avg(x))
  const out = new Float32Array(Math.floor(x.length / f))
  for (let i = 0; i < out.length; i++) out[i] = smooth[i * f + f - 1]
  return out
}

/** In-place radix-2 FFT (inverse with inv = true, unscaled). */
function fft(re: Float64Array, im: Float64Array, inv: boolean): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inv ? 2 : -2) * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k
        const b = a + len / 2
        const xr = re[b] * cr - im[b] * ci
        const xi = re[b] * ci + im[b] * cr
        re[b] = re[a] - xr
        im[b] = im[a] - xi
        re[a] += xr
        im[a] += xi
        const t = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = t
      }
    }
  }
}

/**
 * The lag (in samples of t) that lines g up with t: g[i + lag] matches t[i]. A generalised
 * cross-correlation with phase transform (each frequency counts the same, so a strong steady tone
 * can't decide it) over a window from the middle of t, within the band where nothing folded down.
 */
function bestLag(t: Float32Array, g: Float32Array, maxLag: number, rate: number): number {
  const win = Math.min(t.length, 1 << 17)
  const start = Math.max(0, Math.floor((t.length - win) / 2))
  let n = 1
  while (n < win + 2 * maxLag) n <<= 1
  const tr = new Float64Array(n)
  const ti = new Float64Array(n)
  const gr = new Float64Array(n)
  const gi = new Float64Array(n)
  // Hann windows, so a strong steady tone doesn't leak across the spectrum and swamp everything else.
  const hann = (i: number, len: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * (i + 0.5)) / len)
  for (let i = 0; i < win; i++) tr[i + maxLag] = t[start + i] * hann(i, win)
  const glen = win + 2 * maxLag
  for (let i = 0; i < glen; i++) {
    const j = start - maxLag + i
    gr[i] = j >= 0 && j < g.length ? g[j] * hann(i, glen) : 0
  }
  fft(tr, ti, false)
  fft(gr, gi, false)
  // G · conj(T), whitened, inside the band.
  for (let k = 0; k < n; k++) {
    const hz = (Math.min(k, n - k) * rate) / n
    if (hz < BAND_LOW || hz > BAND_HIGH * rate) {
      gr[k] = 0
      gi[k] = 0
      continue
    }
    const r = gr[k] * tr[k] + gi[k] * ti[k]
    const i = gi[k] * tr[k] - gr[k] * ti[k]
    const m = Math.hypot(r, i) + 1e-12
    gr[k] = r / m
    gi[k] = i / m
  }
  fft(gr, gi, true)
  let best = 0
  let bestV = -Infinity
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const v = gr[(lag + n) % n]
    if (v > bestV) {
      bestV = v
      best = lag
    }
  }
  return best
}

/** Normalised correlation of t[i] with g[i + lag] where both exist. */
function similarityAt(t: Float32Array, g: Float32Array, lag: number): number {
  let tg = 0
  let tt = 0
  let gg = 0
  const from = Math.max(0, -lag)
  const to = Math.min(t.length, g.length - lag)
  for (let i = from; i < to; i++) {
    const a = t[i]
    const b = g[i + lag]
    tg += a * b
    tt += a * a
    gg += b * b
  }
  return tt > 1e-12 && gg > 1e-12 ? tg / Math.sqrt(tt * gg) : 0
}

/** Plain correlation over a window of the full-rate signals, for lags lo…hi; the best one. */
function refineLag(t: Float32Array, g: Float32Array, lo: number, hi: number, sampleRate: number): number {
  const win = Math.min(Math.round(sampleRate * 4), Math.floor(t.length / 2))
  const start = Math.max(0, Math.floor((t.length - win) / 2))
  let best = lo
  let bestV = -Infinity
  for (let lag = lo; lag <= hi; lag++) {
    let s = 0
    for (let i = start; i < start + win; i++) {
      const j = i + lag
      if (j >= 0 && j < g.length) s += t[i] * g[j]
    }
    if (s > bestV) {
      bestV = s
      best = lag
    }
  }
  return best
}

/** Work out whether the guide is a full mix (and how it lines up with her track) or the voice on its own. Mono signals. */
export function analyseGuide(track: Float32Array, guide: Float32Array, sampleRate: number): GuideAnalysis {
  const lengthDiff = (guide.length - track.length) / sampleRate
  const f = Math.max(1, Math.floor(sampleRate / WORK_RATE))
  const rate = sampleRate / f
  const t = decimate(track, f)
  const g = decimate(guide, f)
  if (t.length < rate / 2 || g.length < rate / 2) return { guess: 'vocals', offset: 0, similarity: 0, lengthDiff }
  const maxLag = Math.max(1, Math.min(Math.round(MAX_LAG_S * rate), Math.floor(Math.min(t.length, g.length) / 4)))
  const coarse = bestLag(t, g, maxLag, rate)
  const similarity = similarityAt(t, g, coarse)
  if (!(similarity >= MIX_SIMILARITY)) return { guess: 'vocals', offset: 0, similarity: Math.max(0, similarity), lengthDiff }
  const fine = refineLag(track, guide, coarse * f - f, coarse * f + f, sampleRate)
  return { guess: 'mix', offset: fine / sampleRate, similarity, lengthDiff }
}

// ---- Her track and the guide in one file -----------------------------------------------------------

const FRAMES_PER_CHUNK = 1 << 16

/**
 * A 16-bit PCM WAV with four channels: her track left and right, then the guide left and right, as
 * long as her track. Frame i of her track is beside frame i + offset × sampleRate of the guide (silence
 * where the guide has none). A mono file plays in both ears. Returned in chunks, ready for a Blob.
 */
export function guideWav(track: Float32Array[], guide: Float32Array[], sampleRate: number, offset: number): ArrayBuffer[] {
  const n = track[0]?.length ?? 0
  const tl = track[0] ?? new Float32Array(n)
  const tr = track[1] ?? tl
  const gl = guide[0] ?? new Float32Array(0)
  const gr = guide[1] ?? gl
  const off = Math.round(offset * sampleRate)
  const dataBytes = n * 4 * 2
  const head = new DataView(new ArrayBuffer(44))
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) head.setUint8(at + i, s.charCodeAt(i))
  }
  text(0, 'RIFF')
  head.setUint32(4, 36 + dataBytes, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  head.setUint32(16, 16, true)
  head.setUint16(20, 1, true)
  head.setUint16(22, 4, true)
  head.setUint32(24, sampleRate, true)
  head.setUint32(28, sampleRate * 8, true)
  head.setUint16(32, 8, true)
  head.setUint16(34, 16, true)
  text(36, 'data')
  head.setUint32(40, dataBytes, true)
  const out: ArrayBuffer[] = [head.buffer]
  const s16 = (x: number) => Math.round(Math.max(-1, Math.min(1, x || 0)) * 32767)
  for (let from = 0; from < n; from += FRAMES_PER_CHUNK) {
    const to = Math.min(n, from + FRAMES_PER_CHUNK)
    const chunk = new Int16Array((to - from) * 4)
    for (let i = from, k = 0; i < to; i++, k += 4) {
      const j = i + off
      chunk[k] = s16(tl[i])
      chunk[k + 1] = s16(tr[i])
      chunk[k + 2] = j >= 0 && j < gl.length ? s16(gl[j]) : 0
      chunk[k + 3] = j >= 0 && j < gr.length ? s16(gr[j]) : 0
    }
    out.push(chunk.buffer)
  }
  return out
}

/** Mono: the average of the channels. */
export function mono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0]
  const n = channels[0]?.length ?? 0
  const out = new Float32Array(n)
  for (const c of channels) for (let i = 0; i < n; i++) out[i] += c[i] / channels.length
  return out
}
