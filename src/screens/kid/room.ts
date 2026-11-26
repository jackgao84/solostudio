/**
 * The practice room (version 1.3): practice that needs no setup. She picks any video (the mirrored
 * follow-along, the tutorials, the performance, the original, listen-and-read, any video a grown-up
 * added) or her track once it is on the iPad, and plays it with the speed control. She makes her own
 * loop with Loop start and Loop end while it plays and nudges either end; the loop then goes round
 * with the count-in each time. She can name and save a loop as one of her parts, pick it later and
 * tick "I did it" on it at 50, 75 and 100% speed. Her parts are hers to rename or delete.
 *
 * Nothing here ever says a grown-up has to set something up first.
 *
 * From today's session (?session=1) it says the item's cue first: a part of hers loops by itself and
 * "I did it" moves on; with no parts yet (?hint=1) the coach reads the hint on making a loop.
 */
import { save, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { sessionCue, sessionItem, sessionNext } from '../../app/session'
import { lightOn } from '../../audio/sfx'
import { say } from '../../audio/voice'
import { KID_COPY } from '../../content/kid'
import { roomHint } from '../../content/narration'
import type { Player } from '../../media/player'
import { RepLoop, cueTime } from '../../media/reploop'
import { trackPlayer } from '../../media/track'
import { cleanPartName, defaultPartName, defaultSource, nextPartSpeed, partFinished, roomSources, sourceById, tickPart, type RoomSource } from '../../model/room'
import { PART_SPEEDS, type MyPart } from '../../storage/schema'
import { button } from '../../ui/components'
import { CountInView } from '../../ui/countin'
import { fill, h } from '../../ui/dom'
import { LoopButtons } from '../../ui/loop'
import { Narrator } from '../../ui/narrator'
import { referencePlayer, trackArt } from '../../ui/video'
import { blockTimer, kidScreen, topbar } from './common'

const R = KID_COPY.room
const P = KID_COPY.practice

const ROLE_NAMES: Record<string, string> = {
  mirrored: R.sourceMirrored,
  tutorialParts: R.sourceTutorialParts,
  tutorialFull: R.sourceTutorialFull,
  performance: R.sourcePerformance,
  original: R.sourceOriginal,
  listen: R.sourceListen,
  slow: R.sourceSlow,
  track: R.sourceTrack,
}

/** Her name for a video: the kind of video it is, or a grown-up's own name for one from the iPad. */
export function sourceName(src: RoomSource | null): string {
  if (!src) return R.sourceLocal
  if (src.role === 'local') return src.ref?.label.trim() || R.sourceLocal
  return ROLE_NAMES[src.role] ?? R.sourceLocal
}

const speedSteps = (p: Player | null) => (p?.kind === 'youtube' ? [0.5, 0.75, 1] : Array.from({ length: 11 }, (_, i) => Math.round((0.5 + i * 0.05) * 100) / 100))

/** The lamps for a part: one for each speed she ticks it at, lit once ticked. */
export function partLamps(part: Pick<MyPart, 'done'>): HTMLElement {
  return h(
    'span',
    { class: 'path-lamps part-lamps' },
    ...PART_SPEEDS.map((s) => h('span', { class: `lamp lamp--dance${part.done.includes(s) ? ' is-on is-lit' : ''}`, title: fill(P.speed, { speed: Math.round(s * 100) }), 'aria-hidden': 'true' })),
  )
}

export const roomScreen: Screen = (root, { query }) => {
  const timer = blockTimer()
  const d = save()
  let part: MyPart | null = d.parts.find((p) => p.id === query.get('part')) ?? null
  const asked = query.get('source')
  let sourceId: string | null = part?.source ?? (asked && sourceById(d, asked) ? asked : defaultSource(d))
  let speed: number = part ? nextPartSpeed(part) : 1
  let player: Player | null = null
  let rep: RepLoop | null = null
  let raf = 0
  const item = sessionItem(query)
  const inSession = item?.kind === 'room'
  const wantsHint = query.get('hint') === '1'
  // The session's cue: before her part's first go, or before the hint.
  let cue: string | null = inSession ? sessionCue() : null

  const el = kidScreen(root, 'room', topbar(timer?.el ?? null))

  // ---- The head: the room's name, and the part she picked with its lamps ---------------------
  const partHead = h('div', { class: 'room-part', hidden: true })
  el.append(h('header', { class: 'room__head' }, h('h1', null, R.title), partHead))

  // ---- Her side: how to make a loop (until she has a part), the videos, her parts ------------
  const hintLines = roomHint().map((t) => h('p', { class: 'narrated' }, t))
  const narrator = wantsHint && d.narration.on ? new Narrator(hintLines, roomHint()) : null
  const hint = h('section', { class: 'room-hint card', role: 'note' }, narrator?.el ?? null, ...hintLines)
  const sources = h('div', { role: 'radiogroup', 'aria-label': R.pick, class: 'chips room-sources' })
  const pick = h('section', { class: 'room-pick' }, h('h2', null, R.pick), sources)
  const partsList = h('section', { class: 'my-parts' })

  // ---- The player and her buttons -------------------------------------------------------------
  const playerArea = h('div', { class: 'player-area' })
  const countIn = new CountInView()
  const playBtn = button(P.play, () => togglePlay(), { class: 'btn--huge' })
  const didBtn = button(P.didIt, () => didIt(), { variant: 'primary', class: 'btn--huge' })
  const main = h('div', { class: 'answer main-actions' }, playBtn, inSession ? button(KID_COPY.session.next, () => sessionNext(), { class: 'btn--huge' }) : null, didBtn)
  const speedEl = h('p', { class: 'speed' })
  const controls = h('div', { class: 'controls' }, countIn.el, button(P.slower, () => changeSpeed(-1), { variant: 'quiet' }), speedEl, button(P.faster, () => changeSpeed(1), { variant: 'quiet' }))
  const loopBtns = new LoopButtons(
    () => player?.time() ?? 0,
    (loop, why) => {
      if (why === 'made') {
        // It starts going round straight away: a count-in, then her loop.
        rep?.stop()
        rep?.play()
      } else if (why === 'cleared') {
        rep?.stop()
        part = null
      } else if (loop && part) {
        // Nudging one of her parts changes that part.
        const id = part.id
        part = { ...part, from: loop.from, to: loop.to }
        update((s) => {
          const p = s.parts.find((x) => x.id === id)
          if (p) Object.assign(p, { from: loop.from, to: loop.to })
        })
      }
      drawAll()
    },
  )
  const saveRow = h('div', { class: 'room-save' })

  el.append(
    h(
      'div',
      { class: 'room' },
      h('div', { class: 'room__main' }, playerArea, main, controls, loopBtns.el, saveRow),
      h('div', { class: 'room__side' }, hint, pick, partsList),
    ),
  )

  function drawSpeed(): void {
    speedEl.textContent = fill(P.speed, { speed: Math.round(speed * 100) })
  }

  function drawPart(): void {
    partHead.hidden = !part
    didBtn.hidden = !part
    if (!part) return partHead.replaceChildren()
    partHead.replaceChildren(h('p', { class: 'room-part__name' }, part.name), partLamps(part))
    if (partFinished(part)) partHead.append(h('p', { class: 'room-part__done note' }, R.allTicked))
  }

  function drawSources(): void {
    const list = roomSources(save())
    sources.replaceChildren(
      ...list.map((s) => {
        const chip = h('button', { type: 'button', role: 'radio', class: 'chip', 'data-source': s.id, 'aria-checked': s.id === sourceId ? 'true' : 'false' }, sourceName(s))
        chip.addEventListener('click', () => {
          if (s.id === sourceId) return
          part = null
          loopBtns.set(null)
          setSource(s.id)
          drawAll()
        })
        return chip
      }),
    )
  }

  function drawSave(): void {
    saveRow.replaceChildren()
    if (!loopBtns.loop || part) return
    saveRow.append(button(R.savePart, () => askName(), { variant: 'quiet' }))
  }

  function askName(): void {
    const loop = loopBtns.loop
    if (!loop || !sourceId) return
    const input = h('input', { type: 'text', name: 'partName', maxlength: 40, autocomplete: 'off', 'aria-label': R.nameIt, value: defaultPartName(save().parts, R.partName) })
    const form = h(
      'form',
      { class: 'part-form' },
      h('label', { class: 'part-form__label' }, R.nameIt, input),
      h('div', { class: 'row' }, button(R.saveIt, () => undefined, { variant: 'primary', type: 'submit' }), button(R.cancel, () => drawSave(), { variant: 'quiet' })),
    )
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const made: MyPart = {
        id: `part-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        name: cleanPartName(input.value, defaultPartName(save().parts, R.partName)),
        source: sourceId!,
        from: loop.from,
        to: loop.to,
        done: [],
        createdAt: new Date().toISOString(),
      }
      update((s) => {
        s.parts.push(made)
      })
      part = made
      drawAll()
    })
    saveRow.replaceChildren(form)
    input.focus()
  }

  function drawParts(): void {
    const parts = save().parts
    partsList.replaceChildren(
      h('h2', null, R.myParts),
      parts.length
        ? h('ul', { class: 'my-parts__list' }, ...parts.map((p) => partRow(p)))
        : h('p', { class: 'note' }, R.noParts),
    )
  }

  function partRow(p: MyPart): HTMLElement {
    const src = sourceById(save(), p.source)
    const li = h('li', { class: `my-part${part?.id === p.id ? ' is-picked' : ''}`, 'data-part-id': p.id })
    const info = h('div', { class: 'my-part__info' }, h('p', { class: 'my-part__name' }, p.name), h('p', { class: 'my-part__meta' }, src ? fill(R.onVideo, { video: sourceName(src) }) : R.gone), partLamps(p))
    const del = button(R.delete, () => {
      if (del.classList.contains('is-armed')) {
        update((s) => {
          s.parts = s.parts.filter((x) => x.id !== p.id)
        })
        if (part?.id === p.id) part = null
        drawAll()
        return
      }
      del.classList.add('is-armed')
      del.textContent = R.deleteSure
      del.setAttribute('aria-label', R.deleteSure)
    }, { variant: 'quiet', label: fill(R.deleteLabel, { part: p.name }) })
    const actions = h(
      'div',
      { class: 'my-part__actions' },
      src ? button(R.practise, () => pickPart(p), { label: fill(R.practiseLabel, { part: p.name }) }) : null,
      button(R.rename, () => rename(li, p), { variant: 'quiet', label: fill(R.renameLabel, { part: p.name }) }),
      del,
    )
    li.append(info, actions)
    return li
  }

  function rename(li: HTMLElement, p: MyPart): void {
    const input = h('input', { type: 'text', name: 'rename', maxlength: 40, autocomplete: 'off', 'aria-label': R.nameIt, value: p.name })
    const form = h('form', { class: 'part-form' }, input, h('div', { class: 'row' }, button(R.renameSave, () => undefined, { variant: 'primary', type: 'submit' }), button(R.cancel, () => drawParts(), { variant: 'quiet' })))
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const name = cleanPartName(input.value, p.name)
      update((s) => {
        const x = s.parts.find((y) => y.id === p.id)
        if (x) x.name = name
      })
      if (part?.id === p.id) part = { ...part, name }
      drawAll()
    })
    li.replaceChildren(form)
    input.focus()
  }

  function pickPart(p: MyPart): void {
    part = p
    speed = nextPartSpeed(p)
    if (p.source !== sourceId) setSource(p.source)
    else rep?.stop()
    loopBtns.set({ from: p.from, to: p.to })
    applySpeed()
    drawAll()
    window.scrollTo(0, 0)
  }

  function drawAll(): void {
    hint.hidden = save().parts.length > 0 && !wantsHint
    drawPart()
    drawSources()
    drawSave()
    drawParts()
    drawSpeed()
  }

  // ---- Playing ------------------------------------------------------------------------------------
  function setSource(id: string | null): void {
    rep?.destroy()
    player?.destroy()
    rep = null
    player = null
    playerArea.replaceChildren()
    countIn.show(null)
    sourceId = id
    const src = id ? sourceById(save(), id) : null
    if (!src) {
      playerArea.append(h('p', { class: 'note' }, R.gone))
      return
    }
    if (src.kind === 'track') {
      player = trackPlayer(save().track.mediaId!)
      playerArea.append(trackArt())
    } else player = referencePlayer(playerArea, src.ref!)
    speed = nearestStep(speed)
    const r = new RepLoop(
      player,
      () => {
        if (!loopBtns.loop) return null
        const c = cue
        cue = null
        return { from: loopBtns.loop.from, to: loopBtns.loop.to, speed, cue: c }
      },
      () => save().tempo.bpm,
    )
    r.onCount = (w) => countIn.show(w)
    rep = r
  }

  function nearestStep(s: number): number {
    const steps = speedSteps(player)
    return steps.reduce((best, x) => (Math.abs(x - s) < Math.abs(best - s) ? x : best), steps[steps.length - 1])
  }

  function applySpeed(): void {
    speed = nearestStep(speed)
    if (rep) speed = rep.setSpeed(speed)
    drawSpeed()
  }

  function changeSpeed(dir: -1 | 1): void {
    const steps = speedSteps(player)
    const at = steps.reduce((best, r, i) => (Math.abs(r - speed) < Math.abs(steps[best] - speed) ? i : best), 0)
    speed = steps[Math.min(steps.length - 1, Math.max(0, at + dir))]
    applySpeed()
  }

  function togglePlay(): void {
    if (!player) return
    if (loopBtns.loop) return rep?.toggle()
    if (player.playing()) return player.pause()
    const p = player
    void p.ready
      .then(() => {
        if (p !== player) return
        p.setRate(speed)
        p.play()
      })
      .catch(() => undefined)
  }

  function didIt(): void {
    if (!part) return
    const before = part
    const next = tickPart(before, speed)
    update((s) => {
      const i = s.parts.findIndex((x) => x.id === before.id)
      if (i >= 0) s.parts[i] = { ...s.parts[i], done: next.done }
    })
    if (next.done.length > before.done.length) lightOn()
    part = next
    rep?.stop()
    if (inSession) return sessionNext()
    speed = partFinished(next) ? speed : nextPartSpeed(next)
    applySpeed()
    drawAll()
  }

  // Keep Play's word in step with what is happening.
  const tick = () => {
    const on = !!rep?.active() || !!player?.playing()
    const word = on ? P.pause : P.play
    if (playBtn.textContent !== word) playBtn.textContent = word
    raf = window.requestAnimationFrame(tick)
  }
  raf = window.requestAnimationFrame(tick)

  setSource(sourceId)
  if (part) loopBtns.set({ from: part.from, to: part.to })
  applySpeed()
  drawAll()

  // In the session: her part goes round by itself (the cue first); otherwise the cue, then the hint.
  let hintTimer = 0
  const loopNow = rep as RepLoop | null
  if (inSession && part && loopNow) loopNow.play()
  else {
    const c = cue
    cue = null
    if (c) say(c)
    if (narrator) hintTimer = window.setTimeout(() => narrator.start(), c ? cueTime(c) : 0)
  }

  return () => {
    window.clearTimeout(hintTimer)
    narrator?.destroy()
    window.cancelAnimationFrame(raf)
    timer?.stop()
    rep?.destroy()
    player?.destroy()
  }
}
