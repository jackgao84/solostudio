/** The count-in, big enough to read from her spot: "5", "6", "7", "8". Sits beside the player, never on it. */
import { h } from './dom'

export class CountInView {
  readonly el: HTMLElement = h('p', { class: 'count-in', 'aria-live': 'polite', hidden: true })

  show(word: string | null): void {
    if (!word) {
      this.el.hidden = true
      this.el.textContent = ''
      return
    }
    this.el.hidden = false
    this.el.textContent = word
    this.el.classList.remove('is-beat')
    void this.el.offsetWidth
    this.el.classList.add('is-beat')
  }
}
