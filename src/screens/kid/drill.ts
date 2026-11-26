/**
 * The drills, from the together phase on (version 1.1).
 *  - Start anywhere: a random section (shaky ones more often, never the same twice in a row), named
 *    out loud, a count-in, then rap and dance together from right there. The words and the video are
 *    optional. Next drops her somewhere else; the reps keep coming until she pauses.
 *  - Jump back in: her track, and once in each rep the music drops out for 2 to 4 seconds while the
 *    track keeps its place, or skips ahead one line. She keeps going and picks it back up.
 * The player sits beside the words and counts, never under anything.
 */
import { go, save, sectionsInOrder, setActiveBlock, today, update } from '../../app/ctx'
import { sessionCue, sessionItem, sessionNext } from '../../app/session'
import type { Screen } from '../../app/router'
import { DRILL_COPY } from '../../content/blocks'
import { KID_COPY } from '../../content/kid'
import { pickSection, planRejoin, type RejoinEvent } from '../../model/drills'
import { pickReference } from '../../model/ladders'
import type { Drill } from '../../model/plan'
import { lineStarts } from '../../model/sync'
import { mapTime, spanOf } from '../../model/timing'
import type { Player } from '../../media/player'
import { RepLoop, type Rep, type RepReason } from '../../media/reploop'
import type { Reference, Section } from '../../storage/schema'
import { button, toggle } from '../../ui/components'
import { CountInView } from '../../ui/countin'
import { CountsView } from '../../ui/counts'
import { fill, h } from '../../ui/dom'
import { LyricsView } from '../../ui/lyrics'
import { referencePlayer, trackSource } from '../../ui/video'
import { blockTimer, kidScreen, topbar } from './common'

const D = KID_COPY.drills
const P = KID_COPY.practice

/** A small lead-in before the section, so a rejoin rep doesn't start on its first word. */
const REJOIN_LEAD_S = 1

