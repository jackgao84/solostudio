/**
 * Her track with the guide (version 1.4): one shared <audio class="guide-audio"> plays the
 * four-channel file (her track in channels 1–2, the guide in 3–4, built by guide-build.ts). Because
 * one media element plays both, the voice stays exactly in time with her track at every speed, and
 * the element keeps the pitch as her track's does (preservesPitch). Web Audio splits the channels:
 * her track and the guide each have a gain, and the voice control (Off, Light, Full) only moves those
 * gains, with a short ramp, so switching mid-loop never moves the music and never clicks.
 * iPadOS ignores a media element's volume; Web Audio gains work.
 */
import { audioContext } from '../audio/sfx'
import { voiceGains } from '../model/guide'
import { media } from '../storage/media'
import type { GuideKind, VoiceLevel } from '../storage/schema'
import { revokeLater } from './blob-url'
import type { Player } from './player'
import { trackPlayer } from './track'

export interface GuidedPlayer extends Player {
  setVoice(level: VoiceLevel): void
  voice(): VoiceLevel
}

let el: HTMLAudioElement | null = null
let loadedId: string | null = null
let url: string | null = null
let seeks = 0
interface Graph {
  music: GainNode
  guide: GainNode
  analyser: AnalyserNode
}
let graph: Graph | null = null
/** The guided player on screen now (for the read-only debug hook). */
let current: { kind: GuideKind; level: () => VoiceLevel; player: Player } | null = null

function audio(): HTMLAudioElement {
  if (!el) {
    el = document.createElement('audio')
    el.className = 'guide-audio'
    el.preload = 'auto'
    el.setAttribute('playsinline', '')
    el.addEventListener('seeking', () => seeks++)
    document.body.append(el)
  }
  return el
}

function keepPitch(a: HTMLAudioElement): void {
  const x = a as HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean }
  x.preservesPitch = true
  x.webkitPreservesPitch = true
}

/** The channel split and the two gains, wired once (an element can only be wired into Web Audio once). */
function wire(a: HTMLAudioElement): Graph | null {
  if (graph) return graph
  const c = audioContext()
  if (!c) return null
  try {
    const src = c.createMediaElementSource(a)
    const split = c.createChannelSplitter(4)
    src.connect(split)
    const musicPair = c.createChannelMerger(2)
    const guidePair = c.createChannelMerger(2)
    split.connect(musicPair, 0, 0)
    split.connect(musicPair, 1, 1)
    split.connect(guidePair, 2, 0)
    split.connect(guidePair, 3, 1)
    const music = c.createGain()
    const guide = c.createGain()
    musicPair.connect(music)
    guidePair.connect(guide)
    const out = c.createGain()
    music.connect(out)
    guide.connect(out)
    out.connect(c.destination)
    const analyser = c.createAnalyser()
    analyser.fftSize = 8192
    out.connect(analyser)
    graph = { music, guide, analyser }
    return graph
  } catch (err) {
    console.warn('[solostudio] the guide could not be wired', err)
    return null
  }
}

async function load(mixId: string): Promise<HTMLAudioElement | null> {
  const a = audio()
  if (loadedId === mixId && a.src) return a
  const rec = await (await media()).get(mixId)
  if (!rec) return null
  revokeLater(url)
  url = URL.createObjectURL(rec.blob)
  loadedId = mixId
  a.src = url
  keepPitch(a)
  await new Promise<void>((resolve) => {
    if (a.readyState >= 1) return resolve()
    const done = () => {
      a.removeEventListener('loadedmetadata', done)
      a.removeEventListener('error', done)
      resolve()
    }
    a.addEventListener('loadedmetadata', done)
    a.addEventListener('error', done)
  })
  return a
}

/** Forget the loaded file (a grown-up removed or rebuilt the guide). */
export function unloadGuide(): void {
  if (el) {
    el.pause()
    el.removeAttribute('src')
    el.load()
  }
  revokeLater(url)
  url = null
  loadedId = null
}

function applyGains(g: Graph, kind: GuideKind, level: VoiceLevel, ramp: boolean): void {
  const c = g.music.context
  const { music, guide } = voiceGains(kind, level)
  if (!ramp) {
    g.music.gain.cancelScheduledValues(0)
    g.guide.gain.cancelScheduledValues(0)
    g.music.gain.value = music
    g.guide.gain.value = guide
    return
  }
  const t = c.currentTime
  g.music.gain.cancelScheduledValues(t)
  g.guide.gain.cancelScheduledValues(t)
  g.music.gain.setTargetAtTime(music, t, 0.015)
  g.guide.gain.setTargetAtTime(guide, t, 0.015)
}

