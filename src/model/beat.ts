/**
 * Beat: works out the tempo and the first "1" (a downbeat) of her track from its decoded audio, so
 * the setup wizard can offer a guess instead of starting a grown-up from nothing. Plain number
 * crunching (no Web Audio, no DOM) that gives the same answer every time; a grown-up checks the
 * guess and can halve or double the tempo or nudge the downbeat.
 *
 * How it listens: every 10 ms it measures how much the sound jumps (spectral flux), overall and in
 * the low end where the kick and bass are. The tempo is the beat length whose jumps repeat best after
 * one, two and four beats (autocorrelation; a 4/4 pattern repeats every bar), leaning gently towards
 * 80–160 bpm, then sharpened by following where the beat falls through the whole track. The beats
 * sit at the peak of every jump folded onto one beat, the "1" is whichever of the four beats has the
 * strongest kick and bass, and the offset is the first "1" once the music has started.
 */

export interface BeatGuess {
  /** Beats per minute at 100%, to 0.1. */
  bpm: number
  /** Track time of the first downbeat (a "1") once the music has started, in seconds, to 0.01. */
  offset: number
  /** How clear the pulse and its "1" are: 0 (a wild guess) to 1 (very clear). */
  confidence: number
}

/** A tempo and a downbeat, as kept in the save (see Tempo in storage/schema.ts). */
export interface TempoGuess {
  bpm: number
  offset: number
}

/** Shorter tracks give no guess. */
export const MIN_SECONDS = 6
export const MIN_BPM = 60
export const MAX_BPM = 200
export const BEATS_PER_BAR = 4

/** The audio is brought down to about this rate first (plenty for kicks, claps and bass). */
const TARGET_RATE = 11025
/** One step of the onset envelope, in seconds. */
const HOP_SECONDS = 0.01
/** Quieter than this (RMS) is silence. */
const SILENCE_RMS = 1e-4
/** Where the loudness compression bends, as a share of the track's average spectral power. */
const KNEE = 0.1
/** The low end (kick and bass), in Hz. */
const LOW_HZ: readonly [number, number] = [35, 200]
/** The tempo the guess leans towards, and how gently (in octaves). */
const PRIOR_BPM = 120
const PRIOR_OCTAVES = 0.75
/** How much a tempo's beat coherence counts when choosing it (0 = not at all, 1 = fully). */
const COHERENCE_WEIGHT = 0.25
/** Below this the hits barely repeat at one, two and four beats (autocorrelation, 0–1): no guess. */
const MIN_REPEAT = 0.08
/**
 * How far the hits must gather on the beat to count as a pulse: (focus − 1) × √(beats folded), where
 * focus is the folded peak over its average. Noise of any length stays below about 19; a steady
 * beat, even over six seconds, scores 40 or more.
 */
const MIN_EVIDENCE = 28
/** Seconds of envelope per phase measurement. */
const SEGMENT_SECONDS = 4
/** Flux peaks a little before the hit it marks (the analysis window reaches it early); added back. */
const ONSET_LAG = 0.006
/** A downbeat this many beats before the first sound still counts as the first "1". */
const FIRST_SLACK_BEATS = 0.2

