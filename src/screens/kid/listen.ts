/**
 * The listening run, on light days (version 1.1): her track from the top with no words on screen,
 * while she imagines performing it with her eyes closed. A cue to close her eyes before the music, one
 * to open them after it, and nothing said while it plays.
 */
import { save } from '../../app/ctx'
import { say } from '../../audio/voice'
import { KID_COPY } from '../../content/kid'
import { RangePlayer } from '../../media/player'
import { button } from '../../ui/components'
import { h } from '../../ui/dom'
import { trackSource, type TrackSource } from '../../ui/video'

const L = KID_COPY.listen
/** Time to close her eyes after the cue, before the music. */
const SETTLE_MS = 3500

export function listeningRun(): { el: HTMLElement; destroy: () => void } {
  const panel = h('div', { class: 'listen-panel' })
  const playerArea = h('div', { class: 'player-area', hidden: true })
  let src: TrackSource | null = null
  let range: RangePlayer | null = null
  let timer = 0
  let gone = false
  let state: 'idle' | 'settling' | 'playing' | 'paused' | 'done' = 'idle'

  const playBtn = button(L.play, () => void toggle(), { variant: 'primary', class: 'btn--huge' })
  const el = h('section', { class: 'listen stack' }, panel, playerArea, h('div', { class: 'answer main-actions' }, playBtn))

  const label = () => (playBtn.textContent = state === 'settling' || state === 'playing' ? KID_COPY.practice.pause : L.play)

  async function toggle(): Promise<void> {
    if (!src) return
    if (state === 'settling') {
      window.clearTimeout(timer)
      state = 'idle'
      panel.replaceChildren()
      return void label()
    }
    if (state === 'playing') {
      range?.pause()
      state = 'paused'
      return void label()
    }
    if (state === 'paused' && range) {
      state = 'playing'
      label()
      await range.toggle()
      return
    }
    // From the top: the cue, a moment to close her eyes, then her whole track.
    state = 'settling'
    label()
    panel.replaceChildren(h('p', { class: 'listen-eyes' }, L.eyes))
    say(L.cueStart)
    timer = window.setTimeout(() => {
      if (gone || !src) return
      const player = src.player
      range?.destroy()
      range = new RangePlayer(player, 0, player.duration() ?? Infinity, 1)
      range.onStop = () => {
        state = 'done'
        label()
        panel.replaceChildren(h('p', { class: 'listen-done', role: 'status' }, L.done))
        say(L.cueEnd)
      }
      state = 'playing'
      label()
      void range.playFromTop()
    }, SETTLE_MS)
  }

  void (async () => {
    src = await trackSource(playerArea, save())
    if (gone) return src?.player.destroy()
    playerArea.hidden = !src?.standIn
    if (!src) panel.replaceChildren(h('p', { class: 'note' }, KID_COPY.practice.needsTrack))
  })()

  return {
    el,
    destroy: () => {
      gone = true
      window.clearTimeout(timer)
      range?.destroy()
      src?.player.destroy()
    },
  }
}
