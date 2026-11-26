/**
 * Recording (optional): the front camera with a mirrored preview records her while her track plays.
 * Before it starts (version 1.2): "Get to your spot" with a countdown of her walk-on time, then the
 * count-in; the recording and the music start together on the 1.
 * The clip plays back beside the reference section, and she picks one thing that went well and one
 * to work on. Clips stay on the iPad (IndexedDB) and never upload: the newest 3 per section and the
 * newest 3 run-throughs are kept, and she is told when an older one is deleted. A recording runs for
 * at least a moment (a Stop straight after the start waits for it), and a clip with nothing in it is
 * never kept: she is told, and can record again.
 */
import { go, save, sectionById, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
import { keepable, stopDelay } from '../../model/clips'
import { playRange, spanOf } from '../../model/timing'
import { keepClip, pickMime } from '../../media/clip-store'
import { runGetReady } from '../../media/countin-run'
import { RangePlayer, type Player } from '../../media/player'
import { CountInView } from '../../ui/countin'
import type { Reference, RefRole } from '../../storage/schema'
import { button } from '../../ui/components'
import { fill, h } from '../../ui/dom'
import { reflectView } from '../../ui/reflect'
import { revokeLater } from '../../media/blob-url'
import { referencePlayer, trackSource, type TrackSource } from '../../ui/video'
import { voiceControl } from '../../ui/voice-control'
import { START_CHOICES } from '../../model/guide'
import type { VoiceLevel } from '../../storage/schema'
import { kidScreen, topbar } from './common'

const R = KID_COPY.record
const BESIDE: readonly RefRole[] = ['performance', 'mirrored', 'original', 'slow', 'listen', 'tutorialParts', 'tutorialFull']

export const recordScreen: Screen = (root, { params }) => {
  const target = params.target
  const isRun = target === 'run'
  const section = isRun ? null : sectionById(target)
  if (!isRun && !section) {
    go('/sections')
    return
  }
  const el = kidScreen(root, 'record', topbar(), h('h1', null, isRun ? R.runTitle : section!.name), h('p', { class: 'note' }, R.how))
  const view = h('div', { class: 'stack' })
  const trackArea = h('div', { class: 'player-area' })
  el.append(view)

  let stream: MediaStream | null = null
  /** The camera's tracks, held for as long as the camera is on, and stopped when she leaves. */
  let tracks: MediaStreamTrack[] = []
  let recorder: MediaRecorder | null = null
  let src: TrackSource | null = null
  let range: RangePlayer | null = null
  let refPlayer: Player | null = null
  let refRange: RangePlayer | null = null
  let clipUrl: string | null = null
  let gone = false
  let cancelCount: (() => void) | null = null
  /** The voice (1.4): recording starts at Off; Light is her choice before she begins. */
  let recVoice: VoiceLevel = 'off'

  const stopCamera = () => {
    for (const t of tracks) t.stop()
    tracks = []
    stream = null
  }

  const startView = () => {
    view.replaceChildren(button(R.startCamera, () => void startCamera(), { variant: 'primary', class: 'btn--big' }))
  }

  async function startCamera(): Promise<void> {
    try {
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true })
        tracks = stream.getTracks()
      }
    } catch (err) {
      console.warn('[solostudio] camera failed', err)
      view.append(h('p', { class: 'note' }, R.cameraOff))
      return
    }
    if (gone) return stopCamera()
    cameraView()
  }

  const cameraView = (note: string | null = null) => {
    const preview = h('video', { class: 'camera-preview', playsinline: true, autoplay: true, muted: true }) as HTMLVideoElement
    preview.muted = true
    preview.srcObject = stream
    void preview.play().catch(() => undefined)
    const vc = src && !src.standIn ? voiceControl(save(), recVoice, START_CHOICES) : null
    if (vc && src) {
      vc.attach(src.player)
      vc.el.addEventListener('click', () => (recVoice = vc.level()))
    }
    view.replaceChildren(preview, trackArea, ...(vc ? [vc.el] : []), h('div', { class: 'row' }, button(R.record, () => void record(), { variant: 'primary', class: 'btn--big' })))
    if (note) view.append(h('p', { class: 'note recording-empty', role: 'status' }, note))
    if (src?.standIn) view.append(h('p', { class: 'note' }, KID_COPY.practice.standIn))
    if (!src) view.append(h('p', { class: 'note' }, R.needsTrack))
  }

  async function record(): Promise<void> {
    if (!stream || !src || cancelCount) return
    const chunks: Blob[] = []
    const mime = pickMime()
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data)
    }
    const stopped = new Promise<void>((resolve) => recorder!.addEventListener('stop', () => resolve(), { once: true }))
    const span = section ? spanOf(section.track) : null
    const { from, to } = span ? playRange(span) : { from: 0, to: src.player.duration() ?? Infinity }
    range = new RangePlayer(src.player, from, to, 1)
    let finished = false
    let startedAt = 0
    const finish = async () => {
      if (finished) return
      finished = true
      // Stopped straight after the start: let it run for a moment, so there is something in it.
      const wait = stopDelay(performance.now() - startedAt)
      if (startedAt && wait > 0) await new Promise((r) => window.setTimeout(r, wait))
      range?.pause()
      if (recorder && recorder.state !== 'inactive') recorder.stop()
      await stopped
      if (gone) return
      const type = (recorder?.mimeType || mime || 'video/mp4').split(';')[0]
      const blob = new Blob(chunks, { type })
      if (!keepable(blob.size)) return cameraView(R.nothingRecorded)
      await keep(blob)
    }
    range.onStop = () => void finish()
    // Time to get ready: "Get to your spot" with her walk-on countdown, then the count-in; the
    // recording and the music start together on the 1.
    const countIn = new CountInView()
    const walkNum = h('span', { class: 'walk-on-count', 'aria-live': 'polite' })
    const ready = h('div', { class: 'get-ready', role: 'status' }, h('span', { class: 'get-ready__words' }, KID_COPY.cues.getToSpot), walkNum)
    const preview = view.querySelector('video.camera-preview') ?? h('span')
    const stopBtn = button(R.stop, () => {
      if (cancelCount) {
        cancelCount()
        cancelCount = null
        return cameraView()
      }
      void finish()
    }, { variant: 'primary', class: 'btn--big' })
    view.replaceChildren(preview, trackArea, ready, countIn.el, h('div', { class: 'row' }, stopBtn))
    const readyView = {
      countdown: (n: number | null) => {
        if (n == null) ready.remove()
        else walkNum.textContent = String(n)
      },
      count: (w: string | null) => countIn.show(w),
    }
    cancelCount = runGetReady(save().showtime.walkOnSeconds, save().tempo.bpm, 1, readyView, () => {
      cancelCount = null
      if (gone || !recorder) return
      countIn.el.replaceWith(h('p', { class: 'rec-dot', role: 'status' }, R.recording))
      recorder.start(500)
      startedAt = performance.now()
      void range?.playFromTop()
    })
  }

  async function keep(blob: Blob): Promise<void> {
    const deleted = await keepClip(blob, isRun ? 'run' : section!.id)
    const notice = deleted ? (isRun ? R.deletedRun : fill(R.deletedOne, { section: section!.name })) : null
    if (!gone) reviewView(blob, notice)
  }

  function referenceFor(): { ref: Reference; from: number } | null {
    const refs = save().refs
    if (isRun) {
      const perf = refs.find((r) => r.role === 'performance' && r.youtubeId)
      return perf ? { ref: perf, from: 0 } : null
    }
    for (const role of BESIDE) {
      const ref = refs.find((r) => r.role === role && (r.kind === 'youtube' ? !!r.youtubeId : !!r.mediaId) && spanOf(section!.refs[r.id]))
      if (ref) return { ref, from: playRange(spanOf(section!.refs[ref.id])!).from }
    }
    const local = refs.find((r) => r.kind === 'local' && r.mediaId && spanOf(section!.refs[r.id]))
    if (local) return { ref: local, from: playRange(spanOf(section!.refs[local.id])!).from }
    // Nothing marked on this section: the performance video from its start (no marks needed).
    const any = BESIDE.map((role) => refs.find((r) => r.role === role && r.kind === 'youtube' && !!r.youtubeId)).find(Boolean)
    return any ? { ref: any, from: 0 } : null
  }

  function reviewView(blob: Blob, notice: string | null): void {
    range?.destroy()
    range = null
    revokeLater(clipUrl)
    clipUrl = URL.createObjectURL(blob)
    const clip = h('video', { class: `clip-player${save().settings.mirrorClips ? ' is-mirrored' : ''}`, playsinline: true, controls: true, src: clipUrl }) as HTMLVideoElement
    const refPane = h('div', { class: 'ref-pane' })
    const beside = referenceFor()
    refPlayer?.destroy()
    refPlayer = null
    refRange = null
    if (beside) {
      refPlayer = referencePlayer(refPane, beside.ref)
      refRange = new RangePlayer(refPlayer, beside.from, Infinity, 1)
    }
    const wrap = h(
      'div',
      { class: 'stack', 'data-view': 'review' },
      notice ? h('p', { class: 'notice', role: 'status' }, notice) : null,
      h('div', { class: 'side-by-side' }, h('div', { class: 'clip-pane' }, h('h2', { class: 'pane-title' }, R.you), clip), h('div', null, h('h2', { class: 'pane-title' }, R.reference), refPane)),
      h(
        'div',
        { class: 'row' },
        button(R.playBoth, () => {
          clip.currentTime = 0
          void clip.play().catch(() => undefined)
          void refRange?.playFromTop()
        }),
        button(R.recordAgain, () => {
          refRange?.destroy()
          refPlayer?.destroy()
          refPlayer = null
          refRange = null
          if (stream) cameraView()
          else void startCamera()
        }),
      ),
      reflectView((r) =>
        update((d) => {
          d.reflections.push({ id: `refl-${Date.now()}`, at: new Date().toISOString(), kind: 'clip', target: isRun ? 'run' : section!.id, wentWell: r.wentWell, workOn: r.workOn })
        }),
      ),
    )
    view.replaceChildren(wrap)
  }

  startView()
  void (async () => {
    src = await trackSource(trackArea, save(), undefined, recVoice)
    if (gone) src?.player.destroy()
  })()

  return () => {
    gone = true
    cancelCount?.()
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    stopCamera()
    range?.destroy()
    refRange?.destroy()
    refPlayer?.destroy()
    src?.player.destroy()
    revokeLater(clipUrl)
  }
}
