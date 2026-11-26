/**
 * Practising one rung of one section. The player (her track, a stand-in video, a YouTube reference
 * or a local video) sits on one side; the lyrics and the 8-count sit beside it, never on it. Lines
 * light up karaoke style at any speed. She ticks the rung herself ("I did it") or goes again.
 */
import { go, save, sectionById, today, update } from '../../app/ctx'
import { sessionCue, sessionItem, sessionNext } from '../../app/session'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
import { STEP_COPY } from '../../content/ladders'
import { sectionFadeLevels } from '../../model/fade'
import { LADDERS, stepById } from '../../model/ladders'
import { stepSource, stepVideo } from '../../model/videos'
import { LoopButtons } from '../../ui/loop'
import { celebrate } from '../../app/celebrate'
import { logTick } from '../../model/activity'
import { celebrationsForTick } from '../../model/celebrate'
import { progressOf, reviewLadder, setFade, tickStep } from '../../model/progress'
import { isDue } from '../../model/spacing'
import { lineStarts, wordsOf } from '../../model/sync'
import { PRE_ROLL, mapTime, playRange, previousSection, spanOf } from '../../model/timing'
import type { Player } from '../../media/player'
import { RepLoop } from '../../media/reploop'
import { button, toggle } from '../../ui/components'
import { CountInView } from '../../ui/countin'
import { CountsView } from '../../ui/counts'
import { fill, h } from '../../ui/dom'
import { LyricsView } from '../../ui/lyrics'
import { referencePlayer, trackSource } from '../../ui/video'
import { blockTimer, kidScreen, topbar } from './common'

const P = KID_COPY.practice

