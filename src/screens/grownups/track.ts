/** Her track: the showcase music with the vocals removed, loaded from Files and kept on this iPad. */
import { save, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { parseYouTubeId } from '../../media/youtube-util'
import { probeDuration, unloadTrack } from '../../media/track'
import { formatTime } from '../../model/timing'
import { media, newMediaId } from '../../storage/media'
import { button, confirmButton, filePick } from '../../ui/components'
import { h } from '../../ui/dom'
import { field, grownScreen, savedNote } from './common'

export const trackScreen: Screen = (root) => {
  const current = h('p', { class: 'track-file' })
  const status = h('div', { class: 'form-status' })
  const show = () => {
    const t = save().track
    current.textContent = t.mediaId ? `${t.fileName}${t.duration ? ` (${formatTime(t.duration)})` : ''}` : 'No track loaded yet.'
  }
  show()

  const pick = filePick('Choose her track from Files', 'track', 'audio/*,video/*,.m4a,.mp3,.wav,.aac,.mp4', async (f) => {
    status.replaceChildren(h('p', { class: 'note' }, 'Loading…'))
    try {
      const db = await media()
      const id = newMediaId('track')
      await db.put({ id, kind: 'track', name: f.name, type: f.type || 'audio/mp4', size: f.size, createdAt: Date.now(), group: '', blob: f })
      const duration = await probeDuration(f)
      const old = save().track.mediaId
      update((d) => {
        d.track.mediaId = id
        d.track.fileName = f.name
        d.track.duration = duration
      })
      unloadTrack()
      if (old && old !== id) await db.delete(old)
      show()
      status.replaceChildren(savedNote('Her track is loaded. It stays on this iPad.'))
    } catch (err) {
      console.warn('[solostudio] track load failed', err)
      status.replaceChildren(h('p', { class: 'import-error' }, 'That file could not be stored. Try an .m4a or .mp3 file.'))
    }
  })

  const standIn = h('input', { name: 'standIn', type: 'text', value: save().track.standInYoutubeId, placeholder: 'YouTube link or video id', autocomplete: 'off' })
  const standInStatus = h('div', { class: 'form-status' })

  grownScreen(
    root,
    'grownups-track',
    'Her track',
    '/grownups',
    h(
      'section',
      { class: 'card stack' },
      h('p', null, 'The showcase music with the vocals removed. Choose the file from Files on this iPad. It plays at 50% to 100% speed and never leaves the iPad.'),
      current,
      h('div', { class: 'row' }, pick),
      status,
      save().track.mediaId
        ? confirmButton('Remove her track', 'Yes, remove it', async () => {
            const id = save().track.mediaId
            if (id) await (await media()).delete(id)
            update((d) => {
              d.track.mediaId = null
              d.track.fileName = ''
              d.track.duration = null
            })
            unloadTrack()
            show()
          })
        : null,
    ),
    h(
      'section',
      { class: 'card stack' },
      h('h2', null, 'Stand-in video'),
      h('p', { class: 'note' }, 'Until her track is loaded, any YouTube video can stand in (for example the original). Her own track is always used once it is loaded.'),
      field('Stand-in video', standIn),
      standInStatus,
      h(
        'div',
        { class: 'row' },
        button('Use as stand-in', () => {
          const raw = standIn.value.trim()
          const id = raw ? parseYouTubeId(raw) : ''
          if (id === null) return standInStatus.replaceChildren(h('p', { class: 'import-error' }, 'That doesn’t look like a YouTube link.'))
          update((d) => (d.track.standInYoutubeId = id))
          standIn.value = id
          standInStatus.replaceChildren(savedNote(id ? 'Saved.' : 'Stand-in removed.'))
        }),
      ),
    ),
  )
}