export function detectBeat(samples: Float32Array, sampleRate: number): BeatGuess | null {
  if (!(sampleRate > 0) || samples.length < MIN_SECONDS * sampleRate) return null
  const { data, rate } = decimate(samples, sampleRate)
  let ms = 0
  for (let i = 0; i < data.length; i++) ms += data[i] * data[i]
  ms /= data.length
  if (!(Math.sqrt(ms) >= SILENCE_RMS)) return null

  const env = envelopes(data, rate, ms)
  const fps = rate / env.hop
  // Every hit counts for the beat; the low end (kick and bass) only helps choose the "1", so a
  // kick and a loud clap on alternate beats still read as beats rather than one slow pulse.
  const onset = normalised(peaks(env.full, fps))
  const low = normalised(peaks(env.low, fps))

  // The tempo: the repeat that lines up best over one, two and four beats.
  const tempo = pickPeriod(onset, fps)
  if (tempo === null) return null
  const bpm = Math.round((600 * fps) / tempo.period) / 10
  if (!(bpm >= MIN_BPM && bpm <= MAX_BPM)) return null
  const beat = (60 * fps) / bpm // frames, at the rounded tempo the app will use

  // Where the beats fall: every hit folded onto one beat at that tempo; the beat is the peak.
  const { phase, focus } = foldPeak(onset, beat)
  const evidence = (focus - 1) * Math.sqrt(onset.length / beat)
  if (!(evidence >= MIN_EVIDENCE)) return null

  // Which beat is the "1": the strongest kick and bass, with a little say for everything else.
  const lowSum = [0, 0, 0, 0]
  const fullSum = [0, 0, 0, 0]
  const strengths: number[] = []
  for (let k = 0; phase + k * beat < onset.length; k++) {
    const i = Math.round(phase + k * beat)
    lowSum[k % BEATS_PER_BAR] += around(low, i, 3, 'sum')
    fullSum[k % BEATS_PER_BAR] += around(onset, i, 3, 'sum')
    strengths.push(around(onset, i, 2, 'max'))
  }
  const lowTotal = lowSum.reduce((a, b) => a + b, 0) || 1
  const fullTotal = fullSum.reduce((a, b) => a + b, 0) || 1
  const scores = lowSum.map((v, j) => v / lowTotal + (0.25 * fullSum[j]) / fullTotal)
  const order = scores.map((_, j) => j).sort((a, b) => scores[b] - scores[a] || a - b)
  const one = order[0]
  const clarity = scores[order[0]] > 0 ? (scores[order[0]] - scores[order[1]]) / scores[order[0]] : 0

  // The first "1" once the music has started.
  const typical = median(strengths)
  if (!(typical > 0)) return null
  let first = 0
  while (first < onset.length && onset[first] < 0.3 * typical) first++
  const time = (frame: number) => (frame * env.hop) / rate + ONSET_LAG
  const beatSeconds = 60 / bpm
  const barSeconds = BEATS_PER_BAR * beatSeconds
  const downbeat = time(phase + one * beat)
  const earliest = time(first) - FIRST_SLACK_BEATS * beatSeconds
  const offset = Math.max(0, downbeat + Math.ceil((earliest - downbeat) / barSeconds) * barSeconds)

  // Sure of the pulse, of the tempo over its nearest rival (often half or double), and of the "1".
  const pulseSure = clamp01(Math.log(evidence / MIN_EVIDENCE) / Math.log(4))
  const tempoSure = 0.5 + 0.5 * clamp01(2 * tempo.margin)
  const oneSure = 0.6 + 0.4 * clamp01(2 * clarity)
  const confidence = pulseSure * tempoSure * oneSure
  return { bpm, offset: Math.round(offset * 100) / 100, confidence: Math.round(confidence * 100) / 100 }
}

/** Half the tempo; the same "1" (every other "1" of the old grid is a "1" of the new one). */
export function halfTempo(t: TempoGuess): TempoGuess {
  return { bpm: t.bpm / 2, offset: t.offset }
}

/** Double the tempo; the same "1" (it is still a "1", with another one half way through the old bar). */
export function doubleTempo(t: TempoGuess): TempoGuess {
  return { bpm: t.bpm * 2, offset: t.offset }
}

/**
 * Move the downbeat by `deltaS` seconds. It stays on the bar grid and never goes below zero: a nudge
 * past the start wraps forward by whole bars into [0, one bar). A later first "1" (after a silent
 * intro) moves by the nudge alone, so it stays the first "1".
 */
export function nudgeOffset(t: TempoGuess, deltaS: number): TempoGuess {
  let next = t.offset + deltaS
  if (next < 0) {
    const bar = t.bpm > 0 ? (BEATS_PER_BAR * 60) / t.bpm : 0
    next = bar > 0 ? next + Math.ceil(-next / bar - 1e-9) * bar : 0
    if (next < 0) next += bar
  }
  return { bpm: t.bpm, offset: Math.max(0, Math.round(next * 1000) / 1000) }
}

// ---------------------------------------------------------------------------------------------------

