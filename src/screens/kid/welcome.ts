/**
 * First launch: a welcome for her with the practice room, which needs no setup (version 1.3), and the
 * grown-ups' press-and-hold to set things up. Nothing here asks her to wait for a grown-up.
 */
import { go } from '../../app/ctx'
import { gateButton } from '../../app/gate'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
import { button } from '../../ui/components'
import { h } from '../../ui/dom'
import { kidScreen } from './common'

export const welcomeScreen: Screen = (root) => {
  const W = KID_COPY.welcome
  kidScreen(
    root,
    'welcome',
    h(
      'div',
      { class: 'welcome' },
      h('div', { class: 'mirror-art', 'aria-hidden': 'true' }, ...Array.from({ length: 5 }, () => h('span'))),
      h('h1', { class: 'welcome__title' }, W.title),
      h('p', null, W.tagline),
      h('div', { class: 'welcome__go' }, button(KID_COPY.room.open, () => go('/room'), { variant: 'primary', class: 'btn--huge' })),
      gateButton(),
    ),
  )
}
