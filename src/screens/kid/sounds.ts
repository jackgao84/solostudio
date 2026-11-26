/**
 * Her sounds: spoken cues and sound effects, each with its own on/off and volume (five steps), and a
 * "Try it" for each. Cues are never spoken over her music, whatever the volume.
 */
import { save, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { lightOn } from '../../audio/sfx'
import { say } from '../../audio/voice'
import { KID_COPY } from '../../content/kid'
import { button, toggle } from '../../ui/components'
import { fill, h } from '../../ui/dom'
import { kidScreen, topbar } from './common'

const S = KID_COPY.sounds
const STEP = 0.2

export const soundsScreen: Screen = (root) => {
  const el = kidScreen(root, 'sounds', topbar(), h('h1', null, S.title))
  const card = (kind: 'voice' | 'effects') => {
    const isVoice = kind === 'voice'
    const get = () => (isVoice ? { on: save().sound.voiceOn, v: save().sound.voiceVolume } : { on: save().sound.effectsOn, v: save().sound.effectsVolume })
    const meter = h('span', { class: 'meter', 'aria-hidden': 'true' }, ...Array.from({ length: 5 }, () => h('span')))
    const label = h('p', { class: 'volume-label' })
    const draw = () => {
      const { on, v } = get()
      const n = Math.round(v / STEP)
      Array.from(meter.children).forEach((c, i) => c.classList.toggle('is-on', on && i < n))
      label.textContent = on ? fill(S.volume, { n }) : S.muted
    }
    const set = (fn: (cur: number) => number) => {
      update((d) => {
        const cur = isVoice ? d.sound.voiceVolume : d.sound.effectsVolume
        const next = Math.round(Math.min(1, Math.max(STEP, fn(cur))) * 10) / 10
        if (isVoice) d.sound.voiceVolume = next
        else d.sound.effectsVolume = next
      })
      draw()
    }
    const sw = toggle(isVoice ? S.voice : S.effects, get().on, (on) => {
      update((d) => {
        if (isVoice) d.sound.voiceOn = on
        else d.sound.effectsOn = on
      })
      draw()
    })
    draw()
    return h(
      'section',
      { class: 'sound-card card stack', 'data-sound': kind },
      h('h2', null, isVoice ? S.voice : S.effects),
      h('p', { class: 'note' }, isVoice ? S.voiceHow : S.effectsHow),
      sw,
      h('div', { class: 'row volume-row' }, button(S.quieter, () => set((v) => v - STEP)), meter, label, button(S.louder, () => set((v) => v + STEP))),
      h('div', { class: 'row' }, button(S.tryIt, () => (isVoice ? say(KID_COPY.cues.countIn) : lightOn()), { variant: 'quiet' })),
    )
  }
  el.append(h('div', { class: 'sound-cards' }, card('voice'), card('effects')))
}
