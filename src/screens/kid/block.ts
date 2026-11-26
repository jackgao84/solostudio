/**
 * One block of today's plan with a gentle timer (no alarms: when the time is up it just says so).
 * Rap, dance and together blocks list what to practise next for today's sections and any checks
 * that are due; warm-up, water and cool-down show their simple steps.
 */
import { go, save, sectionById, setActiveBlock, getActiveBlock, today, update } from '../../app/ctx'
import { sessionCue, sessionItem, sessionNext } from '../../app/session'
import { say } from '../../audio/voice'
import type { Screen } from '../../app/router'
import { blockCopy } from '../../content/blocks'
import { KID_COPY } from '../../content/kid'
import { ROUTINES } from '../../content/routines'
import { applyOrder, type Block } from '../../model/plan'
import { todayPlan } from '../../model/today'
import { practiceChoices, roomItems, routeFor } from '../../model/session'
import type { LadderId } from '../../storage/schema'
import { button } from '../../ui/components'
import { fill, h } from '../../ui/dom'
import { blockTimer, kidScreen, rungCopy, topbar } from './common'
import { listeningRun } from './listen'

const B = KID_COPY.block

const LADDER_OF: Partial<Record<Block['type'], LadderId>> = { rap: 'rap', dance: 'dance', together: 'together' }

export const blockScreen: Screen = (root, { params, query }) => {
  const t = today()
  const day = todayPlan(save(), t)
  const block = day ? applyOrder(day.blocks, save().days[t]?.order ?? []).find((b) => b.id === params.id) : null
  if (!day || !block) {
    go('/today')
    return
  }
  const item = sessionItem(query)
  const inSession = !!item && item.blockId === block.id
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
    listening = listeningRun({ autoStart: inSession })
    el.append(listening.el)
  } else if (block.type === 'warmup' || block.type === 'water' || block.type === 'cooldown') {
    const r = ROUTINES[block.type]
    el.append(h('ol', { class: 'routine' }, ...r.steps.map((s) => h('li', { class: 'routine-step' }, s))))
  } else if (block.type === 'runthrough') {
    el.append(button(B.runthroughGo, () => go(`/showtime?block=${encodeURIComponent(block.id)}`), { variant: 'primary', class: 'btn--huge' }))
  } else if (block.type === 'family') {
    el.append(h('p', null, B.familyHow), button(B.familyGo, () => go(`/showtime?family=1&block=${encodeURIComponent(block.id)}`), { variant: 'primary', class: 'btn--huge' }))
  } else if (block.drill) {
    el.append(button(KID_COPY.drills.startDrill, () => go(`/drill/${block.drill}?block=${encodeURIComponent(block.id)}`), { variant: 'primary', class: 'btn--huge' }))
  } else if (ladder) {
    if (day.phase === 'showDay') el.append(h('p', null, B.showDayHow))
    el.append(stepsFor(ladder, block))
  }

  // In the session: say what's next, and Next moves on (the block is marked done as she leaves it).
  if (inSession) {
    say(sessionCue())
    el.append(h('div', { class: 'answer main-actions' }, button(KID_COPY.session.next, () => sessionNext(), { variant: block.type === 'listen' ? undefined : 'primary', class: 'btn--huge' })))
  } else {
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
          { variant: block.type === 'listen' || block.drill || block.type === 'runthrough' || block.type === 'family' ? undefined : 'primary', class: 'btn--big' },
        ),
      ),
    )
  }
  return () => {
    timer?.stop()
    window.clearInterval(watchTime)
    listening?.destroy()
  }

  function stepsFor(_ladder: LadderId, b: Block): HTMLElement {
    const wrap = h('div', { class: 'block-steps' })
    if (!save().sections.length) {
      // No grown-up sections yet (version 1.3): the practice room, on her parts or a video.
      for (const r of roomItems(save(), b)) {
        if (r.kind !== 'room') continue
        const part = r.partId ? save().parts.find((p) => p.id === r.partId) : null
        const to = routeFor(r).replace(/&session=1$/, '')
        wrap.append(part ? button(part.name, () => go(to), { class: 'block-step' }) : button(KID_COPY.room.open, () => go(to), { variant: 'primary', class: 'btn--huge' }))
      }
      return wrap
    }
    const choices = practiceChoices(save(), b, t)
    wrap.append(h('p', null, B.pick))
    for (const c of choices) {
      const section = sectionById(c.sectionId)!
      const text = c.check ? fill(B.checkLine, { section: section.name }) : c.finished ? fill(B.allTicked, { section: section.name }) : fill(B.stepLine, { section: section.name, step: rungCopy(section, c.stepId).name })
      wrap.append(button(text, () => go(`/practice/${c.sectionId}/${c.stepId}`), { class: 'block-step' }))
    }
    return wrap
  }
}
