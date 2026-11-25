/**
 * Videos: the reference YouTube videos (editable ids) and local videos such as a teacher's demo,
 * which can be shown mirrored. YouTube videos are never flipped: the mirrored follow-along is a
 * video that is already mirrored. Swapping a video clears its marks, since its timing is different.
 */
import { save, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { parseYouTubeId, watchUrl } from '../../media/youtube-util'
import { media, newMediaId } from '../../storage/media'
import type { Reference } from '../../storage/schema'
import { button, confirmButton, filePick, toggle } from '../../ui/components'
import { h } from '../../ui/dom'
import { field, grownScreen, savedNote } from './common'

export const refsScreen: Screen = (root) => {
  const list = h('div', { class: 'stack' })
  const localLabel = h('input', { name: 'localLabel', type: 'text', placeholder: 'For example: Teacher demo', autocomplete: 'off' })
  const addStatus = h('div', { class: 'form-status' })

  const row = (r: Reference): HTMLElement => {
    const status = h('div', { class: 'form-status' })
    const el = h('section', { class: 'ref-row card', 'data-ref-id': r.id, 'data-kind': r.kind }, h('h2', null, r.label || r.fileName))
    if (r.kind === 'youtube') {
      const id = h('input', { name: 'youtubeId', type: 'text', value: r.youtubeId, 'aria-label': `YouTube video for ${r.label}`, autocomplete: 'off' })
      const notes = [r.alreadyMirrored ? 'This video is already mirrored, so it is shown as it is.' : '', r.synced ? '' : 'A tutorial: lyrics and counts don’t follow it.'].filter(Boolean)
      el.append(
        ...notes.map((n) => h('p', { class: 'note' }, n)),
        h(
          'div',
          { class: 'ref-row__fields' },
          id,
          button('Save', () => {
            const parsed = parseYouTubeId(id.value)
            if (!parsed) return status.replaceChildren(h('p', { class: 'import-error' }, 'That doesn’t look like a YouTube link or video id.'))
            const changed = parsed !== save().refs.find((x) => x.id === r.id)?.youtubeId
            update((d) => {
              const ref = d.refs.find((x) => x.id === r.id)
              if (ref) ref.youtubeId = parsed
              if (changed) for (const s of d.sections) delete s.refs[r.id]
            })
            id.value = parsed
            status.replaceChildren(savedNote(changed ? 'Saved. Its marks were cleared: mark the sections on it again (Sections).' : 'Saved.'))
          }),
          r.youtubeId ? h('a', { class: 'btn btn--quiet', href: watchUrl(r.youtubeId), target: '_blank', rel: 'noopener noreferrer' }, 'Open in YouTube') : null,
        ),
        status,
      )
    } else {
      el.append(
        h('p', { class: 'note' }, r.fileName),
        h(
          'div',
          { class: 'row' },
          toggle('Mirror', r.mirror, (on) =>
            update((d) => {
              const ref = d.refs.find((x) => x.id === r.id)
              if (ref) ref.mirror = on
            }),
          ),
          confirmButton('Remove', 'Yes, remove it', async () => {
            if (r.mediaId) await (await media()).delete(r.mediaId)
            update((d) => {
              d.refs = d.refs.filter((x) => x.id !== r.id)
              for (const s of d.sections) delete s.refs[r.id]
            })
            draw()
          }),
        ),
      )
    }
    return el
  }

  const draw = () => list.replaceChildren(...save().refs.map(row))
  draw()

  const pick = filePick('Add a local video', 'localVideo', 'video/*,.mp4,.mov,.m4v', async (f) => {
    try {
      const db = await media()
      const mediaId = newMediaId('video')
      await db.put({ id: mediaId, kind: 'video', name: f.name, type: f.type || 'video/mp4', size: f.size, createdAt: Date.now(), group: '', blob: f })
      const label = localLabel.value.trim() || f.name
      update((d) => {
        d.refs.push({ id: `ref-local-${mediaId.slice(-8)}`, role: 'local', label, kind: 'local', youtubeId: '', mediaId, fileName: f.name, synced: true, alreadyMirrored: false, mirror: false })
      })
      localLabel.value = ''
      draw()
      addStatus.replaceChildren(savedNote('Added. Mark the sections on it in Sections, and switch Mirror on to show it mirrored.'))
    } catch (err) {
      console.warn('[solostudio] video load failed', err)
      addStatus.replaceChildren(h('p', { class: 'import-error' }, 'That video could not be stored.'))
    }
  })

  grownScreen(
    root,
    'grownups-refs',
    'Videos',
    '/grownups',
    h('p', null, 'Reference videos play through YouTube’s own player, from youtube-nocookie.com. Paste a link or an 11-character video id. If a video won’t play inside the app, swap it here.'),
    list,
    h('section', { class: 'card stack' }, h('h2', null, 'Add a local video'), h('p', { class: 'note' }, 'For example a teacher’s demo filmed on this iPad. It stays on the iPad.'), field('Name', localLabel), h('div', { class: 'row' }, pick), addStatus),
  )
}
