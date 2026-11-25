/** Tempo and counts: tap along with her track to set the tempo, tap once on a "1", and nudge it. */
import { save, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { MIN_TAPS, bpmFromTaps, nudgeOffset } from '../../model/counts'
import { formatTime, tapToMediaTime } from '../../model/timing'
import { RangePlayer, type Player } from '../../media/player'
import { button } from '../../ui/components'
import { CountsView } from '../../ui/counts'
import { h } from '../../ui/dom'
import { trackSource } from '../../ui/video'
import { field, grownScreen } from './common'

export const tempoScreen: Screen = (root) => {
  const area = h('div', { class: 'player-area' })
  const bpmEl = h('p', { class: 'bpm' }, save().tempo.bpm ? String(save().tempo.bpm) : '–')
  const offsetEl = h('p', { class: 'note offset' })
  const countsSlot = h('div')
  let player: Player | null = null
  let range: RangePlayer | null = null
  let counts: CountsView | null = null
  let taps: number[] = []
  let gone = false

  const showOffset = () => {
    const o = save().tempo.offset
    offsetEl.textContent = o == null ? 'No "1" set yet.' : `A "1" at ${formatTime(o)} on her track.`
  }
  const rebuildCounts = () => {
    const t = save().tempo
    counts?.el.remove()
    counts = null
    if (t.bpm && t.offset != null) {
      counts = new CountsView(t.bpm, t.offset)
      countsSlot.replaceChildren(counts.el)
      counts.update(player?.time() ?? 0)
    }
  }
  showOffset()

  const playBtn = button('Play', async () => {
    if (!range) return
    playBtn.textContent = (await range.toggle()) ? 'Pause' : 'Play'
  }, { variant: 'primary' })

  const tapBtn = button('Tap tempo', () => {
    const now = performance.now() / 1000
    taps = [...taps, now].slice(-16)
    const bpm = bpmFromTaps(taps, player?.rate() ?? 1)
    if (bpm) {
      bpmEl.textContent = String(bpm)
      update((d) => (d.tempo.bpm = bpm))
      rebuildCounts()
    } else bpmEl.textContent = `${Math.max(0, MIN_TAPS - taps.length)} more taps…`
  }, { class: 'tap-tempo' })

  const typed = h('input', { name: 'bpm', type: 'number', min: 40, max: 240, step: 0.5, value: save().tempo.bpm ?? '', inputmode: 'decimal' })
  typed.addEventListener('change', () => {
    const v = Number(typed.value)
    if (v >= 40 && v <= 240) {
      update((d) => (d.tempo.bpm = Math.round(v * 2) / 2))
      bpmEl.textContent = String(save().tempo.bpm)
      rebuildCounts()
    }
  })

  const one = button('This is a 1', () => {
    if (!player) return
    update((d) => (d.tempo.offset = tapToMediaTime(player!.time(), player!.playing() ? player!.rate() : 0)))
    showOffset()
    rebuildCounts()
  })
  const shift = (delta: number) =>
    button(delta < 0 ? 'Move the 1 earlier' : 'Move the 1 later', () => {
      const t = save().tempo
      if (t.offset == null || !t.bpm) return
      update((d) => (d.tempo.offset = nudgeOffset(t.offset!, delta, t.bpm!)))
      showOffset()
      rebuildCounts()
    }, { variant: 'quiet' })

  grownScreen(
    root,
    'grownups-tempo',
    'Tempo and counts',
    '/grownups',
    h(
      'section',
      { class: 'card stack' },
      h('p', null, 'Play her track and tap along with the beat (8 taps or more). Then tap "This is a 1" on the first beat of an 8-count. The counts beside her lyrics follow from these.'),
      area,
      h('div', { class: 'row' }, playBtn),
      tapBtn,
      h('div', { class: 'row' }, h('span', null, 'Beats per minute:'), bpmEl),
      field('Or type the beats per minute', typed),
      h('div', { class: 'row' }, one, shift(-0.05), shift(0.05)),
      offsetEl,
      countsSlot,
    ),
  )
  rebuildCounts()
  void (async () => {
    const src = await trackSource(area, save())
    if (gone) return src?.player.destroy()
    if (!src) return area.append(h('p', { class: 'note' }, 'Load her track first (Her track).'))
    player = src.player
    range = new RangePlayer(player, 0, Infinity, 1)
    range.onTick = (t) => counts?.update(t)
    range.onStop = () => (playBtn.textContent = 'Play')
  })()
  return () => {
    gone = true
    range?.destroy()
    player?.destroy()
  }
}
