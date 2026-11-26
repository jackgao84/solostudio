/**
 * Minutes practised, for the grown-ups' week: every few seconds on a practice screen, while the app
 * is on screen and she is active (something is playing, or she tapped in the last few minutes),
 * the time goes into today's log. A practice screen left open and untouched doesn't count.
 */
import { logSeconds } from '../model/activity'
import { mediaPlaying } from '../media/now-playing'
import { today, update } from './ctx'
import { busyRoute } from './sw-register'

export const LOG_STEP_S = 5
/** A warm-up or a dance block can go a while without a tap. */
export const IDLE_S = 600

let lastTouch = 0

export function startActivityLog(): void {
  document.addEventListener('pointerdown', () => (lastTouch = Date.now()), true)
  window.setInterval(() => {
    if (document.visibilityState !== 'visible' || !busyRoute()) return
    if (!mediaPlaying() && Date.now() - lastTouch > IDLE_S * 1000) return
    update((d) => logSeconds(d, today(), LOG_STEP_S))
  }, LOG_STEP_S * 1000)
}
