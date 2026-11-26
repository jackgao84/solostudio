/**
 * Count-ins on their own, outside the rep loop.
 *  - runCountIn: "5, 6, 7, 8" on the beat, shown and said while nothing plays, then `onGo` on the 1
 *    (counts from memory).
 *  - runGetReady (version 1.2, before any filming): "Get to your spot" with a countdown of the walk-on
 *    time, then the count-in, then `onGo` on the 1.
 * Cancel stops either (and anything still being said).
 */
import { hush, say } from '../audio/voice'
import { COUNT_IN_WORDS, countInSchedule, getReadySchedule } from '../model/countin'

export function runCountIn(bpm: number | null, speed: number, show: (word: string | null) => void, onGo: () => void): () => void {
  const plan = countInSchedule(bpm, speed)
  const timers = plan.beats.map((ms, i) =>
    window.setTimeout(() => {
      show(COUNT_IN_WORDS[i])
      say(COUNT_IN_WORDS[i])
    }, ms),
  )
  timers.push(
    window.setTimeout(() => {
      hush()
      show(null)
      onGo()
    }, plan.playAt),
  )
  return () => {
    for (const t of timers) window.clearTimeout(t)
    hush()
    show(null)
  }
}

export interface GetReadyView {
  /** The walk-on countdown number (null: the countdown is over). */
  countdown: (n: number | null) => void
  /** A count-in word (null: hide it). */
  count: (word: string | null) => void
}

export function runGetReady(walkOnSeconds: number, bpm: number | null, speed: number, view: GetReadyView, onGo: () => void): () => void {
  const plan = getReadySchedule(walkOnSeconds, bpm, speed)
  say(plan.cue)
  const timers = plan.countdown.map((c) => window.setTimeout(() => view.countdown(c.n), c.at))
  timers.push(
    ...plan.beats.map((ms, i) =>
      window.setTimeout(() => {
        if (i === 0) view.countdown(null)
        view.count(plan.words[i])
        say(plan.words[i])
      }, ms),
    ),
    window.setTimeout(() => {
      hush()
      view.count(null)
      onGo()
    }, plan.recordAt),
  )
  return () => {
    for (const t of timers) window.clearTimeout(t)
    hush()
    view.countdown(null)
    view.count(null)
  }
}
