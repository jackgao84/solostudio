/**
 * Her stage: each section a lighting rig whose lights switch on as she ticks steps (all on for show
 * day), never a score; she can name the stage. And each section's page with its three ladders.
 */
import { go, save, sectionById, sectionsInOrder, today, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
import { LADDER_COPY } from '../../content/ladders'
import { LADDERS, LADDER_IDS } from '../../model/ladders'
import { logShaky } from '../../model/activity'
import { clearShaky, dueItems, markShaky, progressOf } from '../../model/progress'
import { stageRigs } from '../../model/stage'
import { button, toggle } from '../../ui/components'
import { fill, h } from '../../ui/dom'
import { kidScreen, rungCopy, topbar } from './common'

const S = KID_COPY.sections

export const sectionsScreen: Screen = (root) => {
  const d = save()
  const el = kidScreen(root, 'sections', topbar(button(S.nameStage, () => go('/my-stage'), { variant: 'quiet' })))
  const sections = sectionsInOrder()
  const { rigs, allOn } = stageRigs(d, today())
  el.append(
    h(
      'header',
      { class: 'stage-head' },
      h('h1', { class: 'stage-name' }, d.stage.name || S.stageTitle),
      h('p', { class: 'note' }, allOn ? S.showDayLights : S.stageNote),
    ),
  )
  if (!sections.length) {
    el.append(h('p', { class: 'note' }, S.none))
    return
  }
  // Her stage: one lighting rig per section, a light for every ladder step she has ticked.
  el.append(
    h(
      'div',
      { class: `stage-lights section-cards${allOn ? ' is-show-day' : ''}` },
      ...rigs.map((r) => {
        const p = progressOf(save().progress, r.sectionId)
        return h(
          'article',
          { class: 'section-card card' },
          h('div', { class: 'rig', 'data-section': r.sectionId, 'aria-hidden': 'true' }, h('span', { class: 'rig__bar' }), h('div', { class: 'rig__lamps' }, ...r.lights.map((l) => h('span', { class: `lamp lamp--${l.ladder}${l.on ? ' is-on' : ''}` })))),
          h('h2', null, r.name),
          p.shaky ? h('p', { class: 'shaky-note' }, S.shaky) : null,
          button(fill(S.open, { section: r.name }), () => go(`/section/${r.sectionId}`)),
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
            const b = button([done ? h('span', { class: 'rung__tick', 'aria-hidden': 'true' }, '✓') : null, rungCopy(s, st.id).name], () => go(`/practice/${s.id}/${st.id}`), { class: `rung${done ? ' is-done' : ''}` })
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
      h('div', { class: 'row' }, button(S.missingWords, () => go(`/quiz/${s.id}/words`)), button(S.buildLine, () => go(`/quiz/${s.id}/build`)), button(S.countsTest, () => go(`/quiz/${s.id}/counts`))),
      toggle(S.shaky, p.shaky, (on) =>
        update((d) => {
          const cur = progressOf(d.progress, s.id)
          d.progress[s.id] = on ? markShaky(cur, today()) : clearShaky(cur)
          if (on) logShaky(d, today(), s.id)
        }),
      ),
      h('p', { class: 'note' }, S.shakyNote),
      h('div', { class: 'row' }, button(S.record, () => go(`/record/${s.id}`))),
    ),
  )
}
