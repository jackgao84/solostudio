/**
 * A single count-in on its own (recording a section): "5, 6, 7, 8" on the beat, shown and said while
 * nothing plays, then `onGo` on the 1. Cancel stops it (and anything still being said).
 */
import { hush, say } from '../audio/voice'
import { COUNT_IN_WORDS, countInSchedule } from '../model/countin'

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
