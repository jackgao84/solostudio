/**
 * Reps that loop on their own. Each rep: an optional spoken cue ("Next: Chorus"), a moment to get to
 * her spot, "5, 6, 7, 8" on the beat, then the music from the rep's start to its end; a short rest;
 * then the next rep with a fresh count-in. It keeps going until she taps Pause (or Next, or I did it,
 * which the screen handles). Cues and counts are only ever spoken while nothing is playing: the music
 * comes in after the last count, and speech is hushed first.
 */
import { hush, say } from '../audio/voice'
import { COUNT_IN_WORDS, countInSchedule } from '../model/countin'
import { RangePlayer, type Player } from './player'

export interface Rep {
  from: number
  to: number
  speed: number
  /** Said before the count-in (between reps only). */
  cue?: string | null
}

/** Why the next rep is wanted: the first Play, the loop coming round, Next, or Again. */
export type RepReason = 'start' | 'loop' | 'skip' | 'again'
export type LoopState = 'idle' | 'counting' | 'playing' | 'resting' | 'paused'

/** The short pause between reps. */
export const REST_MS = 1500
/** Time for a cue to be said before the count-in starts: at least this, longer for a longer cue. */
export const CUE_MS = 1400

/** About how long the iPad takes to say a cue. */
export function cueTime(text: string): number {
  return Math.max(CUE_MS, Math.round(text.length * 65))
}

export class RepLoop {
  state: LoopState = 'idle'
  onState: ((s: LoopState) => void) | null = null
  onTick: ((t: number) => void) | null = null
  /** A count-in word to show (null: hide it). */
  onCount: ((word: string | null) => void) | null = null
  private readonly range: RangePlayer
  private timers: number[] = []
  private rep: Rep | null = null
  /** Paused part-way through a rep's music (Play carries on from there). */
  private midRep = false
  private pausedFrom: LoopState = 'idle'
  private gone = false

  constructor(
    readonly player: Player,
    private readonly next: (why: RepReason) => Rep | null,
    private readonly bpm: () => number | null,
    private readonly restMs: number = REST_MS,
  ) {
    this.range = new RangePlayer(player, 0, Infinity, 1)
    this.range.onTick = (t) => this.onTick?.(t)
    this.range.onStop = () => this.ended()
  }

  /** Change the speed now (and for the reps after this one, via the screen's next()). */
  setSpeed(speed: number): number {
    this.range.speed = speed
    if (this.rep) this.rep.speed = speed
    return this.player.setRate(speed)
  }

  /** Reps are on their way or playing. */
  active(): boolean {
    return this.state === 'counting' || this.state === 'playing' || this.state === 'resting'
  }

  /** Play (or carry on after Pause). */
  play(): void {
    if (this.gone || this.active()) return
    if (this.state === 'paused' && this.rep) {
      if (this.midRep) return this.countIn(false, true)
      if (this.pausedFrom === 'counting') return this.countIn(true, false)
      if (this.pausedFrom === 'resting') return this.begin('loop')
    }
    this.begin('start')
  }

  toggle(): void {
    if (this.active()) this.pause()
    else this.play()
  }

  pause(): void {
    if (this.gone || !this.active()) return
    this.pausedFrom = this.state
    this.clear()
    hush()
    if (this.state === 'playing') {
      this.range.pause()
      this.midRep = true
    }
    this.onCount?.(null)
    this.setState('paused')
  }

  /** Next: a new rep now, with its cue and a fresh count-in. */
  skip(): void {
    this.stopNow()
    this.begin('skip')
  }

  /** Again: this rep from its start, with a fresh count-in. */
  again(): void {
    this.stopNow()
    this.begin('again')
  }

  /** Stop without a new rep (the screen is moving on). */
  stop(): void {
    this.stopNow()
    this.setState('idle')
  }

  destroy(): void {
    this.gone = true
    this.clear()
    hush()
    this.range.destroy()
  }

  private stopNow(): void {
    this.clear()
    hush()
    if (this.player.playing()) this.range.pause()
    this.midRep = false
    this.onCount?.(null)
  }

  private begin(why: RepReason): void {
    const rep = this.next(why)
    if (!rep || this.gone) {
      this.rep = null
      this.setState('idle')
      return
    }
    this.rep = rep
    this.range.from = rep.from
    this.range.to = rep.to
    this.range.speed = rep.speed
    this.midRep = false
    this.countIn(true, false)
  }

  private countIn(withCue: boolean, resume: boolean): void {
    const rep = this.rep!
    this.setState('counting')
    if (!resume) {
      // Get the media to the rep's start while the count-in runs (it's paused, so nothing plays).
      this.player.setRate(rep.speed)
      this.player.seek(rep.from)
      this.onTick?.(rep.from)
    }
    const cueMs = withCue && rep.cue ? cueTime(rep.cue) : 0
    if (cueMs) say(rep.cue!)
    const plan = countInSchedule(this.bpm(), rep.speed)
    plan.beats.forEach((ms, i) =>
      this.later(cueMs + ms, () => {
        this.onCount?.(COUNT_IN_WORDS[i])
        say(COUNT_IN_WORDS[i])
      }),
    )
    this.later(cueMs + plan.playAt, () => {
      hush()
      this.onCount?.(null)
      this.setState('playing')
      void (resume ? this.range.toggle() : this.range.playFromTop()).then((ok) => {
        if (!ok && !this.gone && this.state === 'playing') this.setState('idle')
      })
    })
  }

  private ended(): void {
    if (this.state !== 'playing') return
    this.midRep = false
    this.setState('resting')
    this.later(this.restMs, () => this.begin('loop'))
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(window.setTimeout(() => !this.gone && fn(), ms))
  }

  private clear(): void {
    for (const t of this.timers) window.clearTimeout(t)
    this.timers = []
  }

  private setState(s: LoopState): void {
    this.state = s
    this.onState?.(s)
  }
}