export const drillScreen: Screen = (root, { params, query }) => {
  const drill: Drill | null = params.kind === 'anywhere' || params.kind === 'rejoin' ? params.kind : null
  if (!drill) {
    go('/today')
    return
  }
  const blockId = query.get('block')
  const item = sessionItem(query)
  const inSession = item?.kind === 'drill' && item.drill === drill
  let sessionCueLeft: string | null = inSession ? sessionCue() : null
  const timer = blockTimer()
  const copy = DRILL_COPY[drill]
  const el = kidScreen(root, 'drill', topbar(timer?.el ?? null), h('header', { class: 'practice__head' }, h('h1', null, copy.title), h('p', { class: 'note' }, drill === 'anywhere' ? D.anywhereHow : D.rejoinHow)))
  el.setAttribute('data-drill', drill)

  const notes = h('div', { class: 'practice__notes' })
  const note = (text: string) => {
    if (!Array.from(notes.children).some((n) => n.textContent === text)) notes.append(h('p', { class: 'note' }, text))
  }
  const playerArea = h('div', { class: 'player-area' })
  const nowEl = h('p', { class: 'drill-now', role: 'status' })
  const keep = h('p', { class: 'keep-going', role: 'status', hidden: true }, D.keepGoing)
  const countIn = new CountInView()
  const lyricsSlot = h('div', { class: 'drill-lyrics' })
  const countsSlot = h('div', { class: 'drill-counts' })
  const side = h('div', { class: 'side' }, nowEl, keep, lyricsSlot, countsSlot)

  let words = true
  let video = false
  let gone = false
  let player: Player | null = null
  let loop: RepLoop | null = null
  let ref: Reference | null = null
  let current: Section | null = null
  let lyrics: LyricsView | null = null
  let counts: CountsView | null = null
  let toTrack: (t: number) => number = (t) => t
  let scale = 1
  let event: RejoinEvent | null = null
  let fired = false
  let eventTimer = 0

  const playBtn = button(P.play, () => loop?.toggle(), { class: 'btn--huge' })
  const nextBtn = button(D.next, () => loop?.skip(), { class: 'btn--huge' })
  const doneBtn = inSession ? button(P.didIt, () => sessionNext(), { variant: 'primary', class: 'btn--huge' }) : null
  const toggles = h('div', { class: 'row' }, countIn.el, toggle(P.showWords, true, (on) => {
    words = on
    if (lyrics) lyrics.el.hidden = !on
  }))
  if (drill === 'anywhere') toggles.append(toggle(D.showVideo, false, (on) => {
    video = on
    void setSource()
  }))
  const playerCol = h('div', { class: 'player-col' }, playerArea, h('div', { class: 'answer main-actions' }, playBtn, nextBtn, doneBtn), toggles)
  el.append(notes, h('div', { class: 'stage has-side' }, playerCol, side))
  if (blockId && !inSession) el.append(h('div', { class: 'answer' }, button(KID_COPY.block.allDone, () => finishBlock(blockId), { class: 'btn--big' })))

  /** Sections she can be dropped into: marked on her track (and on the video, when it's on). */
  const eligible = (): Section[] => sectionsInOrder().filter((s) => spanOf(s.track) && (!video || (ref && spanOf(s.refs[ref.id]))))

  const endEvent = () => {
    window.clearTimeout(eventTimer)
    player?.setMuted(false)
    keep.hidden = true
  }

  const fire = (e: RejoinEvent) => {
    fired = true
    keep.hidden = false
    if (e.kind === 'dropout') {
      player?.setMuted(true)
      eventTimer = window.setTimeout(endEvent, e.seconds * 1000)
    } else {
      player?.seek(e.to)
      eventTimer = window.setTimeout(() => (keep.hidden = true), 1500)
    }
  }

  const tick = (t: number) => {
    const tt = toTrack(t)
    lyrics?.update(tt, (player?.rate() ?? 1) * scale)
    counts?.update(tt)
    if (event && !fired && loop?.state === 'playing' && tt >= event.at) fire(event)
  }

  const show = (s: Section) => {
    nowEl.textContent = fill(D.now, { section: s.name })
    const span = spanOf(s.track)
    lyrics = s.lines.length ? new LyricsView(s.lines, lineStarts(s.lines.map((l) => l.time), span), span?.end ?? null) : null
    if (lyrics) lyrics.el.hidden = !words
    lyricsSlot.replaceChildren(...(lyrics ? [lyrics.el] : []))
  }

  const repFor = (s: Section): Rep => {
    const trackSpan = spanOf(s.track)!
    // In the session, the first rep also says which drill this is ("Next: Start anywhere").
    const cue = [sessionCueLeft, fill(KID_COPY.cues.nextSection, { section: s.name })].filter(Boolean).join('. ')
    sessionCueLeft = null
    event = null
    fired = false
    if (video && ref) {
      const refSpan = spanOf(s.refs[ref.id])!
      toTrack = ref.synced ? (t) => mapTime(refSpan, trackSpan, t) : () => -1
      scale = (trackSpan.end - trackSpan.start) / (refSpan.end - refSpan.start)
      return { from: refSpan.start, to: refSpan.end, speed: 1, cue }
    }
    toTrack = (t) => t
    scale = 1
    if (drill === 'rejoin') {
      event = planRejoin(lineStarts(s.lines.map((l) => l.time), trackSpan) ?? [], trackSpan, Math.random)
      return { from: Math.max(0, trackSpan.start - REJOIN_LEAD_S), to: trackSpan.end, speed: 1, cue }
    }
    return { from: trackSpan.start, to: trackSpan.end, speed: 1, cue }
  }

  const nextRep = (why: RepReason): Rep | null => {
    if (why === 'again' && current) return repFor(current)
    const list = eligible()
    const shaky = new Set(Object.entries(save().progress).filter(([, p]) => p.shaky).map(([id]) => id))
    const id = pickSection(list.map((s) => s.id), shaky, Math.random, current?.id ?? null)
    const s = list.find((x) => x.id === id)
    if (!s) {
      note(D.needsMarks)
      return null
    }
    current = s
    show(s)
    return repFor(s)
  }

  async function setSource(): Promise<void> {
    endEvent()
    loop?.destroy()
    loop = null
    player?.destroy()
    player = null
    playerArea.replaceChildren()
    playBtn.textContent = P.play
    if (video) {
      ref = pickReference(save().refs, eligible()[0] ?? sectionsInOrder()[0] ?? ({ refs: {} } as Section), 'mirrored')
      if (!ref) return note(P.needsMarks)
      player = referencePlayer(playerArea, ref)
    } else {
      ref = null
      const src = await trackSource(playerArea, save())
      if (gone) return src?.player.destroy()
      if (!src) return note(P.needsTrack)
      player = src.player
      if (src.standIn) note(P.standIn)
    }
    const tempo = save().tempo
    if (!counts && tempo.bpm && tempo.offset != null) {
      counts = new CountsView(tempo.bpm, tempo.offset)
      countsSlot.append(counts.el)
    }
    loop = new RepLoop(player, nextRep, () => save().tempo.bpm)
    loop.onState = (s) => {
      playBtn.textContent = s === 'idle' || s === 'paused' ? P.play : P.pause
      if (s !== 'playing') endEvent()
    }
    loop.onTick = tick
    loop.onCount = (w) => countIn.show(w)
    if (!eligible().length) note(D.needsMarks)
    else if (inSession && !video) loop.play()
  }

  void setSource()
  return () => {
    gone = true
    endEvent()
    timer?.stop()
    loop?.destroy()
    player?.destroy()
  }
}

function finishBlock(blockId: string): void {
  update((d) => {
    const s = (d.days[today()] ??= { order: [], done: [] })
    if (!s.done.includes(blockId)) s.done.push(blockId)
  })
  setActiveBlock(null)
  go('/today')
}
