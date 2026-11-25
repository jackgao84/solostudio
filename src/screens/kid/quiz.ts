/**
 * Quick tests. Missing words: blanks she fills out loud, then taps to check herself. Counts from
 * memory: her track plays the section with the counts hidden until she asks to see them.
 * Neither is ever marked right or wrong; "I did it" counts as a check when one is due.
 */
import { go, save, sectionById, today, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
import { progressOf, reviewLadder } from '../../model/progress'
import { chooseBlanks } from '../../model/quiz'
import { isDue } from '../../model/spacing'
import { wordsOf } from '../../model/sync'
import { playRange, spanOf } from '../../model/timing'
import { RangePlayer } from '../../media/player'
import type { LadderId } from '../../storage/schema'
import { button } from '../../ui/components'
import { CountsView } from '../../ui/counts'
import { h } from '../../ui/dom'
import { trackSource } from '../../ui/video'
import { kidScreen, topbar } from './common'

const Q = KID_COPY.quiz
const P = KID_COPY.practice

function finish(sectionId: string, ladder: LadderId): void {
  const t = today()
  const p = progressOf(save().progress, sectionId)
  if (p[ladder].finishedAt && isDue(p[ladder].review, t)) update((d) => (d.progress[sectionId] = reviewLadder(p, ladder, t)))
  else if (p.shaky) update((d) => (d.progress[sectionId] = reviewLadder(p, ladder, t)))
  go(`/section/${sectionId}`)
}

export const quizScreen: Screen = (root, { params }) => {
  const s = sectionById(params.id)
  if (!s) {
    go('/sections')
    return
  }
  const back = button(s.name, () => go(`/section/${s.id}`))
  if (params.kind === 'counts') return countsQuiz(root, s.id, back)
  const el = kidScreen(root, 'quiz-words', topbar(back), h('h1', null, Q.wordsTitle), h('p', { class: 'note' }, Q.wordsHow))
  const linesEl = h('div', { class: 'lyrics quiz-lines' })
  let attempt = 0
  const draw = () => {
    linesEl.replaceChildren(
      ...s.lines.map((line, i) => {
        const words = wordsOf(line.lyric)
        const blanks = new Set(chooseBlanks(words.length, line.id, attempt))
        const parts: (Node | string)[] = []
        words.forEach((w, k) => {
          if (k > 0) parts.push(' ')
          if (!blanks.has(k)) return parts.push(h('span', { class: 'word' }, w))
          const b = h('button', { type: 'button', class: 'blank', 'aria-label': Q.blankLabel }, w)
          b.addEventListener('click', () => {
            b.classList.add('is-revealed')
            b.removeAttribute('aria-label')
          })
          parts.push(b)
        })
        return h('div', { class: 'lyric-line', 'data-index': i }, h('p', { class: 'lyric-words' }, ...parts), line.meaning ? h('p', { class: 'lyric-meaning' }, line.meaning) : null)
      }),
    )
  }
  draw()
  if (!s.lines.length) el.append(h('p', { class: 'note' }, P.noLines))
  el.append(
    linesEl,
    h(
      'div',
      { class: 'controls' },
      button(Q.showAll, () => {
        for (const b of Array.from(linesEl.querySelectorAll('.blank'))) {
          b.classList.add('is-revealed')
          b.removeAttribute('aria-label')
        }
      }),
      button(Q.newBlanks, () => {
        attempt++
        draw()
      }),
    ),
    h('div', { class: 'answer' }, button(P.again, () => {
      attempt++
      draw()
    }, { class: 'btn--big' }), button(P.didIt, () => finish(s.id, 'rap'), { variant: 'primary', class: 'btn--big' })),
  )
}

function countsQuiz(root: HTMLElement, sectionId: string, back: HTMLElement): () => void {
  const s = sectionById(sectionId)!
  const el = kidScreen(root, 'quiz-counts', topbar(back), h('h1', null, Q.countsTitle), h('p', { class: 'note' }, Q.countsHow))
  const playerArea = h('div', { class: 'player-area' })
  const countsSlot = h('div', { class: 'side' })
  el.append(h('div', { class: 'stage has-side' }, playerArea, countsSlot))
  const tempo = save().tempo
  const span = spanOf(s.track)
  let range: RangePlayer | null = null
  let counts: CountsView | null = null
  let shown = false
  let gone = false
  const playBtn = button(P.play, async () => {
    if (!range) return
    playBtn.textContent = (await range.toggle()) ? P.pause : P.play
  }, { variant: 'primary' })
  const showBtn = button(Q.showCounts, () => {
    shown = !shown
    showBtn.textContent = shown ? Q.hideCounts : Q.showCounts
    if (shown && tempo.bpm && tempo.offset != null) {
      counts = new CountsView(tempo.bpm, tempo.offset)
      countsSlot.append(counts.el)
      counts.update(range?.player.time() ?? span?.start ?? 0)
    } else {
      counts?.el.remove()
      counts = null
    }
  })
  el.append(h('div', { class: 'controls' }, playBtn, showBtn), h('div', { class: 'answer' }, button(P.again, () => void range?.playFromTop().then((ok) => (playBtn.textContent = ok ? P.pause : P.play)), { class: 'btn--big' }), button(P.didIt, () => finish(sectionId, 'dance'), { variant: 'primary', class: 'btn--big' })))
  void (async () => {
    const src = await trackSource(playerArea, save())
    if (gone) return src?.player.destroy()
    if (!src) return el.append(h('p', { class: 'note' }, P.needsTrack))
    if (src.standIn) el.append(h('p', { class: 'note' }, P.standIn))
    if (!span) return el.append(h('p', { class: 'note' }, P.needsTrackMarks))
    const { from, to } = playRange(span)
    range = new RangePlayer(src.player, from, to, 1)
    range.onTick = (t) => counts?.update(t)
    range.onStop = () => (playBtn.textContent = P.play)
  })()
  return () => {
    gone = true
    range?.destroy()
    range?.player.destroy()
  }
}
