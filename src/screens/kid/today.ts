/**
 * Today: the countdown, the phase, and the day's blocks with a gentle "about N min" each. She can
 * move blocks (warm-up, water and cool-down stay put); a move that would strain her voice or skip
 * water is refused with a kind note. Checks that are due are listed, shaky ones first.
 */
import { go, save, sectionsInOrder, today, update } from '../../app/ctx'
import { startSession, todaysItems } from '../../app/session'
import { gateButton } from '../../app/gate'
import type { Screen } from '../../app/router'
import { applyUpdateIfSafe, onUpdateReady } from '../../app/sw-register'
import { PHASE_COPY, blockCopy } from '../../content/blocks'
import { KID_COPY } from '../../content/kid'
import { LADDER_COPY } from '../../content/ladders'
import { daysBetween } from '../../model/dates'
import { PINNED_TYPES, applyOrder, moveBlock, planDay, planInputFrom, type Block } from '../../model/plan'
import { dueItems } from '../../model/progress'
import { button } from '../../ui/components'
import { fill, h } from '../../ui/dom'
import { kidScreen } from './common'

const T = KID_COPY.today

function countdownText(days: number, show: string): string {
  if (days <= 0) return fill(T.countdownToday, { show })
  if (days === 1) return fill(T.countdownOne, { show })
  return fill(T.countdown, { days, show })
}

