/**
 * Playing the coach's recorded clips (version 1.2) through Web Audio, so the cue volume works on
 * the iPad (iPadOS ignores a media element's volume) and a count word starts right on its beat.
 * Clips come from public/voice (precached, so they work offline), are decoded once and kept while
 * they are small; the silence at the start of a clip is skipped. Each source node is labelled with
 * the words it says and its volume, which is what the WebKit checks listen for.
 */
import { audioContext } from './sfx'
import type { ClipInfo } from './speech-plan'

interface Decoded {
  buf: AudioBuffer
  /** Seconds of silence at the start. */
  lead: number
}

const cache = new Map<string, Promise<Decoded | null>>()
/** Short clips (cues, count words) stay decoded; long ones (lesson lines) only while recent. */
const LONG_MS = 4000
const MAX_LONG = 6

function url(file: string): string {
  return `${import.meta.env.BASE_URL}voice/${file}`
}

export function decode(c: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // Older Safari only has the callback form.
  return new Promise((resolve, reject) => {
    const p = c.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined
    p?.catch?.(reject)
  })
}

function leadingSilence(buf: AudioBuffer): number {
  const d = buf.getChannelData(0)
  const max = Math.min(d.length, Math.round(buf.sampleRate * 0.6))
  for (let i = 0; i < max; i++) if (Math.abs(d[i]) > 0.02) return Math.max(0, i / buf.sampleRate - 0.01)
  return 0
}

/** The decoded clip (fetched and decoded on first use; null if it can't be played). */
export function loadClip(clip: ClipInfo): Promise<Decoded | null> {
  let p = cache.get(clip.file)
  if (!p) {
    p = (async () => {
      const c = audioContext()
      if (!c) return null
      try {
        const res = await fetch(url(clip.file))
        if (!res.ok) return null
        const buf = await decode(c, await res.arrayBuffer())
        return { buf, lead: leadingSilence(buf) }
      } catch (err) {
        console.warn('[solostudio] narration clip failed', err)
        return null
      }
    })()
    cache.set(clip.file, p)
    if (clip.ms > LONG_MS) {
      const long = [...cache.keys()].filter((f) => f !== clip.file && longFiles.has(f))
      longFiles.add(clip.file)
      for (const f of long.slice(0, Math.max(0, long.length - MAX_LONG + 1))) {
        cache.delete(f)
        longFiles.delete(f)
      }
    }
  }
  return p
}
const longFiles = new Set<string>()

/** Decode these clips now, so they start without a delay later (the count-in, say). */
export function preloadClips(clips: (ClipInfo | null)[]): void {
  for (const c of clips) if (c) void loadClip(c)
}

export interface ClipPlayback {
  /** Resolves when it finishes or is stopped. */
  done: Promise<void>
  /** Seconds into the clip (after its lead-in silence). */
  position(): number
  stop(): void
}

/**
 * Play a clip now (from `from` seconds in), saying `words` (the text the app asked for) at `volume`.
 * Resolves null when it can't be played, so the caller can fall back to the iPad's voice.
 */
export async function playClip(clip: ClipInfo, words: string, volume: number, from = 0): Promise<ClipPlayback | null> {
  const c = audioContext()
  if (!c) return null
  const d = await loadClip(clip)
  if (!d) return null
  try {
    if (c.state !== 'running') void c.resume().catch(() => undefined)
    const gain = c.createGain()
    gain.gain.value = volume
    gain.connect(c.destination)
    const src = c.createBufferSource()
    src.buffer = d.buf
    src.connect(gain)
    Object.assign(src, { solostudioSay: words, solostudioVolume: volume })
    let finish: () => void = () => undefined
    const done = new Promise<void>((resolve) => (finish = resolve))
    let stopped = false
    const end = () => {
      if (stopped) return
      stopped = true
      try {
        src.disconnect()
        gain.disconnect()
      } catch {
        /* already gone */
      }
      finish()
    }
    src.onended = end
    const offset = Math.min(d.buf.duration, d.lead + Math.max(0, from))
    const startedAt = c.currentTime
    src.start(0, offset)
    // If the context never runs (no sound device), don't wait forever.
    const guard = window.setTimeout(end, (d.buf.duration - offset) * 1000 + 1500)
    void done.then(() => window.clearTimeout(guard))
    return {
      done,
      position: () => offset - d.lead + Math.max(0, c.currentTime - startedAt),
      stop: () => {
        try {
          src.stop()
        } catch {
          /* not started or already stopped */
        }
        end()
      },
    }
  } catch (err) {
    console.warn('[solostudio] narration failed', err)
    return null
  }
}
