/** Pieces every one of her screens uses: the screen frame, the top bar, the block timer pill. */
import { go, getActiveBlock, today } from '../../app/ctx'
import { BLOCK_COPY } from '../../content/blocks'
import { KID_COPY } from '../../content/kid'
import { planDay, planInputFrom } from '../../model/plan'
import { save } from '../../app/ctx'
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
  const input = planInputFrom(save())
  const day = input ? planDay(input, active.date) : null
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
    text.textContent = fill(KID_COPY.block.timerLabel, { title: BLOCK_COPY[block.type].title, left })
    el.classList.toggle('is-over', elapsed >= total)
  }
  tick()
  const timer = window.setInterval(tick, 1000)
  return { el, stop: () => window.clearInterval(timer) }
}

export function topbar(...extra: Child[]): HTMLElement {
  return h('nav', { class: 'topbar' }, todayButton(), h('span', { class: 'topbar__spacer' }), ...extra)
}
