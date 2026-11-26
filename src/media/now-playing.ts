/**
 * Is anything playing? Spoken cues are only ever said between reps, never over her track or a video,
 * so the voice asks here first. Her track and local videos are media elements on the page; YouTube
 * players are kept in a list while they exist (their state isn't visible from the page).
 */
import type { Player } from './player'

const youTube = new Set<Player>()

/** Keep a YouTube player in the list until it is destroyed. */
export function trackYouTube(p: Player): Player {
  youTube.add(p)
  const destroy = p.destroy
  p.destroy = () => {
    youTube.delete(p)
    destroy()
  }
  return p
}

/** Her track, a video or a YouTube player is playing (the camera preview doesn't count). */
export function mediaPlaying(): boolean {
  if (typeof document === 'undefined') return false
  for (const el of Array.from(document.querySelectorAll<HTMLMediaElement>('audio, video'))) {
    if (el.classList.contains('camera-preview')) continue
    if (!el.paused && !el.ended) return true
  }
  for (const p of youTube) if (p.playing()) return true
  return false
}
