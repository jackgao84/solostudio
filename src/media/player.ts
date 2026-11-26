/** One interface for her track, YouTube videos and local videos. */
export interface Player {
  readonly kind: 'track' | 'youtube' | 'local'
  /** Resolves when the player can take commands (rejects if it can't load). */
  ready: Promise<void>
  play(): void
  pause(): void
  seek(t: number): void
  time(): number
  /** Sets the speed; returns the speed actually used (YouTube offers fixed steps). */
  setRate(r: number): number
  rate(): number
  duration(): number | null
  playing(): boolean
  /** Silences the sound while the media keeps playing (the rejoin drill's drop-outs). */
  setMuted(on: boolean): void
  /** Called when the media plays to its end. */
  onEnded: (() => void) | null
  destroy(): void
}

/**
 * Plays [from, to] of a player at a speed, calling onTick with the time every frame and onStop when
 * it reaches `to` (or the end). Play from the top seeks to `from` first.
 */
export class RangePlayer {
  private raf = 0
  private atEnd = true
  /** The media has been seen playing since this play began. */
  private seen = false
  onTick: ((t: number) => void) | null = null
  onStop: (() => void) | null = null

  constructor(
    readonly player: Player,
    public from: number,
    public to: number,
    public speed: number,
  ) {
    player.onEnded = () => this.finish()
  }

  /** Resolves false (and plays nothing) when the player couldn't load. */
  private async whenReady(): Promise<boolean> {
    try {
      await this.player.ready
      return true
    } catch {
      return false
    }
  }

  async playFromTop(): Promise<boolean> {
    if (!(await this.whenReady())) return false
    this.player.setRate(this.speed)
    this.player.seek(this.from)
    this.atEnd = false
    this.seen = false
    this.player.play()
    this.loop()
    return true
  }

  async toggle(): Promise<boolean> {
    if (this.player.playing()) {
      this.pause()
      return false
    }
    if (this.atEnd) return this.playFromTop()
    if (!(await this.whenReady())) return false
    this.player.setRate(this.speed)
    this.seen = false
    this.player.play()
    this.loop()
    return true
  }

  pause(): void {
    this.player.pause()
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  playing(): boolean {
    return this.player.playing()
  }

  private finish(): void {
    // Reaching `to` and the media's own "ended" can both happen at the end: stop once.
    if (this.atEnd) return
    this.pause()
    this.atEnd = true
    this.onStop?.()
  }

  private loop(): void {
    cancelAnimationFrame(this.raf)
    let lastT = -1
    let movedAt = performance.now()
    const step = () => {
      const t = this.player.time()
      this.onTick?.(t)
      const playing = this.player.playing()
      if (playing) this.seen = true
      const now = performance.now()
      if (t !== lastT) {
        lastT = t
        movedAt = now
      }
      if (Number.isFinite(this.to) && t >= this.to) return this.finish()
      // The media stopped, or its clock froze, just short of the end without an "ended" event
      // (WebKit's media clock can stall there): that's the end too.
      const nearEnd = Number.isFinite(this.to) && t >= this.to - 0.5
      if (this.seen && nearEnd && (!playing || now - movedAt > 1000)) return this.finish()
      this.raf = requestAnimationFrame(step)
    }
    this.raf = requestAnimationFrame(step)
  }

  destroy(): void {
    this.pause()
    this.onTick = null
    this.onStop = null
    this.player.onEnded = null
  }
}
