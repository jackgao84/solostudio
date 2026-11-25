/** Six short reads. Each puts her own teachers first; the performing one links to Face Lab and Up Anyway. */
import { go, save } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
import { LESSONS } from '../../content/lessons'
import { button } from '../../ui/components'
import { fill, h } from '../../ui/dom'
import { kidScreen, topbar } from './common'

const L = KID_COPY.lessons

export const lessonsScreen: Screen = (root) => {
  kidScreen(
    root,
    'lessons',
    topbar(),
    h('h1', null, L.title),
    h(
      'div',
      { class: 'lesson-cards' },
      ...LESSONS.map((l) => button([h('span', { class: 'lesson-card__title' }, l.title), h('span', { class: 'note' }, fill(L.minutes, { n: l.minutes }))], () => go(`/lesson/${l.id}`), { class: 'lesson-card' })),
    ),
  )
}

export const lessonScreen: Screen = (root, { params }) => {
  const l = LESSONS.find((x) => x.id === params.id)
  if (!l) {
    go('/lessons')
    return
  }
  const s = save().settings
  const links = h('div', { class: 'lesson-links' })
  if (l.links.includes('faceLab')) links.append(h('a', { class: 'btn facelab-link', href: s.faceLabUrl, target: '_blank', rel: 'noopener noreferrer' }, L.faceLab))
  if (l.links.includes('upAnyway')) links.append(h('a', { class: 'btn upanyway-link', href: s.upAnywayUrl, target: '_blank', rel: 'noopener noreferrer' }, L.upAnyway))
  kidScreen(
    root,
    'lesson',
    topbar(button(L.title, () => go('/lessons'))),
    h('h1', null, l.title),
    h('div', { class: 'lesson-body' }, ...l.paragraphs.map((p) => h('p', null, p))),
    h('p', { class: 'card try-it' }, l.tryIt),
    links.childElementCount ? links : null,
    h('p', { class: 'teachers-first' }, l.teachersFirst),
  )
}
