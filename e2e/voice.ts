/**
 * Stand-ins and readers for 1.1's spoken cues and sound effects.
 *
 * - Speech: SpeechSynthesis.prototype.speak is replaced (on the prototype: Playwright's WebKit drops
 *   overrides on instance objects) by a recorder that notes each utterance's words, volume and
 *   language, the time, and whether any media was playing at that moment: her track, a YouTube
 *   player or a video (the camera preview doesn't count). Cues must never be spoken over media.
 * - Sound effects are read from the app's debug hook (`__solostudio.sounds()`), which lists each
 *   effect actually played with its volume.
 * - `test` here is helpers' `test` with the speech stand-in added.
 */
import type { Page } from '@playwright/test'
import { test as base } from './helpers'

export interface Utterance {
  text: string
  volume: number
  lang: string
  at: number
  /** Media was playing when it was spoken. */
  overMedia: string[]
}

export interface PlayedSound {
  name: string
  at: number
  volume: number
}

const VOICE_STANDIN = () => {
  const log: unknown[] = []
  ;(window as unknown as { __voice: unknown[] }).__voice = log
  const playing = (): string[] => {
    const out: string[] = []
    const a = document.querySelector<HTMLAudioElement>('audio.track-audio')
    if (a && !a.paused && !a.ended) out.push('her track')
    const fake = (window as unknown as { __ytFake?: { players: { destroyed: boolean; playing: boolean; videoId: string }[] } }).__ytFake
    for (const p of fake?.players ?? []) if (!p.destroyed && p.playing) out.push(`youtube ${p.videoId}`)
    for (const v of Array.from(document.querySelectorAll('video'))) if (!v.paused && !v.ended && !v.classList.contains('camera-preview')) out.push(`video.${v.className}`)
    return out
  }
  if (typeof SpeechSynthesis !== 'undefined') {
    SpeechSynthesis.prototype.speak = function (u: SpeechSynthesisUtterance) {
      log.push({ text: u.text, volume: u.volume, lang: u.lang, at: performance.now(), overMedia: playing() })
    }
    SpeechSynthesis.prototype.cancel = function () {}
  }
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(VOICE_STANDIN)
    await use(context)
  },
})

/** Everything spoken so far (blank "unlock" utterances left out). */
export async function spoken(page: Page): Promise<Utterance[]> {
  const all = await page.evaluate(() => ((window as unknown as { __voice?: Utterance[] }).__voice ?? []).slice())
  return all.filter((u) => u.text.trim() !== '')
}

/** Just the words spoken so far. */
export async function words(page: Page): Promise<string[]> {
  return (await spoken(page)).map((u) => u.text)
}

/** Sound effects the app has played. */
export async function sounds(page: Page): Promise<PlayedSound[]> {
  await page.waitForFunction(() => !!(window as unknown as { __solostudio?: unknown }).__solostudio)
  return page.evaluate(() => (window as unknown as { __solostudio: { sounds(): PlayedSound[] } }).__solostudio.sounds())
}

/** Every spoken cue so far was said while no media was playing. */
export async function nothingSpokenOverMedia(page: Page): Promise<string[]> {
  return (await spoken(page)).filter((u) => u.overMedia.length).map((u) => `"${u.text}" over ${u.overMedia.join(', ')}`)
}
