/** Her clips, kept on this iPad: the newest 3 per section and 3 run-throughs. */
import { save } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
import { media, type MediaMeta } from '../../storage/media'
import { button, confirmButton } from '../../ui/components'
import { h } from '../../ui/dom'
import { kidScreen, topbar } from './common'
import { revokeLater } from '../../media/blob-url'

const C = KID_COPY.clips

export const clipsScreen: Screen = (root) => {
  const el = kidScreen(root, 'clips', topbar(), h('h1', null, C.title), h('p', { class: 'note' }, C.keepNote))
  const list = h('div', { class: 'clip-list' })
  const viewer = h('div', { class: 'clip-view' })
  el.append(viewer, list)
  let url: string | null = null
  let gone = false

  const watch = async (m: MediaMeta) => {
    const rec = await (await media()).get(m.id)
    if (!rec || gone) return
    revokeLater(url)
    url = URL.createObjectURL(rec.blob)
    const v = h('video', { class: `clip-player${save().settings.mirrorClips ? ' is-mirrored' : ''}`, controls: true, playsinline: true, autoplay: true, src: url })
    viewer.replaceChildren(v, button(C.close, () => viewer.replaceChildren()))
  }

  const draw = async () => {
    const clips = await (await media()).list('clip')
    if (gone) return
    if (!clips.length) return list.replaceChildren(h('p', { class: 'note' }, C.none))
    const names = new Map(save().sections.map((s) => [`section:${s.id}`, s.name]))
    const groups = [...new Set(clips.map((c) => c.group))].sort((a, b) => (a === 'run' ? 1 : b === 'run' ? -1 : 0))
    list.replaceChildren(
      ...groups.map((g) =>
        h(
          'section',
          { class: 'clip-group card' },
          h('h2', null, g === 'run' ? C.runs : (names.get(g) ?? '')),
          ...clips
            .filter((c) => c.group === g)
            .reverse()
            .map((c) =>
              h(
                'div',
                { class: 'clip-row' },
                h('p', { class: 'clip-row__when' }, new Date(c.createdAt).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })),
                button(C.watch, () => void watch(c)),
                confirmButton(C.delete, C.deleteSure, async () => {
                  await (await media()).delete(c.id)
                  viewer.replaceChildren()
                  await draw()
                }),
              ),
            ),
        ),
      ),
    )
  }
  void draw()
  return () => {
    gone = true
    revokeLater(url)
  }
}
