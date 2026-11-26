/** Pieces every one of her screens uses: the screen frame, the top bar, the block timer pill. */
import { takeCelebration } from '../../app/celebrate'
import { go, getActiveBlock, today } from '../../app/ctx'
import { blockCopy } from '../../content/blocks'
import { KID_COPY } from '../../content/kid'
import { todayPlan } from '../../model/today'
import { save } from '../../app/ctx'
import { stepCopyFor } from '../../content/ladders'
import { stepById } from '../../model/ladders'
import { rapMode, stepSource } from '../../model/videos'
import type { Section } from '../../storage/schema'
import { button } from '../../ui/components'
import { fill, h, type Child } from '../../ui/dom'

export function kidScreen(root: HTMLElement, name: string, ...children: Child[]): HTMLElement {
  const el = h('main', { class: 'screen screen--kid', 'data-screen': name }, ...children)
  root.append(el)
  return el
}

export function todayButton(): HTMLButtonElement {
  return button(KID_COPY.nav.today, () => go('/today'), { variant: 'quiet' })
}

/** Minutes left in the block she started, as a gentle ring. Null when she isn't in a block. */
export function blockTimer(): { el: HTMLElement; stop: () => void } | null {
  const active = getActiveBlock()
  if (!active || active.date !== today()) return null
  const day = todayPlan(save(), active.date)
  const block = day?.blocks.find((b) => b.id === active.id)
  if (!block) return null
  const ring = h('span', { class: 'block-timer__ring', 'aria-hidden': 'true' })
  const text = h('span', { class: 'block-timer__text' })
  const el = h('div', { class: 'block-timer', role: 'timer' }, ring, text)
  const total = block.minutes * 60
  const tick = () => {
    const elapsed = Math.floor((Date.now() - active.startedAt) / 1000)
    const leftMin = Math.ceil(Math.max(0, total - elapsed) / 60)
    el.setAttribute('data-elapsed', String(elapsed))
    ring.style.setProperty('--p', String(Math.min(1, elapsed / total)))
    const left = leftMin >= 1 ? fill(KID_COPY.block.minutesLeft, { minutes: leftMin }) : KID_COPY.block.lessThanMinute
    text.textContent = fill(KID_COPY.block.timerLabel, { title: blockCopy(block).title, left })
    el.classList.toggle('is-over', elapsed >= total)
  }
  tick()
  const timer = window.setInterval(tick, 1000)
  return { el, stop: () => window.clearInterval(timer) }
}

export function topbar(...extra: Child[]): HTMLElement {
  // A light that just switched on (she ticked a step) shows here for a few seconds.
  const words = takeCelebration()
  const pill = words ? h('p', { class: 'celebrate', role: 'status' }, h('span', { class: 'celebrate__lamp', 'aria-hidden': 'true' }), words) : null
  if (pill) window.setTimeout(() => pill.remove(), 5000)
  return h('nav', { class: 'topbar' }, todayButton(), pill, h('span', { class: 'topbar__spacer' }), ...extra)
}

/** A rung's name and how-to for what it plays on this section (version 1.4: the rap ladder's karaoke videos or the guide). */
export function rungCopy(section: Section, stepId: string): { name: string; how: string } {
  const step = stepById(stepId)!
  return stepCopyFor(step, stepSource(step, section, save()), rapMode(save()))
}
