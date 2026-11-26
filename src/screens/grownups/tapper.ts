/**
 * Tapping where each section starts, in one pass (version 1.2, shared since 1.4): play her track or a
 * video once and tap as each section starts; each tap can then be nudged and heard. Used by the setup
 * wizard (her track, the mirrored follow-along) and by Videos (any video, the karaoke ones included).
 */
import type { Player } from '../../media/player'
import { nudgeStart, startsFromTaps } from '../../model/setup'
import { NUDGE_STEPS, formatTime, tapToMediaTime } from '../../model/timing'
import type { Marks, Section } from '../../storage/schema'
import { button } from '../../ui/components'
import { h } from '../../ui/dom'

const NUDGE_LABEL = (d: number) => `${d < 0 ? 'Earlier' : 'Later'} by ${Math.abs(d)} seconds`

export function tapper(opts: { player: Player; box: HTMLElement; playLabel: string; sections: Section[]; duration: () => number | null; save: (marks: Marks[]) => void; marks: () => Marks[] }): HTMLElement {
  const { player, sections } = opts
  const taps: number[] = []
  let complete = opts.marks().every((m) => m.start != null)
  const playBtn = button(opts.playLabel, () => {
    if (player.playing()) {
      player.pause()
      playBtn.textContent = opts.playLabel
    } else {
      player.play()
      playBtn.textContent = 'Pause'
    }
  }, { variant: 'primary' })
  const tapBox = h('div', { class: 'row tap-starts' })
  const rows = h('div', { class: 'stack start-rows' })
  const drawTap = () => {
    const next = complete ? undefined : sections[taps.length]
    tapBox.replaceChildren(
      next
        ? button(`${next.name} starts now`, () => {
            taps.push(Math.max(0, tapToMediaTime(player.time(), player.rate())))
            if (taps.length === sections.length) {
              complete = true
              opts.save(startsFromTaps(taps, opts.duration()))
              player.pause()
              playBtn.textContent = opts.playLabel
            }
            drawTap()
          }, { class: 'tap-big', variant: 'primary' })
        : button('Tap them again', () => {
            taps.length = 0
            complete = false
            player.seek(0)
            drawTap()
          }, { variant: 'quiet' }),
    )
    drawRows()
  }
  const drawRows = () => {
    const marks = opts.marks()
    rows.replaceChildren(
      ...sections.map((s, i) => {
        const m = marks[i]
        if (m?.start == null) return h('p', { class: 'note start-row', 'data-section': s.id }, `${s.name}: not tapped yet`)
        return h(
          'div',
          { class: 'row start-row', 'data-section': s.id },
          h('span', { class: 'start-row__name' }, `${s.name} ${formatTime(m.start)}`),
          ...NUDGE_STEPS.map((d) =>
            button(`${d > 0 ? '+' : '−'}${Math.abs(d)}`, () => {
              opts.save(nudgeStart(opts.marks(), i, d, opts.duration()))
              drawRows()
            }, { variant: 'quiet', label: NUDGE_LABEL(d) }),
          ),
          button('Hear it', () => {
            player.seek(Math.max(0, m.start! - 1))
            player.play()
            playBtn.textContent = 'Pause'
          }, { variant: 'quiet', label: `Hear where ${s.name} starts` }),
        )
      }),
    )
  }
  drawTap()
  return h('div', { class: 'stack' }, opts.box, h('div', { class: 'row' }, playBtn), tapBox, rows)
}

