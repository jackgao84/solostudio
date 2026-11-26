/** Her week: the last 7 days at a glance, for a grown-up. Counts of what she did, never how well. */
import { save, today } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { weekSummary } from '../../model/week'
import { h } from '../../ui/dom'
import { grownScreen } from './common'

const KIND: Record<string, string> = { showtime: 'Showtime', clip: 'A recording', family: 'Performing for family' }
const fmt = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

export const weekScreen: Screen = (root) => {
  const w = weekSummary(save(), today())
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  grownScreen(
    root,
    'grownups-week',
    'Her week',
    '/grownups',
    h('p', { class: 'note' }, `${fmt(w.from)} to ${fmt(w.to)}. Minutes count while a practice screen is open and she is practising.`),
    h(
      'section',
      { class: 'card week-totals' },
      h('p', { class: 'week-days' }, `Practised on ${plural(w.daysPractised, 'day', 'days')} of 7`),
      h('p', { class: 'week-minutes' }, `About ${plural(w.minutes, 'minute', 'minutes')} in all`),
      h(
        'ol',
        { class: 'week-strip', 'aria-label': 'Each day' },
        ...w.days.map((d) => h('li', { class: d.practised ? 'is-practised' : '' }, h('span', null, fmt(d.date)), h('span', null, d.practised ? `${d.minutes} min` : '—'))),
      ),
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', null, 'Ladder steps she ticked'),
      w.bySection.length
        ? h(
            'table',
            { class: 'week-table' },
            h('thead', null, h('tr', null, h('th', null, 'Section'), h('th', null, 'Steps'), h('th', null, 'Rap'), h('th', null, 'Dance'), h('th', null, 'Together'))),
            h(
              'tbody',
              null,
              ...w.bySection.map((s) =>
                h('tr', { class: 'week-section', 'data-section': s.id }, h('td', null, s.name), h('td', { class: 'week-steps' }, String(s.steps)), h('td', null, String(s.ladders.rap)), h('td', null, String(s.ladders.dance)), h('td', null, String(s.ladders.together))),
              ),
            ),
          )
        : h('p', { class: 'note' }, 'No sections yet.'),
    ),
    h(
      'section',
      { class: 'card week-shaky' },
      h('h2', null, 'Sections marked shaky'),
      w.shaky.length
        ? h('ul', null, ...w.shaky.map((s) => h('li', null, `${s.name}: ${[s.markedThisWeek ? 'marked this week' : '', s.shakyNow ? 'still shaky now' : 'solid again'].filter(Boolean).join(', ')}`)))
        : h('p', { class: 'note' }, 'None this week.'),
    ),
    h(
      'section',
      { class: 'card week-notes' },
      h('h2', null, 'Her “one thing” notes'),
      w.notes.length
        ? h('ul', null, ...w.notes.map((n) => h('li', null, h('strong', null, `${fmt(n.date)}, ${KIND[n.kind] ?? n.kind}: `), `went well: ${n.wentWell}. To work on: ${n.workOn}.`)))
        : h('p', { class: 'note' }, 'None this week.'),
    ),
  )
}
