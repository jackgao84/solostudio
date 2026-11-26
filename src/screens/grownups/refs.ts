/**
 * Videos: the reference YouTube videos (editable ids) and local videos such as a teacher's demo,
 * which can be shown mirrored. YouTube videos are never flipped: the mirrored follow-along is a
 * video that is already mirrored. Swapping a video clears its marks, since its timing is different.
 *
 * Version 1.4: a grown-up adds any YouTube video under a name they choose, renames any video (the
 * practice room shows every video by its name), and removes one they added or either karaoke video.
 * "Tap section starts" taps where each section starts on any video in one pass, as the wizard does
 * for the mirrored follow-along; a karaoke rung then plays its video from the section.
 */
import { go, save, sectionsInOrder, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { parseYouTubeId, watchUrl } from '../../media/youtube-util'
import { addYouTubeVideo, canRemove, removeVideo, renameVideo, swapVideo } from '../../model/refs'
import { videoName } from '../../model/room'
import { media, newMediaId } from '../../storage/media'
import { VIDEO_NAME_MAX, type Marks, type Reference } from '../../storage/schema'
import { button, confirmButton, filePick, toggle } from '../../ui/components'
import { h } from '../../ui/dom'
import { referencePlayer } from '../../ui/video'
import { field, grownScreen, savedNote } from './common'
import { tapper } from './tapper'

const nameOf = (r: Reference) => videoName({ role: r.role, ref: r })

export const refsScreen: Screen = (root) => {
  const list = h('div', { class: 'stack' })
  const localLabel = h('input', { name: 'localLabel', type: 'text', placeholder: 'For example: Teacher demo', autocomplete: 'off', maxlength: VIDEO_NAME_MAX })
  const addStatus = h('div', { class: 'form-status' })

  const row = (r: Reference): HTMLElement => {
    const status = h('div', { class: 'form-status' })
    const title = h('h2', null, nameOf(r) || r.fileName)
    const el = h('section', { class: 'ref-row card', 'data-ref-id': r.id, 'data-kind': r.kind }, title)
    // Its name, as the practice room shows it.
    const name = h('input', { name: 'videoName', type: 'text', value: nameOf(r), maxlength: VIDEO_NAME_MAX, 'aria-label': `Name for ${nameOf(r)}`, autocomplete: 'off' })
    const nameRow = h(
      'div',
      { class: 'ref-row__fields' },
      name,
      button('Rename', () => {
        update((d) => renameVideo(d, r.id, name.value))
        const now = save().refs.find((x) => x.id === r.id)
        if (now) {
          name.value = nameOf(now)
          title.textContent = nameOf(now)
        }
        status.replaceChildren(savedNote('Renamed. The practice room shows it by this name.'))
      }, { variant: 'quiet' }),
    )
    const taps = save().sections.length ? button('Tap section starts', () => go(`/grownups/taps/${r.id}`), { variant: 'quiet', label: `Tap section starts on ${nameOf(r)}` }) : null
    const remove = canRemove(r)
      ? confirmButton('Remove', 'Yes, remove it', async () => {
          if (r.kind === 'local' && r.mediaId) await (await media()).delete(r.mediaId)
          update((d) => removeVideo(d, r.id))
          draw()
        })
      : null
    if (r.kind === 'youtube') {
      const id = h('input', { name: 'youtubeId', type: 'text', value: r.youtubeId, 'aria-label': `YouTube video for ${nameOf(r)}`, autocomplete: 'off' })
      const notes = [r.alreadyMirrored ? 'This video is already mirrored, so it is shown as it is.' : '', r.synced ? '' : 'A tutorial: lyrics and counts don’t follow it.'].filter(Boolean)
      el.append(
        ...notes.map((n) => h('p', { class: 'note' }, n)),
        nameRow,
        h(
          'div',
          { class: 'ref-row__fields' },
          id,
          button('Save', () => {
            const parsed = parseYouTubeId(id.value)
            if (!parsed) return status.replaceChildren(h('p', { class: 'import-error' }, 'That doesn’t look like a YouTube link or video id.'))
            let changed = false
            update((d) => {
              changed = swapVideo(d, r.id, parsed)
            })
            id.value = parsed
            status.replaceChildren(savedNote(changed ? 'Saved. Its marks were cleared: tap the section starts on it again.' : 'Saved.'))
          }),
          r.youtubeId ? h('a', { class: 'btn btn--quiet', href: watchUrl(r.youtubeId), target: '_blank', rel: 'noopener noreferrer' }, 'Open in YouTube') : null,
        ),
        ...(taps || remove ? [h('div', { class: 'row' }, taps, remove)] : []),
        status,
      )
    } else {
      el.append(
        h('p', { class: 'note' }, r.fileName),
        nameRow,
        h(
          'div',
          { class: 'row' },
          toggle('Mirror', r.mirror, (on) =>
            update((d) => {
              const ref = d.refs.find((x) => x.id === r.id)
              if (ref) ref.mirror = on
            }),
          ),
          taps,
          remove,
        ),
        status,
      )
    }
    return el
  }

  const draw = () => list.replaceChildren(...save().refs.map(row))
  draw()

  // Any YouTube video, under a name a grown-up chooses (1.4).
  const ytName = h('input', { name: 'videoName', type: 'text', placeholder: 'For example: Slow karaoke', autocomplete: 'off', maxlength: VIDEO_NAME_MAX })
  const ytLink = h('input', { name: 'videoLink', type: 'text', placeholder: 'YouTube link or video id', autocomplete: 'off' })
  const ytStatus = h('div', { class: 'form-status' })
  const addYouTube = h(
    'section',
    { class: 'card stack add-youtube' },
    h('h2', null, 'Add a YouTube video'),
    h('p', { class: 'note' }, 'Any video, under the name she will see in the practice room.'),
    field('Name', ytName),
    field('YouTube link', ytLink),
    h(
      'div',
      { class: 'row' },
      button('Add the video', () => {
        const id = parseYouTubeId(ytLink.value)
        if (!id) return ytStatus.replaceChildren(h('p', { class: 'import-error' }, 'That doesn’t look like a YouTube link or video id.'))
        const refId = `ref-added-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
        update((d) => {
          addYouTubeVideo(d, ytName.value, id, refId)
        })
        const added = save().refs.find((r) => r.id === refId)
        ytName.value = ''
        ytLink.value = ''
        draw()
        ytStatus.replaceChildren(savedNote(`Added: ${added ? nameOf(added) : ''}. It is in the practice room now.`))
      }, { variant: 'primary' }),
    ),
    ytStatus,
  )

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
    h('p', null, 'Reference videos play through YouTube’s own player, from youtube-nocookie.com. Paste a link or an 11-character video id. If a video won’t play inside the app, swap it here. The practice room shows every video by its name.'),
    list,
    addYouTube,
    h('section', { class: 'card stack' }, h('h2', null, 'Add a local video'), h('p', { class: 'note' }, 'For example a teacher’s demo filmed on this iPad. It stays on the iPad.'), field('Name', localLabel), h('div', { class: 'row' }, pick), addStatus),
  )
}

/**
 * Tap section starts on one video (1.4): one play of the video, a tap as each section starts, then
 * nudge or hear each one. The same as the wizard's step for the mirrored follow-along.
 */
export const tapsScreen: Screen = (root, { params }) => {
  const ref = save().refs.find((r) => r.id === params.ref && (r.kind === 'youtube' ? !!r.youtubeId : !!r.mediaId))
  if (!ref) {
    go('/grownups/refs')
    return
  }
  const sections = sectionsInOrder()
  const box = h('div', { class: 'player-area' })
  const player = sections.length ? referencePlayer(box, ref) : null
  const ids = sections.map((s) => s.id)
  grownScreen(
    root,
    'grownups-taps',
    `Section starts on ${nameOf(ref)}`,
    '/grownups/refs',
    h('p', null, 'Play the video once and tap as each section starts. Then a rung on this video starts right at her section, and her lines follow it. Optional.'),
    player
      ? tapper({
          player,
          box,
          playLabel: 'Play the video',
          sections,
          duration: () => player.duration(),
          marks: () => ids.map((id) => save().sections.find((s) => s.id === id)?.refs[ref.id] ?? ({ start: null, end: null } as Marks)),
          save: (marks) =>
            update((d) =>
              ids.forEach((id, i) => {
                const sec = d.sections.find((x) => x.id === id)
                if (sec) sec.refs[ref.id] = marks[i]
              }),
            ),
        })
      : h('p', { class: 'note' }, 'Add her lines first (Set up, step 2): the sections come from them.'),
  )
  return () => player?.destroy()
}
