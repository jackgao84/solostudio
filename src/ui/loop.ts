/**
 * Her own "loop this bit" (version 1.2): while a video plays she taps Loop from here, then Loop to
 * here; it goes round that bit until she taps Stop the loop. No marks needed.
 */
import { KID_COPY } from '../content/kid'
import { formatTime } from '../model/timing'
import { loopBetween } from '../model/videos'
import { button } from './components'
import { fill, h } from './dom'

const V = KID_COPY.video

export class LoopButtons {
  readonly el: HTMLElement = h('div', { class: 'loop-row' })
  loop: { from: number; to: number } | null = null
  private start: number | null = null

  constructor(
    private readonly now: () => number,
    private readonly onChange: (loop: { from: number; to: number } | null) => void,
  ) {
    this.draw()
  }

  private draw(): void {
    const status = this.loop
      ? h('p', { class: 'loop-status', role: 'status' }, fill(V.looping, { from: formatTime(this.loop.from), to: formatTime(this.loop.to) }))
      : this.start != null
        ? h('p', { class: 'note', role: 'status' }, fill(V.loopStarted, { from: formatTime(this.start) }))
        : null
    this.el.replaceChildren(
      h(
        'div',
        { class: 'row' },
        button(V.loopFrom, () => {
          this.start = this.now()
          this.draw()
        }, { variant: 'quiet' }),
        button(V.loopTo, () => {
          if (this.start == null) return
          this.loop = loopBetween(this.start, this.now())
          this.start = null
          this.draw()
          this.onChange(this.loop)
        }, { variant: 'quiet', disabled: this.start == null }),
        this.loop
          ? button(V.loopClear, () => {
              this.loop = null
              this.draw()
              this.onChange(null)
            }, { variant: 'quiet' })
          : null,
      ),
      ...(status ? [status] : []),
    )
  }
}
