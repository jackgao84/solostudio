/**
 * The coach reading a lesson aloud (version 1.2), line by line, exactly the words on screen. The line
 * being read is lit. She can pause it (Play carries on from the same place), replay the line, or skip
 * to the next one. It pauses by itself when a video starts, so nothing is ever read over a video.
 */
import { save } from '../app/ctx'
import { playClip, preloadClips, type ClipPlayback } from '../audio/narration'
import { clipFor } from '../audio/speech-plan'
import { KID_COPY } from '../content/kid'
import { mediaPlaying } from '../media/now-playing'
import { button } from './components'
import { h } from './dom'

const N = KID_COPY.narrator
/** A breath between lines. */
const GAP_MS = 450

export class Narrator {
  readonly el: HTMLElement
  onFinished: (() => void) | null = null
  private index = 0
  private state: 'idle' | 'reading' | 'paused' | 'done' = 'idle'
  private playback: ClipPlayback | null = null
  /** Where Pause left the current line (seconds into it). */
  private resumeAt = 0
  private turn = 0
  private gapTimer = 0
  private readonly watch: number
  private readonly playBtn: HTMLButtonElement

  constructor(
    private readonly lines: HTMLElement[],
    private readonly texts: string[],
  ) {
    this.playBtn = button(N.pause, () => (this.state === 'reading' ? this.pause() : this.play()), { class: 'narrator__play' })
    this.el = h('div', { class: 'narrator', role: 'group' }, this.playBtn, button(N.replay, () => this.replay(), { variant: 'quiet' }), button(N.skip, () => this.skip(), { variant: 'quiet' }))
    preloadClips(texts.slice(0, 3).map((t) => clipFor(t)))
    // A video started: stop reading (she can carry on with Play afterwards).
    this.watch = window.setInterval(() => {
      if (this.state === 'reading' && mediaPlaying()) this.pause()
    }, 300)
  }

  start(): void {
    void this.readLine(0, 0)
  }

  pause(): void {
    if (this.state !== 'reading') return
    this.resumeAt = this.playback?.position() ?? 0
    this.halt()
    this.setState('paused')
  }

  play(): void {
    void this.readLine(this.state === 'done' ? 0 : this.index, this.state === 'paused' ? this.resumeAt : 0)
  }

  replay(): void {
    void this.readLine(this.index, 0)
  }

  skip(): void {
    if (this.index + 1 < this.lines.length) void this.readLine(this.index + 1, 0)
    else this.finish()
  }

  destroy(): void {
    window.clearInterval(this.watch)
    this.halt()
    this.state = 'done'
  }

  private halt(): void {
    this.turn++
    window.clearTimeout(this.gapTimer)
    this.playback?.stop()
    this.playback = null
  }

  private setState(s: Narrator['state']): void {
    this.state = s
    this.playBtn.textContent = s === 'reading' ? N.pause : N.play
  }

  private light(i: number | null): void {
    this.lines.forEach((el, k) => el.classList.toggle('is-reading', k === i))
    if (i != null) this.lines[i]?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }

  private async readLine(i: number, from: number): Promise<void> {
    this.halt()
    const mine = this.turn
    this.index = i
    this.resumeAt = 0
    this.setState('reading')
    this.light(i)
    preloadClips([clipFor(this.texts[i + 1] ?? '')])
    const clip = clipFor(this.texts[i])
    const p = clip ? await playClip(clip, this.texts[i], save().sound.voiceVolume || 1, from) : null
    if (mine !== this.turn) return p?.stop()
    this.playback = p
    if (p) await p.done
    else await new Promise((r) => window.setTimeout(r, 1200))
    if (mine !== this.turn) return
    this.playback = null
    if (i + 1 >= this.lines.length) return this.finish()
    this.gapTimer = window.setTimeout(() => mine === this.turn && void this.readLine(i + 1, 0), GAP_MS)
  }

  private finish(): void {
    this.halt()
    this.light(null)
    this.setState('done')
    this.onFinished?.()
  }
}
