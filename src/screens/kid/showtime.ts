/**
 * Showtime: the whole routine, then her whole track from the top without stopping (version 1.1).
 *   backstage breathing (a circle, 4 s in, 6 s out) → "I'm excited!" → the walk to her spot with a
 *   countdown → the opening pose held for a spoken "5, 6, 7, 8" → her track (lyrics optional, no
 *   video unless a video stands in for her track) → ending pose → bow → applause → walk off.
 * There is no pause: a tap on the stage just says "keep going". A press-and-hold stops it. The
 * audience (a gentle crowd before, applause after) is optional and never plays over her track; cues
 * are never spoken over it either. The walk-on and the bow can be practised on their own.
 * Afterwards: one thing that went well, one to work on, and Up Anyway if someone watched.
 * With ?family=1 it is "perform for your family".
 * Film my Showtime (version 1.2): the front camera films the show. The walk-on countdown and the
 * opening pose's count are her time to get ready; filming starts with her track and stops after the
 * bow. The clip is kept with her run-throughs (newest 3).
 *
 * The player stays in one place in the page the whole time (a YouTube player that is moved reloads),
 * and a video standing in for her track is shown only while it plays.
 */
import { go, save, sectionsInOrder, today, update } from '../../app/ctx'
import { sessionCue, sessionItem, sessionNext } from '../../app/session'
import type { Screen } from '../../app/router'
import { GATE_HOLD_MS } from '../../app/gate'
import { confettiPop, playApplause, startCrowd, type SoundHandle } from '../../audio/sfx'
import { celebrateShowtime } from '../../model/celebrate'
import { hush, say } from '../../audio/voice'
import { KID_COPY } from '../../content/kid'
import { countInSchedule } from '../../model/countin'
import { BREATH_IN_S, BREATH_OUT_S, POSE_CUE_MS, bowRoutine, showtimeRoutine, walkOnRoutine, type RoutineStep } from '../../model/routine'
import { LINE_LEAD, lineStarts } from '../../model/sync'
import { spanOf } from '../../model/timing'
import { RangePlayer } from '../../media/player'
import { keepClip, pickMime } from '../../media/clip-store'
import { button, holdButton, toggle } from '../../ui/components'
import { h } from '../../ui/dom'
import { reflectView } from '../../ui/reflect'
import { trackSource, type TrackSource } from '../../ui/video'
import { kidScreen, topbar } from './common'

const S = KID_COPY.showtime

/** Every timed line of the song, in order, on her track's clock. */
function songLines(): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = []
  for (const s of sectionsInOrder()) {
    const starts = lineStarts(s.lines.map((l) => l.time), spanOf(s.track))
    if (!starts) continue
    s.lines.forEach((l, i) => out.push({ start: starts[i], text: l.lyric }))
  }
  return out.sort((a, b) => a.start - b.start)
}

/** Paper confetti falling from the top of the screen (no player is on screen by then). */
function confettiBurst(): HTMLElement {
  const colours = ['var(--pink)', 'var(--violet)', 'var(--cyan)', 'var(--lime)', 'var(--gold)']
  return h(
    'div',
    { class: 'confetti', 'aria-hidden': 'true' },
    ...Array.from({ length: 48 }, (_, i) => h('span', { style: `--x:${(i * 37) % 100}%;--d:${(i % 7) * 0.12}s;--r:${(i * 53) % 360}deg;--c:${colours[i % colours.length]}` })),
  )
}

