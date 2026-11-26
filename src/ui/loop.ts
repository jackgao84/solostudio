/**
 * Her own loop (version 1.2; one set of buttons everywhere since 1.3): while a video or her track
 * plays she taps Loop start, then Loop end; it goes round that bit until she taps Stop the loop.
 * Once it is set, the nudge buttons move either end a little earlier or later. No marks needed.
 */
import { KID_COPY } from '../content/kid'
import { nudgeLoop } from '../model/room'
import { formatTime } from '../model/timing'
import { loopBetween } from '../model/videos'
import { button } from './components'
import { fill, h } from './dom'

const V = KID_COPY.video

export type Loop = { from: number; to: number }
/** Why her loop changed: she made it, nudged one end, or stopped it. */
export type LoopChange = 'made' | 'nudged' | 'cleared'

export class LoopButtons {
  readonly el: HTMLElement = h('div', { class: 'loop-row' })
  loop: Loop | null = null
  private start: number | null = null

  constructor(
    private readonly now: () => number,
    private readonly onChange: (loop: Loop | null, why: LoopChange) => void,
  ) {
    this.draw()
  }

  /** Put a loop in place (one of her parts), or none, without telling the screen. */
  set(loop: Loop | null): void {
    this.loop = loop ? { ...loop } : null
    this.start = null
    this.draw()
  }

  private nudge(end: 'from' | 'to', dir: -1 | 1): void {
    if (!this.loop) return
    this.loop = nudgeLoop(this.loop, end, dir)
    this.draw()
    this.onChange(this.loop, 'nudged')
  }

  private draw(): void {
    const nudges = (end: 'from' | 'to') =>
      this.loop
        ? [
            button('◀', () => this.nudge(end, -1), { variant: 'quiet', class: 'nudge', label: end === 'from' ? V.startEarlier : V.endEarlier }),
            button('▶', () => this.nudge(end, 1), { variant: 'quiet', class: 'nudge', label: end === 'from' ? V.startLater : V.endLater }),
          ]
        : []
    const status = this.loop
      ? h('p', { class: 'loop-status', role: 'status' }, fill(V.looping, { from: formatTime(this.loop.from), to: formatTime(this.loop.to) }))
      : this.start != null
        ? h('p', { class: 'note', role: 'status' }, fill(V.loopStarted, { from: formatTime(this.start) }))
        : null
    this.el.replaceChildren(
      h(
        'div',
        { class: 'row loop-row__buttons' },
        h(
          'div',
          { class: 'loop-end' },
          button(V.loopStart, () => {
            this.start = this.now()
            this.draw()
          }, { variant: 'quiet' }),
          ...nudges('from'),
        ),
        h(
          'div',
          { class: 'loop-end' },
          button(V.loopEnd, () => {
            if (this.start == null) return
            this.loop = loopBetween(this.start, this.now())
            this.start = null
            this.draw()
            this.onChange(this.loop, 'made')
          }, { variant: 'quiet', disabled: this.start == null }),
          ...nudges('to'),
        ),
      ),
      ...(status || this.loop
        ? [
            h(
              'div',
              { class: 'row loop-row__status' },
              status,
              this.loop
                ? button(V.loopClear, () => {
                    this.loop = null
                    this.draw()
                    this.onChange(null, 'cleared')
                  }, { variant: 'quiet' })
                : null,
            ),
          ]
        : []),
    )
  }
}
