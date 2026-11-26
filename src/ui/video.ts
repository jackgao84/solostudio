/**
 * Putting a source on screen: her track (or a YouTube video standing in for it), a YouTube
 * reference, or a local video. A video that can't play is replaced by a calm panel that says why,
 * honestly (version 1.3): offline, or online and YouTube's player didn't load (Try again, Open in
 * YouTube, ask a grown-up to check YouTube isn't blocked), or a video that won't play inside apps.
 */
import { button } from './components'
import { KID_COPY } from '../content/kid'
import { localVideoPlayer } from '../media/local-video'
import type { Player } from '../media/player'
import { trackPlayer } from '../media/track'
import { guidedPlayer } from '../media/guided'
import { guideReady } from '../model/guide'
import { youTubePlayer, type YouTubePlayer } from '../media/youtube'
import { watchUrl } from '../media/youtube-util'
import { problemPanel, type VideoProblem } from '../model/video-problems'
import type { Reference, SaveData, VoiceLevel } from '../storage/schema'
import { h } from './dom'

const P = KID_COPY.practice

export function videoErrorPanel(kind: VideoProblem, videoId: string, onTryAgain?: () => void): HTMLElement {
  const spec = problemPanel(kind)
  return h(
    'div',
    { class: 'yt-error', role: 'status', 'data-problem': kind },
    h('p', null, spec.text),
    spec.tryAgain || spec.openInYouTube
      ? h(
          'div',
          { class: 'row' },
          spec.tryAgain && onTryAgain ? button(P.tryAgain, () => onTryAgain(), { variant: 'primary' }) : null,
          spec.openInYouTube ? h('a', { class: 'btn open-in-youtube', href: watchUrl(videoId), target: '_blank', rel: 'noopener noreferrer' }, P.openInYouTube) : null,
        )
      : null,
    spec.note ? h('p', { class: 'note' }, spec.note) : null,
  )
}

/** A YouTube player in `box`, swapped for the honest panel if it can't play (and back again on Try again). */
export function youTubeIn(box: HTMLElement, videoId: string, onFail?: () => void, start?: number): Player {
  let panel: HTMLElement | null = null
  const again = () => {
    panel?.remove()
    panel = null
    p.retry()
  }
  const p: YouTubePlayer = youTubePlayer(box, videoId, {
    start,
    onError: (kind) => {
      panel?.remove()
      panel = videoErrorPanel(kind, videoId, again)
      box.append(panel)
      // Offline: it comes back by itself once the iPad is online again.
      if (kind === 'offline') window.addEventListener('online', () => panel?.isConnected && again(), { once: true })
      onFail?.()
    },
  })
  return p
}

export function referencePlayer(box: HTMLElement, ref: Reference, onFail?: () => void): Player {
  if (ref.kind === 'local' && ref.mediaId) return localVideoPlayer(box, ref.mediaId, ref.mirror)
  return youTubeIn(box, ref.youtubeId, onFail)
}

export interface TrackSource {
  player: Player
  standIn: boolean
}

/** Her track, with the guide at `voice` when there is one (version 1.4). */
export function herTrackPlayer(d: SaveData, voice?: VoiceLevel): Player {
  if (voice && guideReady(d) && d.guide.kind && d.guide.mixId) return guidedPlayer(d.guide.mixId, d.track.mediaId!, d.guide.kind, voice)
  return trackPlayer(d.track.mediaId!)
}

/**
 * Her track if it's on this iPad, else the stand-in video, else null. Where she has the voice
 * control (version 1.4: practice, the room, recording, Showtime) `voice` is where it starts.
 */
export async function trackSource(box: HTMLElement, d: SaveData, onFail?: () => void, voice?: VoiceLevel): Promise<TrackSource | null> {
  if (d.track.mediaId) {
    const p = herTrackPlayer(d, voice)
    try {
      await p.ready
      box.append(trackArt())
      return { player: p, standIn: false }
    } catch {
      p.destroy()
    }
  }
  if (d.track.standInYoutubeId) return { player: youTubeIn(box, d.track.standInYoutubeId, onFail), standIn: true }
  return null
}

/** Original art for audio-only practice: a soft LED equaliser. */
export function trackArt(): HTMLElement {
  return h('div', { class: 'track-art', 'aria-hidden': 'true' }, ...Array.from({ length: 9 }, (_, i) => h('span', { class: 'track-art__bar', style: `--i:${i}` })))
}
