/**
 * The lyrics panel: lines light up karaoke style, words can fade or hide, a peek shows them for a
 * moment, and breath marks sit between words (tappable when marking breaths).
 */
import { KID_COPY } from '../content/kid'
import { hiddenWords } from '../model/fade'
import { LINE_LEAD, activeLine, litWords, wordsOf } from '../model/sync'
import type { Line } from '../storage/schema'
import { fill, h } from './dom'

export type WordsMode = 'show' | 'fade' | 'hidden'

export class LyricsView {
  readonly el: HTMLElement
  private mode: WordsMode = 'show'
  private fadeLevel = 0
  private peeking = false
  private editing = false
  private active = -2
  private lit = -1
  private lineEls: HTMLElement[] = []

  constructor(
    private lines: Line[],
    private starts: number[] | null,
    private sectionEnd: number | null,
    private onToggleBreath: ((line: number, word: number) => void) | null = null,
  ) {
    this.el = h('div', { class: 'lyrics' })
    this.render()
  }

  setLines(lines: Line[]): void {
    this.lines = lines
    this.render()
  }

  setMode(mode: WordsMode, fadeLevel = 0): void {
    this.mode = mode
    this.fadeLevel = fadeLevel
    this.render()
  }

  setPeek(on: boolean): void {
    this.peeking = on
    this.render()
  }

  setEditing(on: boolean): void {
    this.editing = on
    this.render()
  }

  hiddenCount(): number {
    return this.el.querySelectorAll('.word.is-hidden').length
  }

  private hiddenFor(line: Line, n: number): Set<number> {
    if (this.peeking || this.editing) return new Set()
    if (this.mode === 'hidden') return new Set(Array.from({ length: n }, (_, i) => i))
    if (this.mode === 'fade') return hiddenWords(n, line.id, this.fadeLevel)
    return new Set()
  }

  private render(): void {
    this.lineEls = this.lines.map((line, i) => {
      const words = wordsOf(line.lyric)
      const hidden = this.hiddenFor(line, words.length)
      const parts: (Node | string)[] = []
      words.forEach((w, k) => {
        parts.push(h('span', { class: `word${hidden.has(k) ? ' is-hidden' : ''}`, 'data-w': k }, w))
        if (k === words.length - 1) return
        const breath = line.breaths.includes(k)
        if (this.editing) {
          const gap = h('button', { type: 'button', class: `gap${breath ? ' is-breath' : ''}`, 'aria-label': fill(KID_COPY.practice.breathLabel, { word: w }), 'aria-pressed': breath ? 'true' : 'false' }, breath ? h('span', { class: 'breath' }) : null)
          gap.addEventListener('click', () => this.onToggleBreath?.(i, k))
          parts.push(gap)
        } else {
          parts.push(' ')
          if (breath) parts.push(h('span', { class: 'breath', 'aria-hidden': 'true' }), ' ')
        }
      })
      return h(
        'div',
        { class: `lyric-line${line.lang === 'ko' ? ' is-ko' : ''}`, 'data-index': i },
        h('p', { class: 'lyric-words' }, ...parts),
        line.meaning ? h('p', { class: 'lyric-meaning' }, line.meaning) : null,
      )
    })
    this.el.classList.toggle('is-editing', this.editing)
    this.el.replaceChildren(...this.lineEls)
    const a = this.active
    this.active = -2
    this.lit = -1
    if (a >= 0) this.setActive(a, 0)
  }

  private setActive(i: number, lit: number): void {
    if (i !== this.active) {
      this.lineEls.forEach((el, k) => el.classList.toggle('is-active', k === i))
      this.active = i
      this.lit = -1
      const el = this.lineEls[i]
      if (el) {
        const top = el.offsetTop - this.el.clientHeight / 3
        this.el.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      }
    }
    if (lit !== this.lit && this.lineEls[i]) {
      this.lit = lit
      const words = Array.from(this.lineEls[i].querySelectorAll('.word'))
      words.forEach((w, k) => {
        w.classList.toggle('is-sung', k < lit)
        w.classList.toggle('is-now', k === lit)
      })
    }
  }

  /** Light the line (and word) for this moment on her track. */
  update(trackTime: number, rate: number): void {
    if (!this.starts || this.lines.length === 0) return
    const i = activeLine(this.starts, trackTime, rate)
    if (i < 0) {
      if (this.active !== -1) {
        this.lineEls.forEach((el) => el.classList.remove('is-active'))
        this.active = -1
      }
      return
    }
    const end = this.starts[i + 1] ?? this.sectionEnd ?? this.starts[i] + 4
    const lit = litWords(wordsOf(this.lines[i].lyric), this.starts[i], end, trackTime + LINE_LEAD * rate)
    this.setActive(i, lit)
  }
}
