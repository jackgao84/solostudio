/** The Showtime routine: how many breaths backstage, and how long she needs to walk from the iPad to her spot. */
import { save, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { DEFAULT_BREATHS, DEFAULT_WALK_ON_SECONDS } from '../../storage/schema'
import { button, toggle } from '../../ui/components'
import { h } from '../../ui/dom'
import { field, grownScreen, savedNote } from './common'

export const showtimeSettingsScreen: Screen = (root) => {
  const st = save().showtime
  const breaths = h('input', { name: 'breaths', type: 'number', min: 1, max: 5, step: 1, inputmode: 'numeric', value: String(st.breaths) })
  const walk = h('input', { name: 'walkOnSeconds', type: 'number', min: 3, max: 30, step: 1, inputmode: 'numeric', value: String(st.walkOnSeconds) })
  const status = h('div', { class: 'form-status' })
  grownScreen(
    root,
    'grownups-showtime',
    'Showtime routine',
    '/grownups',
    h(
      'section',
      { class: 'card stack' },
      h(
        'p',
        null,
        'Showtime runs the whole routine: backstage breathing with a circle (4 seconds in, 6 out), “I’m excited!”, a countdown to walk from the iPad to her spot, the opening pose held for a spoken “5, 6, 7, 8”, her track, the ending pose, a bow, applause and walking off. She can also practise the walk-on and the bow on their own.',
      ),
      h('div', { class: 'form-grid' }, field('Breaths backstage', breaths, `1 to 5 (default ${DEFAULT_BREATHS})`), field('Seconds to walk to her spot', walk, `Time it from the iPad to where she starts (default ${DEFAULT_WALK_ON_SECONDS}).`)),
      toggle('Audience sound (a gentle crowd and applause, never during her track)', save().sound.audience, (on) => update((d) => (d.sound.audience = on))),
      status,
      h(
        'div',
        { class: 'row' },
        button(
          'Save routine',
          () => {
            const n = (el: HTMLInputElement, lo: number, hi: number, def: number) => Math.min(hi, Math.max(lo, Math.round(Number(el.value) || def)))
            update((d) => {
              d.showtime.breaths = n(breaths, 1, 5, DEFAULT_BREATHS)
              d.showtime.walkOnSeconds = n(walk, 3, 30, DEFAULT_WALK_ON_SECONDS)
            })
            breaths.value = String(save().showtime.breaths)
            walk.value = String(save().showtime.walkOnSeconds)
            status.replaceChildren(savedNote('Saved.'))
          },
          { variant: 'primary' },
        ),
      ),
    ),
  )
}