export const showtimeScreen: Screen = (root, { query }) => {
  const family = query.get('family') === '1'
  const blockId = query.get('block')
  const item = sessionItem(query)
  const inSession = item?.kind === 'showtime' && item.blockId === blockId
  const el = kidScreen(root, 'showtime', topbar())
  const top = h('div', { class: 'stack showtime-top' })
  const playerArea = h('div', { class: 'player-area', hidden: true })
  const bottom = h('div', { class: 'stack showtime-bottom' })
  const filmSlot = h('div', { class: 'film-slot' })
  el.append(top, playerArea, bottom, filmSlot)
  let words = save().settings.showtimeLyrics
  let src: TrackSource | null = null
  let loaded = false
  let range: RangePlayer | null = null
  let run = 0
  let gone = false
  let crowd: SoundHandle | null = null
  let clap: SoundHandle | null = null
  let keepTimer = 0
  const timers = new Set<number>()
  // Film my Showtime: the camera's stream for this show, and its recorder once her track starts.
  let film = false
  let cam: MediaStream | null = null
  /** The camera's tracks, held from the moment it starts (WebKit hands out fresh wrappers later). */
  let camTracks: MediaStreamTrack[] = []
  let recorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  const stopCam = () => {
    for (const t of camTracks) t.stop()
    camTracks = []
    cam = null
  }
  const stopFilming = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const r = recorder
      recorder = null
      filmSlot.replaceChildren()
      if (!r || r.state === 'inactive') return resolve(null)
      r.addEventListener('stop', () => resolve(chunks.length ? new Blob(chunks, { type: (r.mimeType || 'video/mp4').split(';')[0] }) : null), { once: true })
      r.stop()
    })
  const startFilming = () => {
    if (!cam || recorder) return
    chunks = []
    const mime = pickMime()
    try {
      recorder = mime ? new MediaRecorder(cam, { mimeType: mime }) : new MediaRecorder(cam)
    } catch (err) {
      console.warn('[solostudio] filming failed', err)
      return
    }
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data)
    }
    recorder.start(500)
    filmSlot.replaceChildren(h('p', { class: 'rec-dot', role: 'status' }, KID_COPY.record.recording))
  }

  /** Wait, unless this run is stopped meanwhile (then false). */
  const wait = (ms: number, id: number) =>
    new Promise<boolean>((resolve) => {
      const t = window.setTimeout(() => {
        timers.delete(t)
        resolve(id === run && !gone)
      }, ms)
      timers.add(t)
    })

  const cancel = () => {
    run++
    for (const t of timers) window.clearTimeout(t)
    timers.clear()
    window.clearTimeout(keepTimer)
    hush()
    void stopFilming()
    stopCam()
    range?.destroy()
    range = null
    crowd?.stop()
    clap?.stop()
    crowd = clap = null
  }

  const audienceOn = () => save().sound.audience
  const stopHold = () => h('div', { class: 'row' }, holdButton(S.stopHold, GATE_HOLD_MS, () => startView(), 'stop-hold'))

  function startView(done: string | null = null): void {
    cancel()
    // A video standing in for her track shows only while it plays, so Start is always in reach.
    playerArea.hidden = true
    top.replaceChildren(
      ...([
        h('h1', null, family ? S.familyTitle : S.title),
        h('p', null, family ? KID_COPY.block.familyHow : S.how),
        done ? h('p', { class: 'routine-done', role: 'status' }, done) : null,
        src?.standIn ? h('p', { class: 'note' }, S.standIn) : null,
        loaded && !src ? h('p', { class: 'note' }, KID_COPY.practice.needsTrack) : null,
      ].filter(Boolean) as Node[]),
    )
    bottom.replaceChildren(
      h(
        'div',
        { class: 'row' },
        toggle(S.showWords, words, (on) => {
          words = on
          update((d) => (d.settings.showtimeLyrics = on))
        }),
        toggle(S.audience, audienceOn(), (on) => update((d) => (d.sound.audience = on))),
        toggle(S.film, film, (on) => (film = on)),
      ),
      h('div', { class: 'row' }, button(S.start, () => void full(), { variant: 'primary', class: 'btn--huge', disabled: loaded && !src })),
      h('div', { class: 'row' }, button(S.practiseWalkOn, () => void walkOn()), button(S.practiseBow, () => void bow())),
    )
  }

  /** One timed step of the routine, on its own stage (never over a player). */
  async function step(s: RoutineStep, id: number): Promise<boolean> {
    playerArea.hidden = true
    const stage = h('div', { class: 'routine-stage', 'data-step': s.id })
    top.replaceChildren(stage)
    bottom.replaceChildren(stopHold())
    if (s.id === 'breathe') {
      const word = h('span', { class: 'breath-word' })
      const circle = h('div', { class: 'breath-circle', 'data-phase': 'out' }, word)
      stage.append(h('p', { class: 'routine-words' }, s.words), h('div', { class: 'breath-wrap' }, circle))
      const breaths = Math.round((s.seconds ?? 0) / (BREATH_IN_S + BREATH_OUT_S))
      for (let k = 0; k < breaths; k++) {
        for (const [phase, secs, text] of [
          ['in', BREATH_IN_S, S.breatheIn],
          ['out', BREATH_OUT_S, S.breatheOut],
        ] as const) {
          circle.style.setProperty('--breath-s', `${secs}s`)
          circle.setAttribute('data-phase', phase)
          word.textContent = text
          say(text)
          if (!(await wait(secs * 1000, id))) return false
        }
      }
      return true
    }
    stage.append(h('p', { class: 'routine-words' }, s.words))
    if (s.cue) say(s.cue)
    if (s.id === 'walk') {
      const count = h('p', { class: 'walk-count', 'aria-live': 'polite' })
      stage.append(count)
      for (let n = s.seconds ?? 0; n > 0; n--) {
        count.textContent = String(n)
        if (!(await wait(1000, id))) return false
      }
      return true
    }
    if (s.id === 'pose') {
      const count = h('p', { class: 'count-in' })
      stage.append(count)
      const plan = countInSchedule(save().tempo.bpm, 1, POSE_CUE_MS)
      let at = 0
      for (const [i, ms] of plan.beats.entries()) {
        if (!(await wait(ms - at, id))) return false
        at = ms
        const w = s.count?.[i] ?? ''
        count.textContent = w
        say(w)
      }
      if (!(await wait(plan.playAt - at, id))) return false
      hush()
      return true
    }
    return wait((s.seconds ?? 0) * 1000, id)
  }

  /** Her whole track from the top: no pause, keep going, a press-and-hold to stop. */
  function track(id: number): Promise<boolean> {
    if (!src) return Promise.resolve(false)
    const lines = songLines()
    const lyric = h('span', { class: 'showtime-lyric' })
    const keep = h('span', { class: 'keep-going', role: 'status', hidden: true }, h('span', null, S.keepGoing), h('span', { class: 'note' }, S.keepGoingMore))
    const bar = h('div', { class: 'progress__bar' })
    lyric.textContent = S.title
    lyric.classList.add('is-idle')
    const stageEl = h('button', { type: 'button', class: 'showtime-stage' }, lyric, keep)
    stageEl.addEventListener('click', () => {
      keep.hidden = false
      window.clearTimeout(keepTimer)
      keepTimer = window.setTimeout(() => (keep.hidden = true), 2500)
    })
    top.replaceChildren(stageEl)
    playerArea.hidden = !src.standIn
    bottom.replaceChildren(h('div', { class: 'progress', 'aria-hidden': 'true' }, bar), stopHold())
    const player = src.player
    const r = new RangePlayer(player, 0, player.duration() ?? Infinity, 1)
    range = r
    r.onTick = (t) => {
      if (words) {
        let current = ''
        for (const l of lines) if (l.start - LINE_LEAD <= t) current = l.text
        const text = current || S.title
        if (lyric.textContent !== text) lyric.textContent = text
        lyric.classList.toggle('is-idle', !current)
      }
      const d = player.duration()
      if (d) bar.style.width = `${Math.min(100, (t / d) * 100)}%`
    }
    return new Promise((resolve) => {
      r.onStop = () => resolve(id === run && !gone)
      void r.playFromTop().then((ok) => !ok && resolve(false))
    })
  }

  /** Run steps in order; the audience comes and goes around her track. */
  async function steps(list: RoutineStep[], id: number): Promise<boolean> {
    for (const s of list) {
      if (s.id === 'excited' && audienceOn()) crowd = startCrowd()
      if (s.id === 'pose' && crowd) {
        crowd.stop(1.2)
        crowd = null
      }
      if (s.id === 'bow' && audienceOn()) clap = playApplause()
      if (s.id === 'track') startFilming()
      const ok = s.id === 'track' ? await track(id) : await step(s, id)
      if (s.id === 'track') {
        range?.destroy()
        range = null
        playerArea.hidden = true
      }
      if (!ok) return false
    }
    return true
  }

  async function full(): Promise<void> {
    if (!src) return
    cancel()
    const id = run
    if (film) {
      try {
        cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true })
        camTracks = cam.getTracks()
      } catch (err) {
        console.warn('[solostudio] camera failed', err)
        cam = null
      }
      if (id !== run || gone) return stopCam()
    }
    if (!(await steps(showtimeRoutine(save().showtime), id))) return
    const clip = await stopFilming()
    stopCam()
    if (gone) return
    let saved = false
    if (clip) {
      try {
        await keepClip(clip, 'run')
        saved = true
      } catch (err) {
        console.warn('[solostudio] keeping the clip failed', err)
      }
    }
    after(saved)
  }

  async function walkOn(): Promise<void> {
    cancel()
    const id = run
    if (await steps(walkOnRoutine(save().showtime), id)) startView(S.walkOnDone)
  }

  async function bow(): Promise<void> {
    cancel()
    const id = run
    if (await steps(bowRoutine(), id)) startView(S.bowDone)
  }

  function after(filmed = false): void {
    if (blockId) {
      update((d) => {
        const s = (d.days[today()] ??= { order: [], done: [] })
        if (!s.done.includes(blockId)) s.done.push(blockId)
      })
    }
    const brave = () => [h('p', null, KID_COPY.reflect.braveNote), h('a', { class: 'btn upanyway-link', href: save().settings.upAnywayUrl, target: '_blank', rel: 'noopener noreferrer' }, KID_COPY.reflect.upAnyway)]
    const watched = h('div', { class: 'stack' })
    if (family) watched.append(...brave())
    else watched.append(button(S.someoneWatched, () => watched.replaceChildren(...brave())))
    playerArea.hidden = true
    // Confetti for her first full Showtime, once (for doing it, nothing else).
    const confetti = celebrateShowtime(save())
    if (confetti) {
      update((d) => (d.celebrated.firstShowtime = true))
      confettiPop()
    }
    top.replaceChildren(
      ...(confetti ? [confettiBurst()] : []),
      h('h1', null, S.finished),
      ...(filmed ? [h('div', { class: 'film-saved row', role: 'status' }, h('p', null, S.filmSaved), button(KID_COPY.nav.clips, () => go('/clips')))] : []),
    )
    bottom.replaceChildren(
      reflectView(
        (r) =>
          update((d) => {
            d.reflections.push({ id: `refl-${Date.now()}`, at: new Date().toISOString(), kind: family ? 'family' : 'showtime', target: 'run', wentWell: r.wentWell, workOn: r.workOn })
          }),
        [watched, h('div', { class: 'row' }, button(S.again, () => startView()), button(S.recordRun, () => go('/record/run')))],
      ),
      ...(inSession ? [h('div', { class: 'answer main-actions' }, button(KID_COPY.session.next, () => sessionNext(), { class: 'btn--huge' }))] : []),
    )
  }

  startView()
  void (async () => {
    src = await trackSource(playerArea, save())
    if (gone) return src?.player.destroy()
    loaded = true
    if (!top.querySelector('.routine-stage, .showtime-stage')) startView()
    // In the session: say what's next, then the routine starts by itself.
    if (inSession && src) {
      say(sessionCue())
      const t = window.setTimeout(() => void full(), 2500)
      timers.add(t)
    }
  })()

  return () => {
    gone = true
    cancel()
    src?.player.destroy()
  }
}
