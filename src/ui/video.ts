/**
 * Putting a source on screen: her track (or a YouTube video standing in for it), a YouTube
 * reference, or a local video. A video that can't play is replaced by a calm panel; one that won't
 * embed offers "Open in YouTube".
 */
import { KID_COPY } from '../content/kid'
import { localVideoPlayer } from '../media/local-video'
import type { Player } from '../media/player'
import { trackPlayer } from '../media/track'
import { youTubePlayer } from '../media/youtube'
import { watchUrl, type ErrorKind } from '../media/youtube-util'
import type { Reference, SaveData } from '../storage/schema'
import { h } from './dom'

const P = KID_COPY.practice

export function videoErrorPanel(kind: ErrorKind | 'offline', videoId: string): HTMLElement {
  const text = kind === 'blocked' ? P.videoBlocked : kind === 'missing' ? P.videoMissing : kind === 'offline' ? P.videoOffline : P.videoOther
  return h(
    'div',
    { class: 'yt-error', role: 'status' },
    h('p', null, text),
    kind === 'offline' ? null : h('a', { class: 'btn open-in-youtube', href: watchUrl(videoId), target: '_blank', rel: 'noopener noreferrer' }, P.openInYouTube),
    kind === 'offline' ? null : h('p', { class: 'note' }, P.swapNote),
  )
}

/** A YouTube player in `box`, swapped for the error panel if it can't play. */
export function youTubeIn(box: HTMLElement, videoId: string, onFail?: () => void, start?: number): Player {
  return youTubePlayer(box, videoId, {
    start,
    onError: (kind) => {
      box.append(videoErrorPanel(kind, videoId))
      onFail?.()
    },
  })
}

export function referencePlayer(box: HTMLElement, ref: Reference, onFail?: () => void): Player {
  if (ref.kind === 'local' && ref.mediaId) return localVideoPlayer(box, ref.mediaId, ref.mirror)
  return youTubeIn(box, ref.youtubeId, onFail)
}

export interface TrackSource {
  player: Player
  standIn: boolean
}

/** Her track if it's on this iPad, else the stand-in video, else null. */
export async function trackSource(box: HTMLElement, d: SaveData, onFail?: () => void): Promise<TrackSource | null> {
  if (d.track.mediaId) {
    const p = trackPlayer(d.track.mediaId)
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
