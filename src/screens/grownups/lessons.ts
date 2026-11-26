/**
 * Lessons and narration (version 1.2): turn the coach's reading of lessons on or off, and swap the
 * video of any skill lesson (a YouTube link and where to start). Nothing here is required.
 */
import { save, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { LESSONS } from '../../content/lessons'
import { parseYouTubeId } from '../../media/youtube-util'
import { button, toggle } from '../../ui/components'
import { h } from '../../ui/dom'
import { field, grownScreen, savedNote } from './common'

/** "1:05", "65" or "65.5" → seconds; null if it isn't a time. */
export function parseStart(v: string): number | null {
  const s = v.trim()
  if (!s) return 0
  const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(s)
  if (!m) return null
  return (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2])
}

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`

export const lessonsAdmin: Screen = (root) => {
  const rows = LESSONS.map((l) => {
    const current = save().lessons.videos[l.id] ?? l.video
    const link = h('input', { name: 'lessonVideo', type: 'text', value: current.youtubeId, autocomplete: 'off', 'aria-label': `${l.title}: video` })
    const start = h('input', { name: 'lessonStart', type: 'text', inputmode: 'numeric', value: mmss(current.start), autocomplete: 'off', 'aria-label': `${l.title}: start at` })
    const status = h('div', { class: 'form-status' })
    const swapped = () => !!save().lessons.videos[l.id]
    const reset = button('Use the default', () => {
      update((d) => {
        delete d.lessons.videos[l.id]
      })
      link.value = l.video.youtubeId
      start.value = mmss(l.video.start)
      reset.hidden = true
      status.replaceChildren(savedNote('Back to the default video.'))
    }, { variant: 'quiet' })
    reset.hidden = !swapped()
    return h(
      'section',
      { class: 'card stack lesson-admin', 'data-lesson': l.id },
      h('h2', null, l.title),
      h('div', { class: 'form-grid' }, field('YouTube link or id', link), field('Start at (m:ss)', start)),
      status,
      h(
        'div',
        { class: 'row' },
        button('Save video', () => {
          const id = parseYouTubeId(link.value)
          const t = parseStart(start.value)
          if (!id || t == null) return status.replaceChildren(h('p', { class: 'import-error' }, 'That isn’t a YouTube link or a time like 0:29.'))
          update((d) => {
            if (id === l.video.youtubeId && t === l.video.start) delete d.lessons.videos[l.id]
            else d.lessons.videos[l.id] = { youtubeId: id, start: t }
          })
          link.value = id
          reset.hidden = !swapped()
          status.replaceChildren(savedNote('Saved.'))
        }),
        reset,
      ),
    )
  })

  grownScreen(
    root,
    'grownups-lessons',
    'Lessons and narration',
    '/grownups',
    h(
      'section',
      { class: 'card stack' },
      h('p', null, 'A coach’s recorded voice reads each lesson to her, word for word, and says the cues. Turn the reading off and the lessons are text only (the cues stay; she can turn those down or off in Sounds).'),
      toggle('Read lessons aloud', save().narration.on, (on) =>
        update((d) => {
          d.narration.on = on
        }),
      ),
    ),
    h('p', { class: 'note' }, 'Each lesson’s video. Paste a different YouTube link to swap it.'),
    ...rows,
  )
}
