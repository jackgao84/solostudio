/**
 * The 8-count display that sits beside the lyrics (never over a video), with her light stick in the
 * colour she picked, pulsing on every beat.
 */
import { save } from '../app/ctx'
import { KID_COPY } from '../content/kid'
import { countAt } from '../model/counts'
import { fill, h } from './dom'

export class CountsView {
  readonly el: HTMLElement
  private nums: HTMLElement[]
  private eightEl: HTMLElement
  private stick: HTMLElement
  private now = 0

  constructor(
    private bpm: number,
    private offset: number,
  ) {
    this.nums = Array.from({ length: 8 }, (_, i) => h('span', { class: 'count', 'data-n': i + 1 }, String(i + 1)))
    this.eightEl = h('p', { class: 'counts__eight' }, '')
    this.stick = h('span', { class: 'light-stick', 'aria-hidden': 'true', 'data-colour': save().stage.stick, 'data-beat': '0' }, h('span', { class: 'light-stick__glow' }))
    this.el = h('div', { class: 'counts', role: 'timer', 'aria-label': KID_COPY.practice.countsTitle }, h('div', { class: 'counts__main' }, this.stick, h('div', { class: 'counts__row' }, ...this.nums)), this.eightEl)
  }

  update(trackTime: number): void {
    const { count, eight } = countAt(trackTime, this.bpm, this.offset)
    if (count !== this.now) {
      this.nums.forEach((el, i) => el.classList.toggle('is-now', i + 1 === count))
      this.now = count
      this.stick.setAttribute('data-beat', String(count))
      this.stick.classList.remove('is-beat')
      void this.stick.offsetWidth
      this.stick.classList.add('is-beat')
    }
    const text = eight >= 1 ? fill(KID_COPY.practice.eight, { n: eight }) : ''
    if (this.eightEl.textContent !== text) this.eightEl.textContent = text
  }
}