/**
 * Her track with the guide at a level. If the four-channel file can't be played through Web Audio,
 * her track plays as before (with no voice).
 */
export function guidedPlayer(mixId: string, trackId: string, kind: GuideKind, level: VoiceLevel): GuidedPlayer {
  let lvl = level
  const a = audio()
  let ended: (() => void) | null = null
  const onEnded = () => ended?.()
  a.addEventListener('ended', onEnded)
  let fallback: Player | null = null
  let g: Graph | null = null
  const ready = (async () => {
    const loaded = await load(mixId)
    g = loaded ? wire(loaded) : null
    if (!g) {
      fallback = trackPlayer(trackId)
      fallback.onEnded = () => ended?.()
      await fallback.ready
      return
    }
    applyGains(g, kind, lvl, false)
  })()
  ready.catch(() => undefined)
  const via = <T>(f: (p: Player) => T, own: () => T): T => (fallback ? f(fallback) : own())
  const player: GuidedPlayer = {
    kind: 'track',
    ready,
    play: () =>
      via(
        (p) => p.play(),
        () => {
          keepPitch(a)
          const c = audioContext()
          if (c && c.state !== 'running') void c.resume().catch(() => undefined)
          void a.play().catch((err: unknown) => console.warn('[solostudio] guide play failed', err))
        },
      ),
    pause: () => via((p) => p.pause(), () => a.pause()),
    seek: (t) =>
      via(
        (p) => p.seek(t),
        () => {
          a.currentTime = Math.max(0, t)
        },
      ),
    time: () => via((p) => p.time(), () => a.currentTime),
    setRate: (r) =>
      via(
        (p) => p.setRate(r),
        () => {
          const rate = Math.min(1, Math.max(0.5, r))
          keepPitch(a)
          a.playbackRate = rate
          a.defaultPlaybackRate = rate
          return rate
        },
      ),
    rate: () => via((p) => p.rate(), () => a.playbackRate),
    duration: () => via((p) => p.duration(), () => (Number.isFinite(a.duration) ? a.duration : null)),
    playing: () => via((p) => p.playing(), () => !a.paused && !a.ended),
    setMuted: (on) =>
      via(
        (p) => p.setMuted(on),
        () => {
          a.muted = on
        },
      ),
    get onEnded() {
      return ended
    },
    set onEnded(fn) {
      ended = fn
    },
    setVoice: (next) => {
      lvl = next
      if (g) applyGains(g, kind, next, true)
    },
    voice: () => lvl,
    destroy: () => {
      a.pause()
      a.muted = false
      a.removeEventListener('ended', onEnded)
      ended = null
      fallback?.destroy()
      if (current?.player === player) current = null
    },
  }
  current = { kind, level: () => lvl, player }
  return player
}

export function isGuided(p: Player | null): p is GuidedPlayer {
  return !!p && typeof (p as Partial<GuidedPlayer>).setVoice === 'function'
}

/** What the guided player on screen is doing (read-only, for the checks and a curious grown-up). */
export function guidedState(): Record<string, unknown> | null {
  if (!current || !el) return null
  const x = el as HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean }
  return {
    level: current.level(),
    kind: current.kind,
    music: graph ? graph.music.gain.value : 1,
    guide: graph ? graph.guide.gain.value : 0,
    playing: current.player.playing(),
    time: current.player.time(),
    rate: el.playbackRate,
    preservesPitch: x.preservesPitch ?? x.webkitPreservesPitch ?? false,
    seeks,
    channels: graph ? 4 : 2,
  }
}

/** How strong each frequency is in what is playing now (amplitude), from the last moment of sound. */
export function hearNow(freqs: number[]): number[] {
  if (!graph) return freqs.map(() => 0)
  const an = graph.analyser
  const buf = new Float32Array(an.fftSize)
  an.getFloatTimeDomainData(buf)
  const sr = an.context.sampleRate
  return freqs.map((f) => {
    const w = (2 * Math.PI * f) / sr
    const k = 2 * Math.cos(w)
    let s1 = 0
    let s2 = 0
    for (let i = 0; i < buf.length; i++) {
      const s0 = buf[i] + k * s1 - s2
      s2 = s1
      s1 = s0
    }
    return (2 * Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - k * s1 * s2))) / buf.length
  })
}
