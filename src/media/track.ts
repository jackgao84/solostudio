/**
 * Her track: one shared <audio class="track-audio"> element, loaded from IndexedDB. It plays at
 * 50–100% with the pitch kept where Safari allows (preservesPitch / webkitPreservesPitch).
 */
import type { Player } from './player'
import { media } from '../storage/media'
import { revokeLater } from './blob-url'

let el: HTMLAudioElement | null = null
let loadedId: string | null = null
let url: string | null = null

function audio(): HTMLAudioElement {
  if (!el) {
    el = document.createElement('audio')
    el.className = 'track-audio'
    el.preload = 'auto'
    el.setAttribute('playsinline', '')
    document.body.append(el)
  }
  return el
}

function keepPitch(a: HTMLAudioElement): void {
  const x = a as HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean }
  x.preservesPitch = true
  x.webkitPreservesPitch = true
  x.mozPreservesPitch = true
}

/** Load a track's bytes into the shared element (once per track). Null if it isn't on this iPad. */
export async function loadTrack(mediaId: string): Promise<HTMLAudioElement | null> {
  const a = audio()
  if (loadedId === mediaId && a.src) return a
  const rec = await (await media()).get(mediaId)
  if (!rec) return null
  revokeLater(url)
  url = URL.createObjectURL(rec.blob)
  loadedId = mediaId
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

/** Forget the loaded track (a grown-up removed or replaced it). */
export function unloadTrack(): void {
  if (el) {
    el.pause()
    el.removeAttribute('src')
    el.load()
  }
  revokeLater(url)
  url = null
  loadedId = null
}

/** How long an audio or video file is, read from its metadata. */
export function probeDuration(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const probe = document.createElement(blob.type.startsWith('video') ? 'video' : 'audio')
    const u = URL.createObjectURL(blob)
    let settled = false
    const done = (d: number | null) => {
      if (settled) return
      settled = true
      probe.removeAttribute('src')
      probe.load()
      revokeLater(u)
      resolve(d)
    }
    probe.preload = 'metadata'
    probe.onloadedmetadata = () => done(Number.isFinite(probe.duration) ? probe.duration : null)
    probe.onerror = () => done(null)
    probe.src = u
    window.setTimeout(() => done(null), 8000)
  })
}

export function trackPlayer(mediaId: string): Player {
  const a = audio()
  let ended: (() => void) | null = null
  const onEnded = () => ended?.()
  a.addEventListener('ended', onEnded)
  const ready = loadTrack(mediaId).then((x) => {
    if (!x) throw new Error('track missing')
  })
  ready.catch(() => undefined)
  return {
    kind: 'track',
    ready,
    play: () => {
      keepPitch(a)
      void a.play().catch((err: unknown) => console.warn('[solostudio] track play failed', err))
    },
    pause: () => a.pause(),
    seek: (t) => {
      a.currentTime = Math.max(0, t)
    },
    time: () => a.currentTime,
    setRate: (r) => {
      const rate = Math.min(1, Math.max(0.5, r))
      keepPitch(a)
      a.playbackRate = rate
      a.defaultPlaybackRate = rate
      return rate
    },
    rate: () => a.playbackRate,
    duration: () => (Number.isFinite(a.duration) ? a.duration : null),
    playing: () => !a.paused && !a.ended,
    // iPadOS ignores an audio element's volume, but muting works.
    setMuted: (on) => {
      a.muted = on
    },
    get onEnded() {
      return ended
    },
    set onEnded(fn) {
      ended = fn
    },
    destroy: () => {
      a.pause()
      a.muted = false
      a.removeEventListener('ended', onEnded)
      ended = null
    },
  }
}