/** Average groups of samples to bring the rate down near TARGET_RATE. */
function decimate(samples: Float32Array, sampleRate: number): { data: Float32Array; rate: number } {
  const factor = Math.max(1, Math.floor(sampleRate / TARGET_RATE + 1e-9))
  if (factor === 1) return { data: samples, rate: sampleRate }
  const n = Math.floor(samples.length / factor)
  const data = new Float32Array(n)
  for (let i = 0, j = 0; i < n; i++) {
    let sum = 0
    for (let k = 0; k < factor; k++, j++) sum += samples[j]
    data[i] = sum / factor
  }
  return { data, rate: sampleRate / factor }
}

interface Fft {
  size: number
  rev: Uint32Array
  cos: Float64Array
  sin: Float64Array
}

function makeFft(size: number): Fft {
  const bits = Math.round(Math.log2(size))
  const rev = new Uint32Array(size)
  for (let i = 0; i < size; i++) {
    let r = 0
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b)
    rev[i] = r
  }
  const cos = new Float64Array(size / 2)
  const sin = new Float64Array(size / 2)
  for (let i = 0; i < size / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / size)
    sin[i] = Math.sin((2 * Math.PI * i) / size)
  }
  return { size, rev, cos, sin }
}

/** In-place forward FFT (radix 2). */
function fft({ size, rev, cos, sin }: Fft, re: Float64Array, im: Float64Array): void {
  for (let i = 0; i < size; i++) {
    const j = rev[i]
    if (j > i) {
      const tr = re[i]
      re[i] = re[j]
      re[j] = tr
      const ti = im[i]
      im[i] = im[j]
      im[j] = ti
    }
  }
  for (let len = 2; len <= size; len <<= 1) {
    const half = len >> 1
    const step = size / len
    for (let start = 0; start < size; start += len) {
      for (let j = 0, k = 0; j < half; j++, k += step) {
        const a = start + j
        const b = a + half
        const wr = cos[k]
        const wi = sin[k]
        const tr = re[b] * wr + im[b] * wi
        const ti = im[b] * wr - re[b] * wi
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
      }
    }
  }
}

/**
 * Spectral flux every HOP_SECONDS: how much louder each quarter-octave band got since the step
 * before (log-compressed, rises only), and the same for the low end's total energy. Frame f's window
 * is centred on sample f × hop; the track counts as silent before its start.
 */
