/**
 * Controls for a lesson's video (version 1.2): play and pause, slower and faster, and her own loop.
 * YouTube offers 50%, 75% and 100%; a video on the iPad goes from 50% to 100% in 5% steps.
 */
import { KID_COPY } from '../content/kid'
import type { Player } from '../media/player'
import { button } from './components'
import { fill, h } from './dom'
import { LoopButtons } from './loop'

const P = KID_COPY.practice

export function videoControls(player: Player): { el: HTMLElement; destroy: () => void } {
  let speed = 1
  let raf = 0
  const playBtn = button(P.play, () => {
    if (player.playing()) player.pause()
    else player.play()
  })
  const speedEl = h('p', { class: 'speed' }, fill(P.speed, { speed: 100 }))
  const change = (dir: -1 | 1) => {
    const steps = player.kind === 'youtube' ? [0.5, 0.75, 1] : Array.from({ length: 11 }, (_, i) => Math.round((0.5 + i * 0.05) * 100) / 100)
    const at = steps.reduce((best, r, i) => (Math.abs(r - speed) < Math.abs(steps[best] - speed) ? i : best), 0)
    speed = player.setRate(steps[Math.min(steps.length - 1, Math.max(0, at + dir))])
    speedEl.textContent = fill(P.speed, { speed: Math.round(speed * 100) })
  }
  const loop = new LoopButtons(
    () => player.time(),
    (l) => {
      if (l) {
        player.seek(l.from)
        player.play()
      }
    },
  )
  // Keep the button's word and her loop in step with the video.
  const tick = () => {
    const playing = player.playing()
    const word = playing ? P.pause : P.play
    if (playBtn.textContent !== word) playBtn.textContent = word
    if (playing && loop.loop && player.time() >= loop.loop.to) player.seek(loop.loop.from)
    raf = window.requestAnimationFrame(tick)
  }
  raf = window.requestAnimationFrame(tick)
  const el = h('div', { class: 'video-controls stack' }, h('div', { class: 'row' }, playBtn, button(P.slower, () => change(-1), { variant: 'quiet' }), speedEl, button(P.faster, () => change(1), { variant: 'quiet' })), loop.el)
  return { el, destroy: () => window.cancelAnimationFrame(raf) }
}
