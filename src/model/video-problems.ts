/**
 * Honest video messages (version 1.3). Pure, so the checks can read them.
 *  - Offline: "Videos need the internet" (and the video comes back by itself once the iPad is online).
 *  - Online, but YouTube's player didn't load: the video didn't load, Try again, Open in YouTube, and
 *    a word to ask a grown-up to check YouTube isn't blocked on this iPad.
 *  - A video YouTube won't play inside apps, or can't find: Open in YouTube; a grown-up can swap it.
 * Test YouTube (in the grown-ups' area) says which of these it is, in a grown-up's words.
 */
import { KID_COPY } from '../content/kid'
import type { ErrorKind, LoadFailure } from '../media/youtube-util'

export type VideoProblem = ErrorKind | LoadFailure

export interface ProblemPanel {
  text: string
  tryAgain: boolean
  openInYouTube: boolean
  note: string | null
}

const P = KID_COPY.practice

export function problemPanel(kind: VideoProblem): ProblemPanel {
  switch (kind) {
    case 'offline':
      return { text: P.videoOffline, tryAgain: false, openInYouTube: false, note: null }
    case 'unloaded':
      return { text: P.videoNotLoaded, tryAgain: true, openInYouTube: true, note: P.videoAskGrownUp }
    case 'blocked':
      return { text: P.videoBlocked, tryAgain: false, openInYouTube: true, note: P.swapNote }
    case 'missing':
      return { text: P.videoMissing, tryAgain: false, openInYouTube: true, note: P.swapNote }
    case 'other':
      return { text: P.videoOther, tryAgain: true, openInYouTube: true, note: P.swapNote }
  }
}

export type YouTubeTest = 'works' | 'offline' | 'blocked' | 'video'

/** What Test YouTube found: the test video got ready, or why not. */
export function youTubeTestResult(outcome: 'ready' | VideoProblem): YouTubeTest {
  if (outcome === 'ready') return 'works'
  if (outcome === 'offline') return 'offline'
  if (outcome === 'unloaded') return 'blocked'
  return 'video'
}

/** Test YouTube's answer, for a grown-up. */
export const YOUTUBE_TEST_WORDS: Record<YouTubeTest, string> = {
  works: 'YouTube works on this iPad: the test video loaded and is ready to play.',
  offline: 'This iPad is offline right now. Videos need the internet; her track, lessons and everything else still work.',
  blocked:
    'This iPad is online, but YouTube’s player didn’t load, so YouTube may be blocked on this iPad. Check Settings → Screen Time → Content & Privacy Restrictions, and any filter on your Wi-Fi or school network, then test again.',
  video: 'YouTube works, but the test video (the mirrored follow-along) won’t play inside apps. Swap it under Videos.',
}
