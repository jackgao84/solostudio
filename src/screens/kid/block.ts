/**
 * One block of today's plan with a gentle timer (no alarms: when the time is up it just says so).
 * Rap, dance and together blocks list what to practise next for today's sections and any checks
 * that are due; warm-up, water and cool-down show their simple steps.
 */
import { go, save, sectionById, setActiveBlock, getActiveBlock, today, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { blockCopy } from '../../content/blocks'
import { KID_COPY } from '../../content/kid'
import { STEP_COPY } from '../../content/ladders'
import { ROUTINES } from '../../content/routines'
import { LADDERS } from '../../model/ladders'
import { applyOrder, planDay, planInputFrom, type Block } from '../../model/plan'
import { dueItems, nextStep, progressOf } from '../../model/progress'
import type { LadderId } from '../../storage/schema'
import { button } from '../../ui/components'
import { fill, h } from '../../ui/dom'
import { blockTimer, kidScreen, topbar } from './common'
import { listeningRun } from './listen'

const B = KID_COPY.block

const LADDER_OF: Partial<Record<Block['type'], LadderId>> = { rap: 'rap', dance: 'dance', together: 'together' }

export const blockScreen: Screen = (root, { params }) => {
  const t = today()
  const input = planInputFrom(save())
  const day = input ? planDay(input, t) : null
  const block = day ? applyOrder(day.blocks, save().days[t]?.order ?? []).find((b) => b.id === params.id) : null
  if (!day || !block) {
    go('/today')
    return
  }
  const active = getActiveBlock()
  if (!active || active.id !== block.id || active.date !== t) setActiveBlock({ id: block.id, date: t, startedAt: Date.now() })
  const timer = blockTimer()
  const copy = blockCopy(block)
  const el = kidScreen(root, 'block', topbar(timer?.el ?? null), h('h1', null, copy.title), h('p', { class: 'note' }, copy.how))
  if (block.headset) el.append(h('p', { class: 'headset-note' }, B.headsetOn))
  const timeUp = h('p', { class: 'note', hidden: true }, B.timeUp)
  el.append(timeUp)
  const watchTime = window.setInterval(() => {
    if (timer?.el.classList.contains('is-over')) timeUp.hidden = false
  }, 1000)

  const ladder = LADDER_OF[block.type]
  let listening: { el: HTMLElement; destroy: () => void } | null = null
  if (block.type === 'listen') {
    listening = listeningRun()
    el.append(listening.el)
  } else if (block.type === 'warmup' || block.type === 'water' || block.type === 'cooldown') {
    const r = ROUTINES[block.type]
    el.append(h('ol', { class: 'routine' }, ...r.steps.map((s) => h('li', { class: 'routine-step' }, s))))
  } else if (block.type === 'runthrough') {
    el.append(button(B.runthroughGo, () => go(`/showtime?block=${encodeURIComponent(block.id)}`), { variant: 'primary', class: 'btn--big' }))
  } else if (block.type === 'family') {
    el.append(h('p', null, B.familyHow), button(B.familyGo, () => go(`/showtime?family=1&block=${encodeURIComponent(block.id)}`), { variant: 'primary', class: 'btn--big' }))
  } else if (block.drill) {
    el.append(button(KID_COPY.drills.startDrill, () => go(`/drill/${block.drill}?block=${encodeURIComponent(block.id)}`), { variant: 'primary', class: 'btn--big' }))
  } else if (ladder) {
    if (day.phase === 'showDay') el.append(h('p', null, B.showDayHow))
    el.append(stepsFor(ladder, block))
  }

  el.append(
    h(
      'div',
      { class: 'answer' },
      button(
        B.allDone,
        () => {
          update((d) => {
            const s = (d.days[t] ??= { order: [], done: [] })
            if (!s.done.includes(block.id)) s.done.push(block.id)
          })
          setActiveBlock(null)
          go('/today')
        },
        { variant: 'primary', class: 'btn--big' },
      ),
    ),
  )
  return () => {
    timer?.stop()
    window.clearInterval(watchTime)
    listening?.destroy()
  }

  function stepsFor(ladder: LadderId, b: Block): HTMLElement {
    const wrap = h('div', { class: 'block-steps' })
    const ids = [...b.sectionIds]
    const due = dueItems(save().progress, ids.length ? save().sections.map((s) => s.id) : [], t).filter((i) => i.ladder === ladder)
    for (const item of due) if (!ids.includes(item.sectionId)) ids.unshift(item.sectionId)
    const fallback = ids.length ? ids : save().sections.slice(0, 1).map((s) => s.id)
    if (!fallback.length) {
      wrap.append(h('p', { class: 'note' }, KID_COPY.today.noSections))
      return wrap
    }
    wrap.append(h('p', null, B.pick))
    for (const id of fallback) {
      const section = sectionById(id)
      if (!section) continue
      const p = progressOf(save().progress, id)
      const next = nextStep(p, ladder)
      const step = next ?? LADDERS[ladder][LADDERS[ladder].length - 1]
      const isDue = due.some((i) => i.sectionId === id)
      const text = isDue && !next ? fill(B.checkLine, { section: section.name }) : !next ? fill(B.allTicked, { section: section.name }) : fill(B.stepLine, { section: section.name, step: STEP_COPY[step.id].name })
      wrap.append(button(text, () => go(`/practice/${id}/${step.id}`), { class: 'block-step' }))
    }
    return wrap
  }
}
