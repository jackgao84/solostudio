/**
 * Honest video messages (version 1.3).
 *  - "Videos need the internet" only when the iPad is offline.
 *  - Online, but YouTube's player didn't load (its script, or the player itself within a time
 *    limit): she is told the video didn't load, with Try again and Open in YouTube, and to ask a
 *    grown-up to check YouTube isn't blocked on this iPad.
 *  - A video YouTube won't play inside apps, or can't find, is as before (Open in YouTube; a grown-up
 *    can swap it).
 *  - Test YouTube in the grown-ups' area says which case it is.
 */
import { describe, expect, it } from 'vitest'
import { KID_COPY } from '../../src/content/kid'
import { READY_TIMEOUT_MS } from '../../src/media/youtube'
import { loadFailure } from '../../src/media/youtube-util'
import { YOUTUBE_TEST_WORDS, problemPanel, youTubeTestResult, type VideoProblem } from '../../src/model/video-problems'

const P = KID_COPY.practice
const ALL: VideoProblem[] = ['offline', 'unloaded', 'blocked', 'missing', 'other']

describe('why a video didn’t load', () => {
  it('is "offline" only when the iPad is offline; online, the player simply didn’t load', () => {
    expect(loadFailure(false)).toBe('offline')
    expect(loadFailure(true)).toBe('unloaded')
  })

  it('gives the player a fair time to load before saying so', () => {
    expect(READY_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000)
    expect(READY_TIMEOUT_MS).toBeLessThanOrEqual(30_000)
  })
})

describe('what she sees', () => {
  it('says videos need the internet only when the iPad is offline', () => {
    const offline = problemPanel('offline')
    expect(offline.text).toBe(P.videoOffline)
    expect(offline.text).toMatch(/Videos need the internet/)
    for (const k of ALL.filter((k) => k !== 'offline')) {
      const p = problemPanel(k)
      expect(`${p.text} ${p.note ?? ''}`, k).not.toMatch(/internet/i)
    }
  })

  it('online but not loaded: the video didn’t load, Try again, Open in YouTube, and ask a grown-up to check YouTube isn’t blocked', () => {
    const p = problemPanel('unloaded')
    expect(p.text).toBe(P.videoNotLoaded)
    expect(p.text).toMatch(/didn’t load/)
    expect(p.tryAgain).toBe(true)
    expect(p.openInYouTube).toBe(true)
    expect(p.note).toBe(P.videoAskGrownUp)
    expect(p.note).toMatch(/grown-up/)
    expect(p.note).toMatch(/YouTube isn’t blocked on this iPad/)
    expect(P.tryAgain).toBe('Try again')
  })

  it('a video YouTube won’t play here is as before: Open in YouTube, and a grown-up can swap it', () => {
    for (const k of ['blocked', 'missing'] as const) {
      const p = problemPanel(k)
      expect(p.openInYouTube, k).toBe(true)
      expect(p.note, k).toBe(P.swapNote)
    }
    expect(problemPanel('blocked').text).toBe(P.videoBlocked)
    expect(problemPanel('missing').text).toBe(P.videoMissing)
    expect(problemPanel('other').tryAgain).toBe(true)
  })
})

describe('Test YouTube in the grown-ups’ area', () => {
  it('says which case it is', () => {
    expect(youTubeTestResult('ready')).toBe('works')
    expect(youTubeTestResult('offline')).toBe('offline')
    expect(youTubeTestResult('unloaded')).toBe('blocked')
    for (const k of ['blocked', 'missing', 'other'] as const) expect(youTubeTestResult(k), k).toBe('video')
  })

  it('in plain words for a grown-up', () => {
    expect(YOUTUBE_TEST_WORDS.works).toMatch(/works/i)
    expect(YOUTUBE_TEST_WORDS.offline).toMatch(/offline/i)
    expect(YOUTUBE_TEST_WORDS.blocked).toMatch(/online/i)
    expect(YOUTUBE_TEST_WORDS.blocked).toMatch(/blocked/i)
    expect(YOUTUBE_TEST_WORDS.blocked).toMatch(/Screen Time/)
    expect(YOUTUBE_TEST_WORDS.video).toMatch(/Videos/)
  })
})
