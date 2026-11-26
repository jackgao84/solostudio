/** A local reference video (a teacher's demo) from IndexedDB, optionally shown mirrored. */
import type { Player } from './player'
import { media } from '../storage/media'
import { release } from './blob-url'

export function localVideoPlayer(container: HTMLElement, mediaId: string, mirror: boolean): Player {
  const v = document.createElement('video')
  v.className = `local-video${mirror ? ' is-mirrored' : ''}`
  v.setAttribute('playsinline', '')
  v.playsInline = true
  v.preload = 'auto'
  container.append(v)
  let url: string | null = null
  let gone = false
  let ended: (() => void) | null = null
  v.addEventListener('ended', () => ended?.())
  const ready = (async () => {
    const rec = await (await media()).get(mediaId)
    if (!rec) throw new Error('video missing')
    if (gone) throw new Error('closed')
    url = URL.createObjectURL(rec.blob)
    v.src = url
    await new Promise<void>((resolve) => {
      if (v.readyState >= 1) return resolve()
      v.addEventListener('loadedmetadata', () => resolve(), { once: true })
      v.addEventListener('error', () => resolve(), { once: true })
    })
  })()
  ready.catch(() => undefined)
  return {
    kind: 'local',
    ready,
    play: () => void v.play().catch((err: unknown) => console.warn('[solostudio] video play failed', err)),
    pause: () => v.pause(),
    seek: (t) => {
      v.currentTime = Math.max(0, t)
    },
    time: () => v.currentTime,
    setRate: (r) => {
      v.playbackRate = r
      v.defaultPlaybackRate = r
      return r
    },
    rate: () => v.playbackRate,
    duration: () => (Number.isFinite(v.duration) ? v.duration : null),
    playing: () => !v.paused && !v.ended,
    setMuted: (on) => {
      v.muted = on
    },
    get onEnded() {
      return ended
    },
    set onEnded(fn) {
      ended = fn
    },
    destroy: () => {
      gone = true
      release(v, url)
      url = null
      v.remove()
    },
  }
}

export function setMirrored(container: HTMLElement, mirror: boolean): void {
  container.querySelector('video.local-video')?.classList.toggle('is-mirrored', mirror)
}