export const practiceScreen: Screen = (root, { params, query }) => {
  const section = sectionById(params.section)
  const found = stepById(params.step)
  if (!section || !found) {
    go('/sections')
    return
  }
  const step = found
  const sid = section.id
  // A rap step on a part with no lines (1.3): the listen-and-read video where the words would light up, her track for the rest.
  const source = stepSource(step, section)
  const wordsInVideo = step.ladder === 'rap' && !section.lines.length
  const item = sessionItem(query)
  const inSession = item?.kind === 'practice' && item.sectionId === section.id && item.stepId === found.id
  const prog = () => progressOf(save().progress, sid)
  const timer = blockTimer()
  const copy = STEP_COPY[step.id]
  const el = kidScreen(root, 'practice', topbar(timer?.el ?? null))
  el.append(h('header', { class: 'practice__head' }, h('h1', null, section.name), h('p', { class: 'practice__step' }, copy.name), h('p', { class: 'note' }, copy.how)))

  const notes = h('div', { class: 'practice__notes' })
  el.append(notes)
  const note = (text: string, cls = 'note') => notes.append(h('p', { class: cls }, text))
  if (step.energy === 'half') note(P.energyHalf, 'energy')
  if (step.energy === 'full' && step.ladder === 'together') note(P.energyFull, 'energy')
  if (step.link) {
    const prev = previousSection(save().sections, sid)
    note(prev ? fill(P.linkNote, { previous: prev.name, section: section.name }) : fill(P.linkNoteFirst, { section: section.name }), 'note link-note')
  }
  if (step.source === 'tutorial') note(P.watchNote)
  if (step.source === 'mirrored') note(P.followNote)
  const ladderState = prog()[step.ladder]
  if (ladderState.finishedAt && isDue(ladderState.review, today())) note(P.reviewNote)

  // ---- Stage: player | lyrics and counts ----------------------------------------------------
  const playerArea = h('div', { class: 'player-area' })
  const side = h('div', { class: 'side' })
  const playerCol = h('div', { class: 'player-col' }, playerArea)
  const stage = h('div', { class: 'stage' }, playerCol)
  el.append(stage)

  const trackSpan = spanOf(section.track)
  const tempo = save().tempo
  const wantsWords = step.ladder !== 'dance'
  let lyrics: LyricsView | null = null
  if (wantsWords && section.lines.length) {
    const starts = lineStarts(section.lines.map((l) => l.time), trackSpan)
    lyrics = new LyricsView(section.lines, starts, trackSpan?.end ?? null, (li, wi) => {
      update((d) => {
        const line = d.sections.find((s) => s.id === sid)?.lines[li]
        if (!line) return
        line.breaths = line.breaths.includes(wi) ? line.breaths.filter((x) => x !== wi) : [...line.breaths, wi].sort((a, b) => a - b)
      })
      lyrics?.setLines(sectionById(sid)?.lines ?? [])
    })
    const mode = step.words === 'fade' ? 'fade' : step.words === 'hidden' ? 'hidden' : 'show'
    lyrics.setMode(mode, prog().rap.fade)
  } else if (wordsInVideo) {
    if (source === 'listen') side.append(h('p', { class: 'note' }, P.wordsInVideo))
  } else if (wantsWords) {
    side.append(h('p', { class: 'note' }, P.noLines))
  }

  // The main buttons, big enough to hit from a step away: Play/Pause, Again (or Next in the
  // session), I did it. Reps loop on their own, each with a count-in, until one of them is tapped.
  const countIn = new CountInView()
  const playBtn = button(P.play, () => loop?.toggle(), { class: 'btn--huge' })
  const secondBtn = inSession ? button(KID_COPY.session.next, () => sessionNext(), { class: 'btn--huge' }) : button(P.again, () => loop?.again(), { class: 'btn--huge' })
  const main = h('div', { class: 'answer main-actions' }, playBtn, secondBtn, button(P.didIt, () => didIt(), { variant: 'primary', class: 'btn--huge' }))
  // The count-in shows in the row under the main buttons, so they never move while she heads to her spot.
  const controls = h('div', { class: 'controls' }, countIn.el)
  const speedEl = h('p', { class: 'speed' }, fill(P.speed, { speed: Math.round(step.speed * 100) }))
  let speed = step.speed
  /** Her track goes from 50% to 100% in 5% steps; YouTube offers 50%, 75% and 100%. */
  const changeSpeed = (dir: -1 | 1) => {
    if (!loop || !player) return
    const steps = player.kind === 'youtube' ? [0.5, 0.75, 1] : Array.from({ length: 11 }, (_, i) => Math.round((0.5 + i * 0.05) * 100) / 100)
    const at = steps.reduce((best, r, i) => (Math.abs(r - speed) < Math.abs(steps[best] - speed) ? i : best), 0)
    speed = loop.setSpeed(steps[Math.min(steps.length - 1, Math.max(0, at + dir))])
    speedEl.textContent = fill(P.speed, { speed: Math.round(speed * 100) })
  }
  controls.append(button(P.slower, () => changeSpeed(-1), { variant: 'quiet' }), speedEl, button(P.faster, () => changeSpeed(1), { variant: 'quiet' }))

  if (lyrics) {
    side.append(lyrics.el)
    const extras = h('div', { class: 'row' })
    if (step.words === 'optional') extras.append(toggle(P.showWords, true, (on) => (lyrics!.el.hidden = !on)))
    if (step.words === 'hidden') {
      let peekTimer = 0
      extras.append(
        button(P.peek, () => {
          lyrics!.setPeek(true)
          window.clearTimeout(peekTimer)
          peekTimer = window.setTimeout(() => lyrics?.setPeek(false), 3000)
        }),
      )
      note(P.memoryNote)
    }
    if (step.ladder === 'rap') extras.append(toggle(P.breaths, false, (on) => lyrics!.setEditing(on)))
    if (step.words === 'fade') note(P.fadeNote)
    if (extras.childElementCount) side.append(extras)
  }

  // ---- The player -----------------------------------------------------------------------------
  let player: Player | null = null
  let loop: RepLoop | null = null
  let toTrack: (t: number) => number | null = () => null
  let scale = 1
  let counts: CountsView | null = null
  let loopBtns: LoopButtons | null = null
  let gone = false

  const setPlaying = (on: boolean) => {
    playBtn.textContent = on ? P.pause : P.play
  }
  const tick = (t: number) => {
    const tt = toTrack(t)
    if (tt == null) return
    const rate = (player?.rate() ?? step.speed) * scale
    lyrics?.update(tt, rate)
    counts?.update(tt)
  }
  const disable = (text: string) => {
    playBtn.disabled = true
    if (!inSession) secondBtn.disabled = true
    note(text)
  }

  async function setup(): Promise<void> {
    let from = 0
    let to = Infinity
    if (source === 'track') {
      const src = await trackSource(playerArea, save())
      if (gone) return src?.player.destroy()
      if (!src) return disable(P.needsTrack)
      player = src.player
      if (src.standIn) note(P.standIn)
      if (wordsInVideo) {
        // Her track with her own loop: from where this part starts (or the top), no marks needed.
        ;({ from, to } = trackSpan ? playRange(trackSpan) : { from: 0, to: Infinity })
        const p = player
        loopBtns = new LoopButtons(
          () => p.time(),
          (_l, why) => {
            if (why !== 'nudged') loop?.again()
          },
        )
        controls.after(loopBtns.el)
        toTrack = (t) => t
      } else if (!trackSpan) return disable(P.needsTrackMarks)
      else if (step.link) {
        const prev = previousSection(save().sections, sid)
        const prevStart = prev ? (spanOf(prev.track)?.start ?? trackSpan.start) : 0
        from = Math.max(0, Math.round((prevStart - PRE_ROLL) * 100) / 100)
        if (!prev) from = 0
        to = trackSpan.end
      } else ({ from, to } = playRange(trackSpan))
      toTrack = (t) => t
    } else {
      // Never blocked by marks: a marked video is cued to this section, any other plays from its
      // start (or a chapter time), and she can loop any bit of it herself.
      const v = stepVideo(save(), section!, source)
      if (!v) return disable(P.videoMissing)
      player = referencePlayer(playerArea, v.ref)
      const refSpan = v.span
      if (refSpan) {
        ;({ from, to } = playRange(refSpan))
        if (v.ref.synced && trackSpan) {
          toTrack = (t) => mapTime(refSpan, trackSpan, t)
          scale = (trackSpan.end - trackSpan.start) / (refSpan.end - refSpan.start)
        }
      } else from = v.from
      const p = player
      // Her loop starts going round as soon as she makes it (or stops it); a nudge applies next time round.
      loopBtns = new LoopButtons(
        () => p.time(),
        (_l, why) => {
          if (why !== 'nudged') loop?.again()
        },
      )
      controls.after(loopBtns.el)
    }
    if (step.counts && tempo.bpm && tempo.offset != null && toTrack(from) != null) {
      counts = new CountsView(tempo.bpm, tempo.offset)
      side.insertBefore(counts.el, teacherEl)
    }
    if (side.childElementCount) {
      stage.classList.add('has-side')
      stage.append(side)
    }
    // The session's cue ("Next: Chorus, Dance, 75% speed") is said before the first rep only.
    let cue: string | null = inSession ? sessionCue() : null
    loop = new RepLoop(player, (why) => {
      const own = loopBtns?.loop
      // "Again" when she taps Again (the session's cue comes first, once).
      const rep = { from: own?.from ?? from, to: own?.to ?? to, speed, cue: cue ?? (why === 'again' ? KID_COPY.cues.again : null) }
      cue = null
      return rep
    }, () => save().tempo.bpm)
    loop.onState = (s) => setPlaying(s === 'counting' || s === 'playing' || s === 'resting')
    loop.onTick = tick
    loop.onCount = (w) => countIn.show(w)
    tick(from)
    // In the session the reps start by themselves: she is already on her way to her spot.
    if (inSession) loop.play()
  }

  const teacher = save().notes.teacher[sid]
  const teacherEl = teacher ? h('section', { class: 'teacher-note', role: 'note' }, h('p', { class: 'teacher-note__title' }, P.teacherNote), h('p', null, teacher)) : null
  if (teacherEl) side.append(teacherEl)
  if (side.childElementCount && !side.isConnected) {
    stage.classList.add('has-side')
    stage.append(side)
  }

  if (wantsWords && lyrics && !side.isConnected) {
    stage.classList.add('has-side')
    stage.append(side)
  }
  playerCol.append(main, controls)

  function didIt(): void {
    const s = sectionById(sid)!
    if (step!.words === 'fade' && lyrics) {
      const max = sectionFadeLevels(s.lines.map((l) => wordsOf(l.lyric).length))
      const level = prog().rap.fade
      if (level < max) {
        update((d) => {
          d.progress[sid] = setFade(prog(), level + 1)
        })
        lyrics.setMode('fade', level + 1)
        if (level + 1 >= max) note(P.fadeAllGone)
        return
      }
    }
    const t = today()
    const before = prog()
    celebrate(celebrationsForTick(before, step!.ladder, step!.id), s.name)
    let p = tickStep(before, step!.ladder, step!.id, t)
    if (before[step!.ladder].finishedAt && isDue(p[step!.ladder].review, t)) p = reviewLadder(p, step!.ladder, t)
    update((d) => {
      d.progress[sid] = p
      if (!before[step!.ladder].done.includes(step!.id)) logTick(d, t, sid, step!.id)
    })
    loop?.stop()
    if (inSession) return sessionNext()
    const steps = LADDERS[step!.ladder]
    const next = steps[steps.findIndex((x) => x.id === step!.id) + 1]
    go(next ? `/practice/${sid}/${next.id}` : `/section/${sid}`)
  }

  void setup()
  return () => {
    gone = true
    timer?.stop()
    loop?.destroy()
    player?.destroy()
  }
}
