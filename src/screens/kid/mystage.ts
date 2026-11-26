/** Her stage's name, its colour theme and her light stick's colour (version 1.1). */
import { go, save, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
import { STAGE_NAME_MAX, STAGE_THEMES, STICK_COLOURS, type StageTheme, type StickColour } from '../../storage/schema'
import { button } from '../../ui/components'
import { h } from '../../ui/dom'
import { applyTheme } from '../../ui/theme'
import { kidScreen, topbar } from './common'

const T = KID_COPY.stage

/** A radiogroup of chips with one already chosen. */
function picker<V extends string>(label: string, values: readonly V[], current: V, words: (v: V) => string, onPick: (v: V) => void, cls: string): HTMLElement {
  const group = h('div', { role: 'radiogroup', 'aria-label': label, class: `chips ${cls}` })
  for (const v of values) {
    const chip = h('button', { type: 'button', role: 'radio', class: `chip chip--${v}`, 'data-value': v, 'aria-checked': v === current ? 'true' : 'false' }, h('span', { class: 'chip__swatch', 'aria-hidden': 'true' }), words(v))
    chip.addEventListener('click', () => {
      for (const c of Array.from(group.querySelectorAll('[role="radio"]'))) c.setAttribute('aria-checked', c === chip ? 'true' : 'false')
      onPick(v)
    })
    group.append(chip)
  }
  return group
}

export const myStageScreen: Screen = (root) => {
  const st = save().stage
  let theme: StageTheme = st.theme
  let stick: StickColour = st.stick
  const name = h('input', { type: 'text', name: 'stageName', maxlength: STAGE_NAME_MAX, autocomplete: 'off', value: st.name, 'aria-label': T.name })
  kidScreen(
    root,
    'my-stage',
    topbar(),
    h('h1', null, T.title),
    h('label', { class: 'field' }, h('span', null, T.name), name),
    h('h2', null, T.colours),
    picker(T.colours, STAGE_THEMES, theme, (v) => T[v], (v) => {
      theme = v
      applyTheme(v)
    }, 'theme-chips'),
    h('h2', null, T.stick),
    picker(T.stick, STICK_COLOURS, stick, (v) => T[v], (v) => (stick = v), 'stick-chips'),
    h(
      'div',
      { class: 'answer' },
      button(
        T.save,
        () => {
          update((d) => {
            d.stage = { name: name.value.trim().slice(0, STAGE_NAME_MAX), theme, stick }
          })
          applyTheme(theme)
          go('/sections')
        },
        { variant: 'primary', class: 'btn--big' },
      ),
    ),
  )
  // Leaving without saving puts the saved colours back.
  return () => applyTheme(save().stage.theme)
}