function envelopes(data: Float32Array, rate: number, meanSquare: number): { full: Float64Array; low: Float64Array; hop: number } {
  const size = 2 ** Math.round(Math.log2(rate * 0.04))
  const half = size / 2
  const hop = Math.max(1, Math.round(rate * HOP_SECONDS))
  const frames = Math.floor(data.length / hop) + 1
  const win = new Float64Array(size)
  let winPower = 0
  for (let j = 0; j < size; j++) {
    win[j] = 0.5 - 0.5 * Math.cos((2 * Math.PI * j) / size)
    winPower += win[j] * win[j]
  }
  // Average power of one FFT bin over the track (Parseval), so the compression suits any loudness.
  const meanBin = meanSquare * winPower

  // Quarter-octave bands above 50 Hz (single bins below that width).
  const binHz = rate / size
  const bandOf = new Int32Array(half).fill(-1)
  const widths: number[] = []
  for (let k = 1, f = 50; k < half; f *= 2 ** 0.25) {
    const end = Math.min(half, Math.max(k + 1, Math.ceil(f / binHz)))
    for (let j = k; j < end; j++) bandOf[j] = widths.length
    widths.push(end - k)
    k = end
  }
  const bands = widths.length
  const invKnee = Float64Array.from(widths, (w) => 1 / (KNEE * meanBin * w))
  const lowFrom = Math.max(1, Math.ceil(LOW_HZ[0] / binHz))
  const lowTo = Math.min(half - 1, Math.floor(LOW_HZ[1] / binHz))

  const plan = makeFft(size)
  const re = new Float64Array(size)
  const im = new Float64Array(size)
  const bandA = new Float64Array(bands)
  const bandB = new Float64Array(bands)
  let prev = new Float64Array(bands)
  let cur = new Float64Array(bands)
  const full = new Float64Array(frames)
  const lowEnergy = new Float64Array(frames)

  const fill = (buf: Float64Array, frame: number) => {
    const start = frame * hop - half
    if (start >= 0 && start + size <= data.length) {
      for (let j = 0; j < size; j++) buf[j] = data[start + j] * win[j]
    } else {
      for (let j = 0; j < size; j++) {
        const idx = start + j
        buf[j] = idx >= 0 && idx < data.length ? data[idx] * win[j] : 0
      }
    }
  }
  const flux = (band: Float64Array): number => {
    let sum = 0
    for (let b = 0; b < bands; b++) {
      cur[b] = Math.log1p(band[b] * invKnee[b])
      const d = cur[b] - prev[b]
      if (d > 0) sum += d
    }
    const t = prev
    prev = cur
    cur = t
    return sum
  }

  // Two real frames per complex FFT: frame f in the real part, frame f + 1 in the imaginary part.
  for (let f = 0; f < frames; f += 2) {
    fill(re, f)
    if (f + 1 < frames) fill(im, f + 1)
    else im.fill(0)
    fft(plan, re, im)
    bandA.fill(0)
    bandB.fill(0)
    let lowA = 0
    let lowB = 0
    for (let k = 1; k < half; k++) {
      const zr = re[k]
      const zi = im[k]
      const yr = re[size - k]
      const yi = im[size - k]
      const pa = ((zr + yr) * (zr + yr) + (zi - yi) * (zi - yi)) / 4
      const pb = ((zi + yi) * (zi + yi) + (zr - yr) * (zr - yr)) / 4
      const b = bandOf[k]
      bandA[b] += pa
      bandB[b] += pb
      if (k >= lowFrom && k <= lowTo) {
        lowA += pa
        lowB += pb
      }
    }
    full[f] = flux(bandA)
    lowEnergy[f] = lowA
    if (f + 1 < frames) {
      full[f + 1] = flux(bandB)
      lowEnergy[f + 1] = lowB
    }
  }

  // The low end as one band: total energy, log-compressed against its own average.
  let lowMean = 0
  for (let i = 0; i < frames; i++) lowMean += lowEnergy[i]
  lowMean /= frames
  const low = new Float64Array(frames)
  if (lowMean > 0) {
    const inv = 1 / (KNEE * lowMean)
    let before = 0
    for (let i = 0; i < frames; i++) {
      const now = Math.log1p(lowEnergy[i] * inv)
      low[i] = Math.max(0, now - before)
      before = now
    }
  }
  return { full, low, hop }
}

/** What sticks out above the local average (±0.15 s): the hits, without the steady wash. */
function peaks(x: Float64Array, fps: number): Float64Array {
  const w = Math.max(1, Math.round(0.15 * fps))
  const n = x.length
  const prefix = new Float64Array(n + 1)
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + x[i]
  const out = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - w)
    const b = Math.min(n, i + w + 1)
    out[i] = Math.max(0, x[i] - (prefix[b] - prefix[a]) / (b - a))
  }
  return out
}

/** Scaled to an average of 1 (all zeros stay zeros). */
function normalised(x: Float64Array): Float64Array {
  let sum = 0
  for (let i = 0; i < x.length; i++) sum += x[i]
  if (sum > 0) {
    const k = x.length / sum
    for (let i = 0; i < x.length; i++) x[i] *= k
  }
  return x
}

function prior(bpm: number): number {
  const octaves = Math.log2(bpm / PRIOR_BPM) / PRIOR_OCTAVES
  return Math.exp(-0.5 * octaves * octaves)
}

/**
 * The beat period (in frames), sharpened, and its margin over the next best tempo (0–1), or null
 * without a clear pulse. Each autocorrelation peak between MIN_BPM and MAX_BPM is scored by how
 * strongly the hits repeat after one, two and four of its beats (a 4/4 pattern repeats every bar),
 * how coherent its beats are, and the gentle tempo lean.
 */
