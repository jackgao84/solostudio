/**
 * The audience for Showtime, made in Web Audio from numbers (nothing is downloaded): a gentle crowd
 * before she walks on, and applause after her bow. That is all it ever is. The applause is made from
 * a fixed seed, so it is exactly the same every time, whatever happened: nothing about how she did
 * can change it. Pure: these return samples; src/audio/sfx.ts plays them.
 */
import { seeded } from '../model/rng'

export const AUDIENCE_SOUNDS = ['crowd', 'applause'] as const
export const APPLAUSE_SECONDS = 7
export const CROWD_SECONDS = 4

function peakTo(out: Float32Array, peak: number): Float32Array {
  let max = 0
  for (const x of out) max = Math.max(max, Math.abs(x))
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] = (out[i] / max) * peak
  return out
}

/** Applause: many hands, swelling in, holding, then fading. The same every time. */
export function applauseSamples(sampleRate: number): Float32Array {
  const rand = seeded('applause')
  const n = Math.round(APPLAUSE_SECONDS * sampleRate)
  const out = new Float32Array(n)
  const env = (t: number) => (t < 0.8 ? t / 0.8 : t < 4.4 ? 1 : Math.max(0, 1 - (t - 4.4) / (APPLAUSE_SECONDS - 4.4)))
  const clapLen = Math.max(8, Math.round(0.014 * sampleRate))
  const decay = 0.0028 * sampleRate
  let t = 0.02
  while (t < APPLAUSE_SECONDS - 0.05) {
    const density = 10 + 150 * env(t)
    t += -Math.log(1 - rand() * 0.999) / density
    const start = Math.round(t * sampleRate)
    const amp = (0.35 + 0.65 * rand()) * env(t)
    let prev = 0
    for (let i = 0; i < clapLen && start + i < n; i++) {
      // Bright noise (a first difference) with a quick decay: one clap.
      const white = rand() * 2 - 1
      const bright = white - prev * 0.6
      prev = white
      out[start + i] += amp * bright * Math.exp(-i / decay)
    }
  }
  return peakTo(out, 0.8)
}

/** A gentle crowd murmur that loops smoothly (low, soft, slowly rising and falling). */
export function crowdSamples(sampleRate: number): Float32Array {
  const rand = seeded('crowd')
  const n = Math.round(CROWD_SECONDS * sampleRate)
  const out = new Float32Array(n)
  let lp1 = 0
  let lp2 = 0
  const a = Math.exp((-2 * Math.PI * 700) / sampleRate)
  const b = Math.exp((-2 * Math.PI * 180) / sampleRate)
  for (let i = 0; i < n; i++) {
    const x = rand() * 2 - 1
    lp1 = a * lp1 + (1 - a) * x
    lp2 = b * lp2 + (1 - b) * x
    const band = lp1 - lp2
    // Slow swells with whole cycles over the loop, so it joins up seamlessly.
    const ph = (i / n) * 2 * Math.PI
    const swell = 0.65 + 0.2 * Math.sin(ph * 2) + 0.15 * Math.sin(ph * 5 + 1.3)
    out[i] = band * swell
  }
  // Cross-fade the end into the start for a smooth loop.
  const fade = Math.round(0.25 * sampleRate)
  for (let i = 0; i < fade; i++) {
    const w = i / fade
    out[i] = out[i] * w + out[n - fade + i] * (1 - w)
  }
  return peakTo(out.slice(0, n - fade), 0.14)
}
