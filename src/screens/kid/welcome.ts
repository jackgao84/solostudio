/** First launch: a welcome for her, and the grown-ups' press-and-hold to set things up. */
import { gateButton } from '../../app/gate'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
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
      h('p', { class: 'note' }, W.needsGrownUp),
      gateButton(),
    ),
  )
}
