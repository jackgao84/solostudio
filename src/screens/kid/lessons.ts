/**
 * The seven skill lessons (version 1.2). A lesson is a script the coach reads aloud, line by line,
 * exactly as it shows (a grown-up can turn the reading off), with its video beside it. Each puts her
 * own teachers first; expressions links to Face Lab, performing to Up Anyway. "I did it" marks the
 * lesson done (in the guided session it moves on).
 */
import { go, save, update } from '../../app/ctx'
import { sessionItem, sessionNext } from '../../app/session'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
import { LESSONS, lessonVideo } from '../../content/lessons'
import { lessonScript } from '../../content/narration'
import type { Player } from '../../media/player'
import { button } from '../../ui/components'
import { fill, h } from '../../ui/dom'
import { Narrator } from '../../ui/narrator'
import { youTubeIn } from '../../ui/video'
import { kidScreen, topbar } from './common'

const L = KID_COPY.lessons

export const lessonsScreen: Screen = (root) => {
  const done = new Set(save().lessons.done)
  kidScreen(
    root,
    'lessons',
    topbar(),
    h('h1', null, L.title),
    h(
      'div',
      { class: 'lesson-cards' },
      ...LESSONS.map((l) =>
        button(
          [h('span', { class: 'lesson-card__title' }, l.title), h('span', { class: 'note' }, fill(L.minutes, { n: l.minutes })), done.has(l.id) ? h('span', { class: 'lesson-card__done', 'aria-hidden': 'true' }, '✓') : null],
          () => go(`/lesson/${l.id}`),
          { class: `lesson-card${done.has(l.id) ? ' is-done' : ''}` },
        ),
      ).map((b, i) => (b.setAttribute('data-lesson', LESSONS[i].id), b)),
    ),
  )
}

export const lessonScreen: Screen = (root, { params, query }) => {
  const l = LESSONS.find((x) => x.id === params.id)
  if (!l) {
    go('/lessons')
    return
  }
  const lesson = l
  const item = sessionItem(query)
  const inSession = item?.kind === 'lesson' && item.lessonId === lesson.id
  const s = save().settings

  const lines = [
    h('h1', { class: 'narrated lesson__title' }, lesson.title),
    ...lesson.paragraphs.map((p) => h('p', { class: 'narrated' }, p)),
    h('p', { class: 'narrated card try-it' }, lesson.tryIt),
    h('p', { class: 'narrated teachers-first' }, lesson.teachersFirst),
  ]
  const links = h('div', { class: 'lesson-links' })
  if (lesson.links.includes('faceLab')) links.append(h('a', { class: 'btn facelab-link', href: s.faceLabUrl, target: '_blank', rel: 'noopener noreferrer' }, L.faceLab))
  if (lesson.links.includes('upAnyway')) links.append(h('a', { class: 'btn upanyway-link', href: s.upAnywayUrl, target: '_blank', rel: 'noopener noreferrer' }, L.upAnyway))

  const video = lessonVideo(lesson.id, save().lessons.videos)
  const videoBox = h('div', { class: 'player-area lesson-video' })
  const didIt = () => {
    update((d) => {
      if (!d.lessons.done.includes(lesson.id)) d.lessons.done.push(lesson.id)
    })
    if (inSession) return sessionNext()
    go('/today')
  }
  const narrator = save().narration.on ? new Narrator(lines, lessonScript(lesson)) : null

  kidScreen(
    root,
    'lesson',
    topbar(button(L.title, () => go('/lessons'))),
    narrator?.el ?? null,
    h(
      'div',
      { class: 'lesson-layout' },
      h('div', { class: 'lesson-script' }, ...lines, links.childElementCount ? links : null),
      h('div', { class: 'lesson-side' }, h('p', { class: 'lesson-video__label' }, L.video), videoBox, h('div', { class: 'row' }, button(inSession ? KID_COPY.session.next : L.didIt, didIt, { variant: 'primary', class: 'btn--huge' }))),
    ),
  )
  const player: Player = youTubeIn(videoBox, video.youtubeId, undefined, video.start)
  narrator?.start()
  return () => {
    narrator?.destroy()
    player.destroy()
  }
}
