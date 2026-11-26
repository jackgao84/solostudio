/**
 * YouTube through the IFrame Player API only, embedded from youtube-nocookie.com, playing inline.
 * The player sits in its own box (at least 200 × 200, sized by CSS) with nothing over it and no CSS
 * transforms on it or around it. A video that won't embed reports its error so the screen can show
 * "Open in YouTube" in its place.
 */
import { trackYouTube } from './now-playing'
import type { Player } from './player'
import { YT_API, YT_HOST, errorKind, nearestRate, playerVars, type ErrorKind } from './youtube-util'

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(s: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  setPlaybackRate(r: number): void
  getPlaybackRate(): number
  getAvailablePlaybackRates(): number[]
  mute(): void
  unMute(): void
  destroy(): void
}

interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let api: Promise<YTNamespace> | null = null

/** Load the IFrame Player API once. Rejects when offline. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!api) {
    api = new Promise<YTNamespace>((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        if (window.YT?.Player) resolve(window.YT)
      }
      const s = document.createElement('script')
      s.src = YT_API
      s.async = true
      s.onerror = () => {
        api = null
        s.remove()
        reject(new Error('offline'))
      }
      document.head.append(s)
      window.setTimeout(() => {
        if (!window.YT?.Player) {
          api = null
          reject(new Error('timeout'))
        }
      }, 20_000)
    })
  }
  return api
}

export interface YouTubeOptions {
  /** The video can't play here (blocked, missing, offline…). The player has been removed. */
  onError?: (kind: ErrorKind | 'offline') => void
  /** Start here (seconds) the first time it plays. */
  start?: number
}

export function youTubePlayer(container: HTMLElement, videoId: string, opts: YouTubeOptions = {}): Player {
  const frame = document.createElement('div')
  frame.className = 'yt-frame'
  const host = document.createElement('div')
  host.className = 'yt-host'
  frame.append(host)
  container.append(frame)
  let yt: YTPlayer | null = null
  let state = -1
  let ended: (() => void) | null = null
  let gone = false
  let failed = false
  let wantedRate = 1

  const fail = (kind: ErrorKind | 'offline') => {
    if (failed || gone) return
    failed = true
    try {
      yt?.destroy()
    } catch {
      /* already gone */
    }
    yt = null
    frame.remove()
    opts.onError?.(kind)
  }

  const ready = new Promise<void>((resolve, reject) => {
    loadYouTubeApi().then(
      (YT) => {
        if (gone) return reject(new Error('gone'))
        yt = new YT.Player(host, {
          host: YT_HOST,
          videoId,
          width: '100%',
          height: '100%',
          playerVars: opts.start ? { ...playerVars(window.location.origin), start: Math.floor(opts.start) } : playerVars(window.location.origin),
          events: {
            onReady: () => resolve(),
            onStateChange: (e: { data: number }) => {
              state = e.data
              if (e.data === 0) ended?.()
            },
            onError: (e: { data: number }) => {
              fail(errorKind(e.data))
              reject(new Error(`youtube ${e.data}`))
            },
          },
        })
      },
      () => {
        fail('offline')
        reject(new Error('offline'))
      },
    )
  })
  ready.catch(() => undefined)

  const call = (fn: (p: YTPlayer) => void) => {
    if (yt && !failed) {
      try {
        fn(yt)
      } catch (err) {
        console.warn('[solostudio] youtube call failed', err)
      }
    }
  }

  const player: Player = {
    kind: 'youtube',
    ready,
    play: () => call((p) => p.playVideo()),
    pause: () => {
      call((p) => p.pauseVideo())
      // The player reports the pause a moment later; it is not playing from now on.
      if (state === 1 || state === 3) state = 2
    },
    seek: (t) => call((p) => p.seekTo(Math.max(0, t), true)),
    time: () => {
      let t = 0
      call((p) => (t = p.getCurrentTime() || 0))
      return t
    },
    setRate: (r) => {
      let used = r
      call((p) => {
        used = nearestRate(r, p.getAvailablePlaybackRates?.() ?? [])
        p.setPlaybackRate(used)
      })
      wantedRate = used
      return used
    },
    rate: () => {
      let r = wantedRate
      call((p) => (r = p.getPlaybackRate() || wantedRate))
      return r
    },
    duration: () => {
      let d: number | null = null
      call((p) => (d = p.getDuration() || null))
      return d
    },
    playing: () => state === 1 || state === 3,
    setMuted: (on) => call((p) => (on ? p.mute() : p.unMute())),
    get onEnded() {
      return ended
    },
    set onEnded(fn) {
      ended = fn
    },
    destroy: () => {
      gone = true
      state = -1
      call((p) => p.destroy())
      yt = null
      frame.remove()
    },
  }
  return trackYouTube(player)
}
