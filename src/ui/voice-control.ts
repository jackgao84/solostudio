/**
 * The voice control (version 1.4), wherever her track plays: "{singer}’s voice" with Off, Light and
 * Full (or only Off and Light before Recording and Showtime begin). It only turns the voice up or
 * down: the music never moves. With her track on the iPad but no guide file yet, it is one line
 * telling a grown-up how to add one; with no track (a video standing in), there is no control.
 */
import { KID_COPY } from '../content/kid'
import { guideReady, voiceTitle } from '../model/guide'
import type { SaveData, VoiceLevel } from '../storage/schema'
import { VOICE_LEVELS } from '../storage/schema'
import { isGuided } from '../media/guided'
import type { Player } from '../media/player'
import { h } from './dom'

const V = KID_COPY.voice
const WORDS: Record<VoiceLevel, string> = { off: V.off, light: V.light, full: V.full }

export interface VoiceControl {
  el: HTMLElement
  /** The level she picked (or started at). */
  level(): VoiceLevel
  /** The player it turns up or down (her track may load after the control is drawn). */
  attach(p: Player | null): void
}

/** The control for her track, or null when her track isn't on the iPad. */
export function voiceControl(save: Pick<SaveData, 'guide' | 'track'>, start: VoiceLevel, choices: readonly VoiceLevel[] = VOICE_LEVELS): VoiceControl | null {
  if (!save.track.mediaId) return null
  if (!guideReady(save)) {
    const el = h('p', { class: 'voice-control voice-control--none note' }, V.noGuide)
    return { el, level: () => 'off', attach: () => undefined }
  }
  let level: VoiceLevel = choices.includes(start) ? start : choices[0]
  let player: Player | null = null
  const title = voiceTitle(save.guide.singer)
  const group = h('div', { role: 'radiogroup', 'aria-label': title, class: 'chips voice-control__levels' })
  const draw = () => {
    for (const c of Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]'))) c.setAttribute('aria-checked', c.dataset.level === level ? 'true' : 'false')
  }
  for (const l of choices) {
    const chip = h('button', { type: 'button', role: 'radio', class: 'chip', 'data-level': l, 'aria-checked': 'false' }, WORDS[l])
    chip.addEventListener('click', () => {
      level = l
      if (isGuided(player)) player.setVoice(l)
      draw()
    })
    group.append(chip)
  }
  draw()
  const el = h('div', { class: 'voice-control', 'data-level': level }, h('span', { class: 'voice-control__title' }, title), group)
  return {
    el,
    level: () => level,
    attach: (p) => {
      player = p
      if (isGuided(p)) p.setVoice(level)
    },
  }
}
