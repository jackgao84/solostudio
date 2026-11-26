/**
 * Her lesson path on the home page (version 1.2): every lesson in order, the next one marked, the
 * finished ones folded away at the top. Each section lesson shows its stage lights: one lamp per
 * rung, switched on as she ticks it (all on for show day stays on her stage screen). Her own parts
 * (version 1.3, no grown-up sections yet) show a lamp for each speed she ticks them at, and open in
 * the practice room.
 */
import { go } from '../app/ctx'
import { KID_COPY } from '../content/kid'
import { LADDER_COPY } from '../content/ladders'
import { LESSONS } from '../content/lessons'
import { LADDERS } from '../model/ladders'
import { isDone, lessonPath, pathKey, type PathItem } from '../model/path'
import type { SaveData } from '../storage/schema'
import { PART_SPEEDS } from '../storage/schema'
import { button } from './components'
import { fill, h } from './dom'

const H = KID_COPY.home

function route(i: PathItem): string {
  return i.kind === 'skill' ? `/lesson/${i.id}` : i.kind === 'section' ? `/learn/${i.sectionId}/${i.ladder}` : i.kind === 'part' ? `/room?part=${encodeURIComponent(i.partId)}` : '/showtime'
}

function itemView(save: SaveData, i: PathItem, next: boolean): HTMLElement {
  const done = isDone(save, i)
  let title: string = H.showtimeItem
  let tag: string | null = null
  let lamps: HTMLElement | null = null
  if (i.kind === 'skill') {
    title = LESSONS.find((l) => l.id === i.id)?.title ?? ''
    tag = H.lessonTag
  } else if (i.kind === 'section') {
    const s = save.sections.find((x) => x.id === i.sectionId)
    title = fill(H.sectionLesson, { section: s?.name ?? '', ladder: LADDER_COPY[i.ladder].name })
    const ticked = save.progress[i.sectionId]?.[i.ladder]?.done ?? []
    lamps = h('span', { class: 'path-lamps', 'aria-hidden': 'true' }, ...LADDERS[i.ladder].map((st) => h('span', { class: `lamp lamp--${i.ladder}${ticked.includes(st.id) ? ' is-on is-lit' : ''}` })))
  } else if (i.kind === 'part') {
    const p = save.parts.find((x) => x.id === i.partId)
    title = fill(H.sectionLesson, { section: p?.name ?? '', ladder: LADDER_COPY.dance.name })
    lamps = h('span', { class: 'path-lamps', 'aria-hidden': 'true' }, ...PART_SPEEDS.map((sp) => h('span', { class: `lamp lamp--dance${p?.done.includes(sp) ? ' is-on is-lit' : ''}` })))
  }
  return h(
    'li',
    { class: `path-item path-item--${i.kind}${done ? ' is-done' : ''}${next ? ' is-next' : ''}`, 'data-key': pathKey(i) },
    button([next ? h('span', { class: 'path-item__next' }, H.upNext) : null, tag ? h('span', { class: 'path-item__tag' }, tag) : null, h('span', { class: 'path-item__title' }, title), lamps], () => go(route(i)), { class: 'path-item__btn' }),
  )
}

export function lessonPathView(save: SaveData): HTMLElement {
  const items = lessonPath(save)
  const next = items.find((i) => !isDone(save, i)) ?? null
  const finished = items.filter((i) => isDone(save, i))
  const open = items.filter((i) => !isDone(save, i))
  const wrap = h('section', { class: 'lesson-path' }, h('h2', null, H.pathTitle))
  if (finished.length) {
    wrap.append(h('details', { class: 'path-done' }, h('summary', null, fill(H.finished, { n: finished.length })), h('ol', { class: 'path-list' }, ...finished.map((i) => itemView(save, i, false)))))
  }
  wrap.append(h('ol', { class: 'path-list' }, ...open.map((i) => itemView(save, i, i === next))))
  return wrap
}
