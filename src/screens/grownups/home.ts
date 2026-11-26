/** The grown-ups' home: a setup checklist, the menu, storage, the version line and updates. */
import { go, save } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { applyUpdateIfSafe, onUpdateReady } from '../../app/sw-register'
import { versionLine } from '../../app/version'
import { mediaIdsIn } from '../../storage/backup'
import { media } from '../../storage/media'
import { spanOf } from '../../model/timing'
import { button } from '../../ui/components'
import { h } from '../../ui/dom'
import { grownScreen } from './common'

export const grownupsHome: Screen = (root) => {
  const d = save()
  const tick = (ok: boolean, text: string) => h('li', null, `${ok ? '✓' : '○'} ${text}`)
  const marked = d.sections.filter((s) => spanOf(s.track)).length
  const lines = d.sections.reduce((a, s) => a + s.lines.length, 0)
  const el = grownScreen(
    root,
    'grownups',
    'Grown-ups',
    null,
    h('p', null, 'Set up Solo Studio here. SETUP.md (in the project) walks through it step by step in about 30 minutes.'),
    h(
      'section',
      { class: 'card' },
      h('h2', null, d.setup.complete ? 'Setup' : 'Start here'),
      h(
        'ul',
        { class: 'checklist' },
        tick(!!d.show, d.show ? `Show: ${d.show.name} on ${d.show.date}` : 'Set the show date and practice minutes (Show and plan)'),
        tick(!!d.track.mediaId || !!d.track.standInYoutubeId, d.track.mediaId ? `Her track: ${d.track.fileName}` : d.track.standInYoutubeId ? 'A YouTube video is standing in for her track' : 'Load her track from Files (Her track)'),
        tick(d.sections.length > 0 && lines > 0, `${d.sections.length} sections, ${lines} lines typed, ${marked} marked on her track`),
        tick(!!d.tempo.bpm && d.tempo.offset != null, d.tempo.bpm ? `Tempo ${d.tempo.bpm} BPM` : 'Tap the tempo and a "1" (Tempo and counts)'),
      ),
    ),
  )
  const missing = h('p', { class: 'media-missing', hidden: true })
  el.append(missing)
  void (async () => {
    try {
      const db = await media()
      const lost: string[] = []
      for (const id of mediaIdsIn(save())) if (!(await db.has(id))) lost.push(id)
      if (lost.length) {
        const trackLost = !!d.track.mediaId && lost.includes(d.track.mediaId)
        missing.textContent = `${trackLost ? 'Her track needs loading again on this iPad (Her track).' : ''} ${lost.length - (trackLost ? 1 : 0) > 0 ? 'Some local videos need adding again (Videos).' : ''}`.trim()
        missing.hidden = false
      }
    } catch (err) {
      console.warn('[solostudio] media check failed', err)
    }
  })()

  el.append(
    h(
      'div',
      { class: 'gu-menu' },
      ...(
        [
          ['Show and plan', '/grownups/plan'],
          ['Her track', '/grownups/track'],
          ['Videos', '/grownups/refs'],
          ['Sections', '/grownups/sections'],
          ['Tempo and counts', '/grownups/tempo'],
          ['Backup', '/grownups/backup'],
          ['Links', '/grownups/links'],
          ['Showtime routine', '/grownups/showtime'],
        ] as const
      ).map(([label, path]) => button(label, () => go(path))),
    ),
  )

  const storage = h('p', { class: 'storage-status note' }, d.setup.persisted ? 'Storage: the iPad has agreed to keep this app’s data.' : 'Storage: Safari may clear data if the iPad runs short of space. Export a backup now and then.')
  const updateSlot = h('div', { class: 'row', hidden: true })
  const stop = onUpdateReady(() => {
    updateSlot.hidden = false
    updateSlot.replaceChildren(h('span', null, 'A new version is ready.'), button('Restart now', () => applyUpdateIfSafe()))
  })
  el.append(
    h('section', { class: 'card' }, storage, updateSlot, h('p', { class: 'version-line' }, versionLine())),
    h('div', { class: 'row' }, button('Back to practice', () => go(save().setup.complete ? '/today' : '/welcome'), { variant: 'primary' })),
  )
  return () => stop()
}
