/** Links to the family's other apps: Face Lab (expressions) and Up Anyway (brave things). */
import { save, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { DEFAULT_FACE_LAB_URL, DEFAULT_UP_ANYWAY_URL } from '../../storage/schema'
import { button } from '../../ui/components'
import { h } from '../../ui/dom'
import { field, grownScreen, savedNote } from './common'

export const linksScreen: Screen = (root) => {
  const s = save().settings
  const face = h('input', { name: 'faceLabUrl', type: 'url', value: s.faceLabUrl, autocomplete: 'off' })
  const up = h('input', { name: 'upAnywayUrl', type: 'url', value: s.upAnywayUrl, autocomplete: 'off' })
  const status = h('div', { class: 'form-status' })
  const ok = (v: string) => {
    try {
      return new URL(v).protocol === 'https:'
    } catch {
      return false
    }
  }
  grownScreen(
    root,
    'grownups-links',
    'Links',
    '/grownups',
    h(
      'section',
      { class: 'card stack' },
      h('p', null, 'The performing lesson links to these. They open in Safari.'),
      field('Face Lab (expressions)', face, `Default: ${DEFAULT_FACE_LAB_URL}`),
      field('Up Anyway (brave things)', up, `Default: ${DEFAULT_UP_ANYWAY_URL}`),
      status,
      h(
        'div',
        { class: 'row' },
        button('Save links', () => {
          const f = face.value.trim() || DEFAULT_FACE_LAB_URL
          const u = up.value.trim() || DEFAULT_UP_ANYWAY_URL
          if (!ok(f) || !ok(u)) return status.replaceChildren(h('p', { class: 'import-error' }, 'Links need to start with https://'))
          update((d) => {
            d.settings.faceLabUrl = f
            d.settings.upAnywayUrl = u
          })
          status.replaceChildren(savedNote('Saved.'))
        }, { variant: 'primary' }),
      ),
    ),
  )
}
