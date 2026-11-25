/**
 * Showtime: her whole track from the top without stopping. Lyrics optional, no video (unless a
 * video is standing in for her track). There is no pause: a tap on the stage just says "keep going".
 * A press-and-hold stops it in an emergency. Afterwards: one thing that went well, one to work on.
 * With ?family=1 it is "perform for your family", and the brave thing can go in Up Anyway.
 */
import { go, save, sectionsInOrder, today, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
import { GATE_HOLD_MS } from '../../app/gate'
import { LINE_LEAD, lineStarts } from '../../model/sync'
import { spanOf } from '../../model/timing'
import { RangePlayer } from '../../media/player'
import { button, holdButton, toggle } from '../../ui/components'
import { h } from '../../ui/dom'
import { reflectView } from '../../ui/reflect'
import { trackSource, type TrackSource } from '../../ui/video'
import { kidScreen, topbar } from './common'

const S = KID_COPY.showtime

/** Every timed line of the song, in order, on her track's clock. */
function songLines(): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = []
  for (const s of sectionsInOrder()) {
    const starts = lineStarts(s.lines.map((l) => l.time), spanOf(s.track))
    if (!starts) continue
    s.lines.forEach((l, i) => out.push({ start: starts[i], text: l.lyric }))
  }
  return out.sort((a, b) => a.start - b.start)
}

export const showtimeScreen: Screen = (root, { query }) => {
  const family = query.get('family') === '1'
  const blockId = query.get('block')
  const el = kidScreen(root, 'showtime', topbar())
  const body = h('div', { class: 'stack' })
  const playerArea = h('div', { class: 'player-area' })
  el.append(body)
  let words = save().settings.showtimeLyrics
  let src: TrackSource | null = null
  let range: RangePlayer | null = null
  let keepTimer = 0
  let gone = false

  const startView = () => {
    range?.destroy()
    range = null
    body.replaceChildren(
      h('h1', null, family ? S.familyTitle : S.title),
      h('p', null, family ? KID_COPY.block.familyHow : S.how),
      toggle(S.showWords, words, (on) => {
        words = on
        update((d) => (d.settings.showtimeLyrics = on))
      }),
      playerArea,
      h('div', { class: 'row' }, button(S.start, () => void run(), { variant: 'primary', class: 'btn--big' })),
    )
    if (src?.standIn) body.insertBefore(h('p', { class: 'note' }, S.standIn), playerArea)
  }

  const run = async () => {
    if (!src) return
    const lines = songLines()
    const lyric = h('span', { class: 'showtime-lyric' })
    const keep = h('span', { class: 'keep-going', role: 'status', hidden: true }, h('span', null, S.keepGoing), h('span', { class: 'note' }, S.keepGoingMore))
    const bar = h('div', { class: 'progress__bar' })
    const stageEl = h('button', { type: 'button', class: 'showtime-stage' }, words ? lyric : null, keep)
    stageEl.addEventListener('click', () => {
      keep.hidden = false
      window.clearTimeout(keepTimer)
      keepTimer = window.setTimeout(() => (keep.hidden = true), 2500)
    })
    const stop = holdButton(S.stopHold, GATE_HOLD_MS, () => startView(), 'stop-hold')
    const parts: HTMLElement[] = [stageEl]
    if (src.standIn) parts.push(playerArea)
    parts.push(h('div', { class: 'progress', 'aria-hidden': 'true' }, bar), h('div', { class: 'row' }, stop))
    body.replaceChildren(...parts)
    const duration = src.player.duration()
    range = new RangePlayer(src.player, 0, duration ?? Infinity, 1)
    range.onTick = (t) => {
      if (words) {
        let current = ''
        for (const l of lines) if (l.start - LINE_LEAD <= t) current = l.text
        if (lyric.textContent !== current) lyric.textContent = current
      }
      const d = src?.player.duration()
      if (d) bar.style.width = `${Math.min(100, (t / d) * 100)}%`
    }
    range.onStop = () => after()
    await range.playFromTop()
  }

  const after = () => {
    range?.destroy()
    range = null
    if (blockId) {
      update((d) => {
        const s = (d.days[today()] ??= { order: [], done: [] })
        if (!s.done.includes(blockId)) s.done.push(blockId)
      })
    }
    const brave = family
      ? [h('p', null, KID_COPY.reflect.braveNote), h('a', { class: 'btn upanyway-link', href: save().settings.upAnywayUrl, target: '_blank', rel: 'noopener noreferrer' }, KID_COPY.reflect.upAnyway)]
      : []
    body.replaceChildren(
      h('h1', null, S.finished),
      reflectView(
        (r) =>
          update((d) => {
            d.reflections.push({ id: `refl-${Date.now()}`, at: new Date().toISOString(), kind: family ? 'family' : 'showtime', target: 'run', wentWell: r.wentWell, workOn: r.workOn })
          }),
        [
          ...brave,
          h(
            'div',
            { class: 'row' },
            button(S.again, () => startView()),
            button(S.recordRun, () => go('/record/run')),
          ),
        ],
      ),
    )
  }

  void (async () => {
    src = await trackSource(playerArea, save())
    if (gone) return src?.player.destroy()
    startView()
    if (!src) body.append(h('p', { class: 'note' }, KID_COPY.practice.needsTrack))
  })()
  startView()

  return () => {
    gone = true
    window.clearTimeout(keepTimer)
    range?.destroy()
    src?.player.destroy()
  }
}
