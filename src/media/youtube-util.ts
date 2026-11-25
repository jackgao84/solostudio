/**
 * YouTube rules, kept in one place: only the IFrame Player API, on youtube-nocookie.com, playing
 * inline, at least 200 × 200. The app never downloads a video, never extracts audio and shows no
 * thumbnails. A video that won't embed (errors 101 and 150) gets an "Open in YouTube" link instead.
 */
export const YT_HOST = 'https://www.youtube-nocookie.com'
export const YT_API = 'https://www.youtube.com/iframe_api'
export const MIN_PLAYER_PX = 200

export function playerVars(origin: string): Record<string, string | number> {
  return { playsinline: 1, rel: 0, enablejsapi: 1, fs: 0, iv_load_policy: 3, origin }
}

export function watchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`
}

const ID = /^[A-Za-z0-9_-]{11}$/
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtube-nocookie.com', 'youtube-nocookie.com'])

/** A video id from an id, a watch link, a short link, an embed link or a Shorts link. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim()
  if (ID.test(s)) return s
  let url: URL
  try {
    url = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`)
  } catch {
    return null
  }
  if (!HOSTS.has(url.hostname.toLowerCase())) return null
  const v = url.searchParams.get('v')
  if (v && ID.test(v)) return v
  const parts = url.pathname.split('/').filter(Boolean)
  if (url.hostname.toLowerCase() === 'youtu.be' && parts[0] && ID.test(parts[0])) return parts[0]
  if (['embed', 'shorts', 'live', 'v'].includes(parts[0]) && parts[1] && ID.test(parts[1])) return parts[1]
  return null
}

export type ErrorKind = 'blocked' | 'missing' | 'other'

export function errorKind(code: number): ErrorKind {
  if (code === 101 || code === 150) return 'blocked'
  if (code === 100) return 'missing'
  return 'other'
}

export function nearestRate(rate: number, available: readonly number[]): number {
  if (!available.length) return rate
  return available.reduce((best, r) => (Math.abs(r - rate) < Math.abs(best - rate) - 1e-9 ? r : best), available[0])
}
