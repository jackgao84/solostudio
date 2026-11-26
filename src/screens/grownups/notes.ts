/**
 * Notes from grown-ups: a short note for her (shown on Today until she taps it), and a teacher's note
 * for each section (shown on that section's practice screens). Typed here; they stay on the iPad.
 */
import { save, sectionsInOrder, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { button } from '../../ui/components'
import { h } from '../../ui/dom'
import { grownScreen, savedNote } from './common'

export const notesScreen: Screen = (root) => {
  const d = save()
  const forHer = h('textarea', { name: 'forHer', rows: 3, maxlength: 280, 'aria-label': 'A note for her' })
  forHer.value = d.notes.forHer?.text ?? ''
  const herStatus = h('p', { class: 'for-her-status note' })
  const showStatus = () => {
    const n = save().notes.forHer
    herStatus.textContent = !n ? 'No note on her Today screen.' : n.seen ? 'She has seen it (she tapped Got it).' : 'Showing on her Today screen until she taps Got it.'
  }
  showStatus()
  const herSaved = h('div', { class: 'form-status' })

  const sections = sectionsInOrder()
  const boxes = sections.map((s) => {
    const t = h('textarea', { name: `teacher-${s.id}`, rows: 2, maxlength: 400, 'aria-label': `Teacher’s note for ${s.name}` })
    t.value = d.notes.teacher[s.id] ?? ''
    return { s, t }
  })
  const teacherSaved = h('div', { class: 'form-status' })

  grownScreen(
    root,
    'grownups-notes',
    'Notes',
    '/grownups',
    h(
      'section',
      { class: 'card stack' },
      h('h2', null, 'A note for her'),
      h('p', { class: 'note' }, 'A short note shows at the top of her Today screen until she taps Got it.'),
      forHer,
      herStatus,
      herSaved,
      h(
        'div',
        { class: 'row' },
        button(
          'Show this on her Today screen',
          () => {
            const text = forHer.value.trim()
            update((x) => (x.notes.forHer = text ? { text, at: new Date().toISOString(), seen: false } : null))
            showStatus()
            herSaved.replaceChildren(savedNote(text ? 'Saved. It shows on her Today screen.' : 'Cleared.'))
          },
          { variant: 'primary' },
        ),
      ),
    ),
    h(
      'section',
      { class: 'card stack' },
      h('h2', null, 'Teacher’s notes'),
      h('p', { class: 'note' }, 'One note per section, shown on that section’s practice screens. Leave a box empty for no note.'),
      ...(boxes.length ? boxes.map(({ s, t }) => h('label', { class: 'field' }, h('span', null, s.name), t)) : [h('p', { class: 'note' }, 'Add sections first (Sections).')]),
      teacherSaved,
      boxes.length
        ? h(
            'div',
            { class: 'row' },
            button(
              'Save teacher notes',
              () => {
                update((x) => {
                  const next: Record<string, string> = {}
                  for (const { s, t } of boxes) if (t.value.trim()) next[s.id] = t.value.trim()
                  x.notes.teacher = next
                })
                teacherSaved.replaceChildren(savedNote('Saved.'))
              },
              { variant: 'primary' },
            ),
          )
        : null,
    ),
  )
}
