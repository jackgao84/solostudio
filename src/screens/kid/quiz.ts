/**
 * Quick tests. Missing words: blanks she fills out loud, then taps to check herself. Counts from
 * memory: her track plays the section with the counts hidden until she asks to see them.
 * Neither is ever marked right or wrong; "I did it" counts as a check when one is due.
 */
import { go, save, sectionById, today, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
import { progressOf, reviewLadder } from '../../model/progress'
import { chipsFor, lineBuilt, nextChip, tapChip } from '../../model/buildline'
import { chooseBlanks } from '../../model/quiz'
import { isDue } from '../../model/spacing'
import { wordsOf } from '../../model/sync'
import { playRange, spanOf } from '../../model/timing'
import { RepLoop } from '../../media/reploop'
import type { LadderId } from '../../storage/schema'
import { button } from '../../ui/components'
import { CountInView } from '../../ui/countin'
import { CountsView } from '../../ui/counts'
import { fill, h } from '../../ui/dom'
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
  if (params.kind === 'build') return buildQuiz(root, s.id, back)
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
    h('div', { class: 'answer main-actions' }, button(P.again, () => {
      attempt++
      draw()
    }, { class: 'btn--huge' }), button(P.didIt, () => finish(s.id, 'rap'), { variant: 'primary', class: 'btn--huge' })),
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
  let loop: RepLoop | null = null
  let counts: CountsView | null = null
  let shown = false
  let gone = false
  const countIn = new CountInView()
  // Reps loop with a count-in before each, like practice: Play, then Pause when she's done.
  const playBtn = button(P.play, () => loop?.toggle(), { class: 'btn--huge' })
  const showBtn = button(Q.showCounts, () => {
    shown = !shown
    showBtn.textContent = shown ? Q.hideCounts : Q.showCounts
    if (shown && tempo.bpm && tempo.offset != null) {
      counts = new CountsView(tempo.bpm, tempo.offset)
      countsSlot.append(counts.el)
      counts.update(loop?.player.time() ?? span?.start ?? 0)
    } else {
      counts?.el.remove()
      counts = null
    }
  })
  el.append(h('div', { class: 'controls' }, countIn.el, playBtn, showBtn), h('div', { class: 'answer main-actions' }, button(P.again, () => loop?.again(), { class: 'btn--huge' }), button(P.didIt, () => finish(sectionId, 'dance'), { variant: 'primary', class: 'btn--huge' })))
  void (async () => {
    const src = await trackSource(playerArea, save())
    if (gone) return src?.player.destroy()
    if (!src) return el.append(h('p', { class: 'note' }, P.needsTrack))
    if (src.standIn) el.append(h('p', { class: 'note' }, P.standIn))
    if (!span) return el.append(h('p', { class: 'note' }, P.needsTrackMarks))
    const { from, to } = playRange(span)
    loop = new RepLoop(src.player, () => ({ from, to, speed: 1 }), () => save().tempo.bpm)
    loop.onTick = (t) => counts?.update(t)
    loop.onCount = (w) => countIn.show(w)
    loop.onState = (st) => (playBtn.textContent = st === 'idle' || st === 'paused' ? P.play : P.pause)
  })()
  return () => {
    gone = true
    loop?.destroy()
    loop?.player.destroy()
  }
}

/**
 * Build the line: each line's words shuffled into chips, tapped back in order. A chip that isn't next
 * gives a little wiggle and stays put; nothing is counted. Peek lights up the next one for a moment.
 */
function buildQuiz(root: HTMLElement, sectionId: string, back: HTMLElement): () => void {
  const s = sectionById(sectionId)!
  const el = kidScreen(root, 'quiz-build', topbar(back), h('h1', null, Q.buildTitle), h('p', { class: 'note' }, Q.buildHow))
  const lines = s.lines.filter((l) => wordsOf(l.lyric).length > 0)
  const area = h('div', { class: 'build stack' })
  const answer = h('div', { class: 'answer main-actions' })
  el.append(area, answer)
  if (!lines.length) {
    area.append(h('p', { class: 'note' }, P.noLines))
    return () => undefined
  }
  let index = 0
  let attempt = 0
  let peekTimer = 0

  const allDone = () => {
    area.append(h('p', { class: 'all-built', role: 'status' }, Q.allBuilt))
    answer.replaceChildren(
      button(P.again, () => {
        attempt++
        index = 0
        draw()
      }, { class: 'btn--huge' }),
      button(P.didIt, () => finish(sectionId, 'rap'), { variant: 'primary', class: 'btn--huge' }),
    )
  }

  const draw = () => {
    const line = lines[index]
    const words = wordsOf(line.lyric)
    const chips = chipsFor(words, `${line.id}:${attempt}`)
    let placed: number[] = []
    const built = h('p', { class: 'built-line', 'aria-live': 'polite' })
    const pool = h('div', { class: 'word-chips' })
    const render = () => {
      const parts: (Node | string)[] = []
      placed.forEach((id, k) => {
        if (k) parts.push(' ')
        parts.push(h('span', { class: 'built-word' }, chips.find((c) => c.id === id)!.word))
      })
      built.replaceChildren(...parts)
      pool.replaceChildren(
        ...chips.map((c) => {
          const on = placed.includes(c.id)
          const b = h('button', { type: 'button', class: `word-chip${on ? ' is-placed' : ''}`, 'data-chip': c.id, disabled: on }, c.word)
          b.addEventListener('click', () => {
            const r = tapChip(words, chips, placed, c.id)
            if (r.joined) {
              placed = r.placed
              return render()
            }
            b.classList.remove('is-not-yet')
            void b.offsetWidth
            b.classList.add('is-not-yet')
          })
          return b
        }),
      )
      if (lineBuilt(words, placed)) {
        built.classList.add('is-built')
        if (index === lines.length - 1) return allDone()
        answer.replaceChildren(
          button(Q.nextLine, () => {
            index++
            draw()
          }, { variant: 'primary', class: 'btn--huge' }),
        )
      }
    }
    area.replaceChildren(h('p', { class: 'note' }, fill(Q.lineOf, { n: index + 1, total: lines.length })), built, pool, ...(line.meaning ? [h('p', { class: 'lyric-meaning' }, line.meaning)] : []))
    answer.replaceChildren(
      button(P.peek, () => {
        const id = nextChip(words, chips, placed)
        const chip = pool.querySelector(`[data-chip="${id}"]`)
        chip?.classList.add('is-peek')
        window.clearTimeout(peekTimer)
        peekTimer = window.setTimeout(() => chip?.classList.remove('is-peek'), 1500)
      }, { class: 'btn--big' }),
    )
    render()
  }
  draw()
  return () => window.clearTimeout(peekTimer)
}