export const todayScreen: Screen = (root) => {
  const d = save()
  const t = today()
  const el = kidScreen(root, 'today')
  const updateSlot = h('div', { class: 'update-banner', hidden: true })
  const stopUpdates = onUpdateReady(() => {
    updateSlot.hidden = false
    updateSlot.replaceChildren(button(KID_COPY.nav.newVersion, () => applyUpdateIfSafe(), { variant: 'primary' }))
  })

  const head = h('header', { class: 'today__head' }, h('h1', null, d.profile.name ? fill(T.hello, { name: d.profile.name }) : T.helloNoName))
  el.append(head, updateSlot)
  const forHer = d.notes.forHer
  if (forHer && !forHer.seen) {
    const card = h(
      'section',
      { class: 'note-for-her card', role: 'note' },
      h('h2', null, T.noteTitle),
      h('p', { class: 'note-for-her__text' }, forHer.text),
      button(T.noteGotIt, () => {
        update((s) => {
          if (s.notes.forHer) s.notes.forHer.seen = true
        })
        card.remove()
      }),
    )
    el.append(card)
  }

  const input = planInputFrom(d)
  const showName = d.show?.name || T.showFallback
  if (!input || !d.show) {
    el.append(h('p', { class: 'note' }, T.noPlan))
  } else if (t > d.show.date) {
    el.append(h('p', { class: 'show-over' }, T.showOver))
  } else {
    const day = planDay(input, t < input.startDate ? input.startDate : t)
    head.append(h('p', { class: 'countdown' }, countdownText(daysBetween(t, d.show.date), showName)))
    if (day) {
      head.append(h('p', { class: 'phase' }, PHASE_COPY[day.phase].name))
      // One main action: the guided session through today's blocks.
      if (todaysItems().length) el.append(h('div', { class: 'today__start' }, button(T.startPractice, () => startSession(), { variant: 'primary', class: 'btn--huge' })))
      if (!d.tour.seen) el.append(tourCard())
      if (day.light && day.phase !== 'showDay') el.append(h('p', { class: 'light-day' }, T.lightDay))
      el.append(h('p', { class: 'note' }, PHASE_COPY[day.phase].about))
      if (d.sections.length === 0) el.append(h('p', { class: 'note' }, T.noSections))
      const checks = checksList()
      if (checks) el.append(checks)
      el.append(blocksList(day.blocks))
    }
  }

  el.append(
    h(
      'div',
      { class: 'nav-row' },
      button(KID_COPY.nav.showtime, () => go('/showtime')),
      button(KID_COPY.nav.sections, () => go('/sections')),
      button(KID_COPY.nav.lessons, () => go('/lessons')),
      button(KID_COPY.nav.clips, () => go('/clips')),
      button(KID_COPY.nav.sounds, () => go('/sounds'), { variant: 'quiet' }),
    ),
    h('div', { class: 'row' }, gateButton()),
  )
  return () => stopUpdates()

  function tourCard(): HTMLElement {
    const seen = () =>
      update((s) => {
        s.tour.seen = true
      })
    const card = h(
      'section',
      { class: 'tour-card card' },
      h('h2', null, T.tourTitle),
      h('p', null, T.tourHow),
      h(
        'div',
        { class: 'row' },
        button(T.tourGo, () => go('/tour')),
        button(T.tourLater, () => {
          seen()
          card.remove()
        }, { variant: 'quiet' }),
      ),
    )
    return card
  }

  function checksList(): HTMLElement | null {
    const names = new Map(sectionsInOrder().map((s) => [s.id, s.name]))
    const items = dueItems(save().progress, sectionsInOrder().map((s) => s.id), t).filter((i) => names.has(i.sectionId))
    if (!items.length) return null
    return h(
      'section',
      { class: 'checks card' },
      h('h2', null, T.checksTitle),
      h(
        'div',
        { class: 'row' },
        ...items.map((i) => {
          const label = fill(T.checkLine, { section: names.get(i.sectionId) ?? '', ladder: LADDER_COPY[i.ladder].name }) + (i.shaky ? ` (${T.shakyTag})` : '')
          return button(label, () => go(`/section/${i.sectionId}`))
        }),
      ),
    )
  }

  function blocksList(planned: Block[]): HTMLElement {
    const wrap = h('section', { class: 'today__blocks' }, h('h2', null, T.practiceTitle))
    const note = h('p', { class: 'move-note', role: 'status', hidden: true })
    const list = h('ol', { class: 'blocks' })
    const allDone = h('p', { class: 'note', hidden: true }, T.allDone)
    wrap.append(note, list, allDone)
    const names = new Map(save().sections.map((s) => [s.id, s.name]))
    const draw = () => {
      const state = save().days[t] ?? { order: [], done: [] }
      const blocks = applyOrder(planned, state.order)
      list.replaceChildren(
        ...blocks.map((b) => {
          const done = state.done.includes(b.id)
          const title = blockCopy(b).title
          const focus = b.sectionIds.map((id) => names.get(id)).filter(Boolean).join(', ')
          const actions = h('div', { class: 'block__actions' }, button(T.start, () => go(`/block/${b.id}`), { label: fill(T.startLabel, { title }) }))
          if (!PINNED_TYPES.includes(b.type)) {
            actions.append(button('▲', () => move(blocks, b.id, -1), { label: T.moveUp, class: 'move' }), button('▼', () => move(blocks, b.id, 1), { label: T.moveDown, class: 'move' }))
          }
          return h(
            'li',
            { class: `block${done ? ' is-done' : ''}`, 'data-block-id': b.id, 'data-type': b.type, 'data-drill': b.drill },
            h(
              'div',
              { class: 'block__info' },
              h('p', { class: 'block__title' }, title),
              h('p', { class: 'block__meta' }, fill(T.about, { minutes: b.minutes })),
              focus ? h('p', { class: 'block__meta' }, fill(T.sectionsFocus, { sections: focus })) : null,
              b.headset ? h('p', { class: 'headset-note' }, T.headset) : null,
              done ? h('p', { class: 'block__done' }, T.doneMark) : null,
            ),
            actions,
          )
        }),
      )
      allDone.hidden = !blocks.every((b) => state.done.includes(b.id))
    }
    const move = (blocks: Block[], id: string, dir: -1 | 1) => {
      const r = moveBlock(blocks, id, dir)
      if (!r.ok) {
        if (r.reason === 'voice' || r.reason === 'water') {
          note.textContent = r.reason === 'voice' ? T.moveVoice : T.moveWater
          note.hidden = false
        }
        return
      }
      note.hidden = true
      update((s) => {
        const day = (s.days[t] ??= { order: [], done: [] })
        day.order = r.blocks.map((b) => b.id)
      })
      draw()
    }
    draw()
    return wrap
  }
}