function pickPeriod(x: Float64Array, fps: number): { period: number; margin: number } | null {
  const n = x.length
  const lagMin = (60 * fps) / MAX_BPM
  const lagMax = (60 * fps) / MIN_BPM
  const maxLag = Math.min(n - 1, BEATS_PER_BAR * Math.ceil(lagMax) + 8)
  if (n < 2 * (Math.ceil(lagMax) + 1)) return null
  let mean = 0
  for (let i = 0; i < n; i++) mean += x[i]
  mean /= n
  const y = new Float64Array(n)
  for (let i = 0; i < n; i++) y[i] = x[i] - mean
  const acf = new Float64Array(maxLag + 1)
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0
    for (let i = 0, m = n - lag; i < m; i++) sum += y[i] * y[i + lag]
    acf[lag] = sum / (n - lag)
  }
  if (!(acf[0] > 0)) return null
  /** Strongest repeat near `lag` (allowing for a small error in the period), 0–1. */
  const near = (lag: number): number => {
    const r = Math.max(1, Math.round(0.01 * lag))
    let v = 0
    for (let j = Math.round(lag) - r; j <= Math.round(lag) + r; j++) if (j >= 1 && j <= maxLag) v = Math.max(v, acf[j])
    return v / acf[0]
  }

  let best: { period: number; repeat: number; score: number } | null = null
  let runnerUp = 0
  for (let lag = Math.max(2, Math.floor(lagMin)); lag <= Math.ceil(lagMax); lag++) {
    const y0 = acf[lag - 1]
    const y1 = acf[lag]
    const y2 = acf[lag + 1]
    if (!(y1 > y0 && y1 >= y2 && y1 > 0)) continue
    const den = y0 - 2 * y1 + y2
    const d = den < 0 ? (0.5 * (y0 - y2)) / den : 0
    const period = lag + d
    if (period < lagMin || period > lagMax) continue
    const repeat = ((y1 - 0.25 * (y0 - y2) * d) / acf[0] + near(2 * period) + near(BEATS_PER_BAR * period)) / 3
    const score = repeat * coherence(x, period, fps) ** COHERENCE_WEIGHT * prior((60 * fps) / period)
    if (!best || score > best.score) {
      if (best) runnerUp = best.score
      best = { period, repeat, score }
    } else runnerUp = Math.max(runnerUp, score)
  }
  if (!best || best.repeat < MIN_REPEAT) return null
  const margin = 1 - runnerUp / best.score
  // Keep the sharpened period only if the hits gather on it at least as tightly.
  const sharper = refinePeriod(x, best.period, fps)
  const period = foldPeak(x, sharper).focus >= foldPeak(x, best.period).focus ? sharper : best.period
  return { period, margin }
}

/**
 * Every hit in frames [from, to) folded onto one beat of `period` frames (one bin per frame,
 * smoothed): the peak's phase (frames, within one beat, counted from the start of the track), its
 * focus (peak over average), how far it stands above the average (in envelope units) and the
 * weighted centre of the frames.
 */
function foldPeak(x: Float64Array, period: number, from = 0, to = x.length): { phase: number; focus: number; excess: number; centre: number } {
  const bins = Math.max(8, Math.round(period))
  const raw = new Float64Array(bins)
  let total = 0
  let centre = 0
  for (let i = from; i < to; i++) {
    const v = x[i]
    if (v === 0) continue
    const pos = ((i / period) % 1) * bins
    const b = Math.floor(pos)
    const f = pos - b
    raw[b % bins] += v * (1 - f)
    raw[(b + 1) % bins] += v * f
    total += v
    centre += v * i
  }
  const h = new Float64Array(bins)
  let top = 0
  for (let b = 0; b < bins; b++) {
    h[b] = (raw[(b + bins - 1) % bins] + 2 * raw[b] + raw[(b + 1) % bins]) / 4
    if (h[b] > h[top]) top = b
  }
  const y0 = h[(top + bins - 1) % bins]
  const y2 = h[(top + 1) % bins]
  const den = y0 - 2 * h[top] + y2
  const d = den < 0 ? (0.5 * (y0 - y2)) / den : 0
  const mean = total / bins
  return {
    phase: (((((top + d) / bins) * period) % period) + period) % period,
    focus: mean > 0 ? h[top] / mean : 0,
    excess: h[top] - mean,
    centre: total > 0 ? centre / total : (from + to) / 2,
  }
}

