/**
 * YouTube rules: only through the IFrame Player API on youtube-nocookie.com, plays inline, at least
 * 200 × 200, and a video that won't embed (errors 101 and 150) offers "Open in YouTube".
 */
import { describe, expect, it } from 'vitest'
import { MIN_PLAYER_PX, YT_API, YT_HOST, errorKind, nearestRate, parseYouTubeId, playerVars, watchUrl } from '../../src/media/youtube-util'

describe('YouTube rules', () => {
  it('embeds from youtube-nocookie.com through the IFrame Player API, inline', () => {
    expect(YT_HOST).toBe('https://www.youtube-nocookie.com')
    expect(YT_API).toBe('https://www.youtube.com/iframe_api')
    const vars = playerVars('https://example.test')
    expect(vars.playsinline).toBe(1)
    expect(vars.enablejsapi).toBe(1)
    expect(vars.origin).toBe('https://example.test')
    expect(vars.rel).toBe(0)
    expect(MIN_PLAYER_PX).toBe(200)
  })

  it('reads a video id from whatever a grown-up pastes', () => {
    const id = 'XD00TJ-6WSw'
    for (const input of [
      id,
      ` ${id} `,
      `https://www.youtube.com/watch?v=${id}`,
      `https://www.youtube.com/watch?feature=share&v=${id}&t=42s`,
      `https://m.youtube.com/watch?v=${id}`,
      `https://youtu.be/${id}?si=abc`,
      `https://www.youtube.com/embed/${id}`,
      `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
      `https://www.youtube.com/shorts/${id}`,
      `https://music.youtube.com/watch?v=${id}`,
      `youtube.com/watch?v=${id}`,
    ])
      expect(parseYouTubeId(input), input).toBe(id)
    for (const bad of ['', 'hello', 'https://example.com/watch?v=XD00TJ-6WSw', 'XD00TJ-6WS', 'XD00TJ-6WSw1']) expect(parseYouTubeId(bad), bad).toBeNull()
  })

  it('links to the video on YouTube when it will not embed', () => {
    expect(watchUrl('XD00TJ-6WSw')).toBe('https://www.youtube.com/watch?v=XD00TJ-6WSw')
    expect(errorKind(101)).toBe('blocked')
    expect(errorKind(150)).toBe('blocked')
    expect(errorKind(100)).toBe('missing')
    expect(errorKind(2)).toBe('other')
    expect(errorKind(5)).toBe('other')
  })

  it('uses the nearest speed the player offers', () => {
    const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
    expect(nearestRate(0.75, rates)).toBe(0.75)
    expect(nearestRate(0.6, rates)).toBe(0.5)
    expect(nearestRate(0.65, rates)).toBe(0.75)
    expect(nearestRate(0.9, rates)).toBe(1)
    expect(nearestRate(0.8, [])).toBe(0.8)
  })
})
