/** Her sections: each with three little ladders of ticks (never a score), and each section's page. */
import { go, save, sectionById, sectionsInOrder, today, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
import { LADDER_COPY, STEP_COPY } from '../../content/ladders'
import { LADDERS, LADDER_IDS } from '../../model/ladders'
import { clearShaky, dueItems, markShaky, progressOf } from '../../model/progress'
import { button, toggle } from '../../ui/components'
import { fill, h } from '../../ui/dom'
import { kidScreen, topbar } from './common'

const S = KID_COPY.sections

export const sectionsScreen: Screen = (root) => {
  const el = kidScreen(root, 'sections', topbar(), h('h1', null, S.title))
  const sections = sectionsInOrder()
  if (!sections.length) {
    el.append(h('p', { class: 'note' }, S.none))
    return
  }
  el.append(
    h(
      'div',
      { class: 'section-cards' },
      ...sections.map((s) => {
        const p = progressOf(save().progress, s.id)
        return h(
          'article',
          { class: 'section-card card' },
          h('h2', null, s.name),
          h('div', { class: 'mini-ladders', 'aria-hidden': 'true' }, ...LADDER_IDS.map((l) => h('div', { class: 'mini-ladder' }, ...LADDERS[l].map((st) => h('span', { class: p[l].done.includes(st.id) ? 'is-done' : '' }))))),
          p.shaky ? h('p', { class: 'shaky-note' }, S.shaky) : null,
          button(fill(S.open, { section: s.name }), () => go(`/section/${s.id}`), { variant: 'primary' }),
        )
      }),
    ),
  )
}

export const sectionScreen: Screen = (root, { params }) => {
  const s = sectionById(params.id)
  if (!s) {
    go('/sections')
    return
  }
  const el = kidScreen(root, 'section', topbar(button(KID_COPY.nav.sections, () => go('/sections'))), h('h1', null, s.name))
  const p = progressOf(save().progress, s.id)
  if (dueItems(save().progress, [s.id], today()).length) el.append(h('p', { class: 'shaky-note' }, S.checkToday))
  el.append(
    h(
      'div',
      { class: 'ladders' },
      ...LADDER_IDS.map((l) =>
        h(
          'section',
          { class: 'ladder card', 'data-ladder': l },
          h('h2', null, LADDER_COPY[l].name),
          h('p', { class: 'note' }, LADDER_COPY[l].about),
          ...LADDERS[l].map((st) => {
            const done = p[l].done.includes(st.id)
            const b = button([done ? h('span', { class: 'rung__tick', 'aria-hidden': 'true' }, '✓') : null, STEP_COPY[st.id].name], () => go(`/practice/${s.id}/${st.id}`), { class: `rung${done ? ' is-done' : ''}` })
            b.setAttribute('data-step', st.id)
            if (done) b.setAttribute('aria-description', S.rungTicked)
            return b
          }),
        ),
      ),
    ),
  )
  el.append(
    h(
      'section',
      { class: 'card stack' },
      h('h2', null, S.quickTests),
      h('div', { class: 'row' }, button(S.missingWords, () => go(`/quiz/${s.id}/words`)), button(S.countsTest, () => go(`/quiz/${s.id}/counts`))),
      toggle(S.shaky, p.shaky, (on) =>
        update((d) => {
          const cur = progressOf(d.progress, s.id)
          d.progress[s.id] = on ? markShaky(cur, today()) : clearShaky(cur)
        }),
      ),
      h('p', { class: 'note' }, S.shakyNote),
      h('div', { class: 'row' }, button(S.record, () => go(`/record/${s.id}`))),
    ),
  )
}