/** The envelope's Fourier component at one beat period over frames [from, to): cos, sin and weight. */
function resultant(x: Float64Array, from: number, to: number, period: number): [number, number, number] {
  const w = (2 * Math.PI) / period
  let c = 0
  let s = 0
  let total = 0
  for (let i = from; i < to; i++) {
    const v = x[i]
    if (v === 0) continue
    c += v * Math.cos(w * i)
    s += v * Math.sin(w * i)
    total += v
  }
  return [c, s, total]
}

/** Segment lengths (frames) holding a whole number of beats, about `seconds` long. */
function segmentLength(period: number, fps: number, seconds: number): number {
  return Math.max(2, Math.round((seconds * fps) / period)) * period
}

/**
 * How evenly the hits line up with a beat every `period` frames, segment by segment: 0 (not at all)
 * to 1. Hits half way between beats count against it, so it tells a beat from every other beat.
 */
function coherence(x: Float64Array, period: number, fps: number): number {
  const seg = segmentLength(period, fps, SEGMENT_SECONDS)
  let lined = 0
  let total = 0
  for (let a = 0; a < x.length; a += seg) {
    const [c, s, t] = resultant(x, Math.round(a), Math.min(x.length, Math.round(a + seg)), period)
    lined += Math.hypot(c, s)
    total += t
  }
  return total > 0 ? lined / total : 0
}

/**
 * Sharpen the beat period by following where the beat falls, segment by segment, through the
 * track: if it drifts later, the period is a little longer than thought (and the other way round).
 * A straight line is fitted to the drift, once more without segments that disagree.
 */
function refinePeriod(x: Float64Array, start: number, fps: number): number {
  let period = start
  for (const seconds of [SEGMENT_SECONDS, 2 * SEGMENT_SECONDS, 2 * SEGMENT_SECONDS]) {
    const seg = segmentLength(period, fps, seconds)
    const pts: { t: number; theta: number; w: number }[] = []
    for (let a = 0; a + seg / 2 <= x.length; a += seg) {
      const p = foldPeak(x, period, Math.round(a), Math.min(x.length, Math.round(a + seg)))
      if (p.excess > 0) pts.push({ t: p.centre, theta: (2 * Math.PI * p.phase) / period, w: p.excess })
    }
    const floor = 0.25 * median(pts.map((p) => p.w))
    let kept = pts.filter((p) => p.w >= floor)
    if (kept.length < 3) break
    for (let i = 1; i < kept.length; i++) {
      let d = kept[i].theta - kept[i - 1].theta
      d -= 2 * Math.PI * Math.round(d / (2 * Math.PI))
      kept[i].theta = kept[i - 1].theta + d
    }
    const first = lineFit(kept)
    if (!first) break
    kept = kept.filter((p) => Math.abs(p.theta - first.at(p.t)) < Math.PI / 4)
    const fit = kept.length >= 3 ? lineFit(kept) : null
    if (!fit) break
    const next = 1 / (1 / period - fit.slope / (2 * Math.PI))
    if (!(next > 0) || Math.abs(next / start - 1) > 0.02) break
    period = next
  }
  return period
}

/** Weighted least-squares line through (t, theta). */
function lineFit(pts: readonly { t: number; theta: number; w: number }[]): { slope: number; at: (t: number) => number } | null {
  let sw = 0
  let st = 0
  let sth = 0
  for (const p of pts) {
    sw += p.w
    st += p.w * p.t
    sth += p.w * p.theta
  }
  if (!(sw > 0)) return null
  const tMean = st / sw
  const thMean = sth / sw
  let num = 0
  let den = 0
  for (const p of pts) {
    num += p.w * (p.t - tMean) * (p.theta - thMean)
    den += p.w * (p.t - tMean) ** 2
  }
  if (!(den > 0)) return null
  const slope = num / den
  return { slope, at: (t) => thMean + slope * (t - tMean) }
}

/** Sum or max of x over [i − r, i + r]. */
function around(x: Float64Array, i: number, r: number, how: 'sum' | 'max'): number {
  let out = 0
  for (let j = Math.max(0, i - r); j <= Math.min(x.length - 1, i + r); j++) out = how === 'sum' ? out + x[j] : Math.max(out, x[j])
  return out
}

function median(values: readonly number[]): number {
  if (!values.length) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}
