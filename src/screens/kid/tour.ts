/**
 * The first-run tour for her: five short slides, about six seconds each (about 30 seconds in all),
 * moving on by themselves and read out loud. Next moves on sooner; she can skip it. At the end,
 * "Let's go" takes her to Today. Offered on Today until she takes it or says not now.
 */
import { go, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { hush, say } from '../../audio/voice'
import { KID_COPY } from '../../content/kid'
import { button } from '../../ui/components'
import { h } from '../../ui/dom'
import { kidScreen } from './common'

const T = KID_COPY.tour
export const SLIDE_MS = 6000
const SLIDES = [T.slide1, T.slide2, T.slide3, T.slide4, T.slide5]

export const tourScreen: Screen = (root) => {
  const el = kidScreen(root, 'tour', h('h1', null, T.title))
  const body = h('div', { class: 'tour-body' })
  const dots = h('div', { class: 'tour-dots', 'aria-hidden': 'true' }, ...SLIDES.map(() => h('span')))
  el.append(body, dots)
  let i = -1
  let timer = 0
  const finish = () => {
    update((d) => {
      d.tour.seen = true
    })
    go('/today')
  }
  const show = (n: number) => {
    window.clearTimeout(timer)
    i = n
    Array.from(dots.children).forEach((d, k) => d.classList.toggle('is-on', k <= i))
    if (i >= SLIDES.length) {
      say(T.end)
      body.replaceChildren(h('div', { class: 'tour-end tour-slide', 'data-slide': 'end' }, h('p', { class: 'tour-text' }, T.end)), h('div', { class: 'answer main-actions' }, button(T.go, finish, { variant: 'primary', class: 'btn--huge' })))
      return
    }
    say(SLIDES[i])
    body.replaceChildren(
      h('div', { class: 'tour-slide', 'data-slide': String(i + 1) }, h('div', { class: `tour-art tour-art--${i + 1}`, 'aria-hidden': 'true' }, h('span'), h('span'), h('span')), h('p', { class: 'tour-text' }, SLIDES[i])),
      h('div', { class: 'row' }, button(T.next, () => show(i + 1), { class: 'btn--big' }), button(T.skip, finish, { variant: 'quiet' })),
    )
    timer = window.setTimeout(() => show(i + 1), SLIDE_MS)
  }
  show(0)
  return () => {
    window.clearTimeout(timer)
    hush()
  }
}
