/**
 * Her track: the showcase music with the vocals removed, loaded from Files and kept on this iPad.
 * Version 1.4: the guide file, also from Files and kept on the iPad: the app works out whether it is a
 * full guide mix or the voice on its own, a grown-up confirms, and the app lines it up with her track
 * in one four-channel file. Whose voice it is (typed here) names her control on the iPad only.
 */
import { save, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { parseYouTubeId } from '../../media/youtube-util'
import { probeDuration, unloadTrack } from '../../media/track'
import { buildGuide, forgetDecoded, workOutGuide } from '../../media/guide-build'
import { guidedPlayer, unloadGuide, type GuidedPlayer } from '../../media/guided'
import { guideReady, voiceTitle } from '../../model/guide'
import { SINGER_NAME_MAX, VOICE_LEVELS, emptyGuide, type GuideKind } from '../../storage/schema'
import { KID_COPY } from '../../content/kid'
import { formatTime } from '../../model/timing'
import { media, newMediaId } from '../../storage/media'
import { button, confirmButton, filePick } from '../../ui/components'
import { h } from '../../ui/dom'
import { field, grownScreen, savedNote } from './common'

export const trackScreen: Screen = (root) => {
  const current = h('p', { class: 'track-file' })
  const status = h('div', { class: 'form-status' })
  const show = () => {
    const t = save().track
    current.textContent = t.mediaId ? `${t.fileName}${t.duration ? ` (${formatTime(t.duration)})` : ''}` : 'No track loaded yet.'
  }
  show()

  const pick = filePick('Choose her track from Files', 'track', 'audio/*,video/*,.m4a,.mp3,.wav,.aac,.mp4', async (f) => {
    status.replaceChildren(h('p', { class: 'note' }, 'Loading…'))
    try {
      const db = await media()
      const id = newMediaId('track')
      await db.put({ id, kind: 'track', name: f.name, type: f.type || 'audio/mp4', size: f.size, createdAt: Date.now(), group: '', blob: f })
      const duration = await probeDuration(f)
      const old = save().track.mediaId
      update((d) => {
        d.track.mediaId = id
        d.track.fileName = f.name
        d.track.duration = duration
      })
      unloadTrack()
      if (old && old !== id) await db.delete(old)
      await guideTrackChanged()
      show()
      status.replaceChildren(savedNote('Her track is loaded. It stays on this iPad.'))
    } catch (err) {
      console.warn('[solostudio] track load failed', err)
      status.replaceChildren(h('p', { class: 'import-error' }, 'That file could not be stored. Try an .m4a or .mp3 file.'))
    }
  })

  // ---- The guide (1.4) -----------------------------------------------------------------------------
  const guideStatus = h('div', { class: 'guide-status stack', 'data-state': 'none' })
  let tryPlayer: GuidedPlayer | null = null
  const stopTry = () => {
    tryPlayer?.destroy()
    tryPlayer = null
  }
  const KIND_WORDS: Record<GuideKind, string> = { mix: 'a full guide mix (her music with the voice in it)', vocals: 'the voice on its own' }

  /** Her track changed or went: the guide needs lining up with the new one (its four-channel file is gone). */
  async function guideTrackChanged(): Promise<void> {
    const g = save().guide
    stopTry()
    unloadGuide()
    forgetDecoded()
    if (g.mixId) await (await media()).delete(g.mixId)
    update((d) => {
      d.guide.mixId = null
      d.guide.forTrack = null
    })
    drawGuide()
  }

  function setState(state: string, ...children: (Node | null)[]): void {
    guideStatus.setAttribute('data-state', state)
    guideStatus.replaceChildren(...(children.filter(Boolean) as Node[]))
  }

  /** Work out what the guide is, then ask a grown-up to confirm. */
  async function workOut(): Promise<void> {
    const d = save()
    if (!d.track.mediaId || !d.guide.mediaId) return drawGuide()
    setState('working', h('p', { class: 'note' }, 'Listening to the guide and her track… This takes a few seconds.'))
    try {
      const a = await workOutGuide(d.track.mediaId, d.guide.mediaId)
      update((x) => {
        x.guide.guess = a.guess
        x.guide.offset = a.guess === 'mix' ? Math.round(a.offset * 10000) / 10000 : 0
      })
      const longer = Math.abs(a.lengthDiff) >= 1 ? `It is ${formatTime(Math.abs(a.lengthDiff))} ${a.lengthDiff > 0 ? 'longer' : 'shorter'} than her track, so check it is for her cut.` : ''
      const other: GuideKind = a.guess === 'mix' ? 'vocals' : 'mix'
      setState(
        'confirm',
        h('p', { class: 'guide-guess', 'data-guess': a.guess }, a.guess === 'mix' ? 'This sounds like a full guide mix: her music with the voice in it. It is lined up with her track.' : 'This sounds like the voice on its own, played from the top with her track.'),
        longer ? h('p', { class: 'note' }, longer) : null,
        h('div', { class: 'row' }, button('Yes, that’s right', () => void confirm(a.guess), { variant: 'primary' }), button(other === 'mix' ? 'No, it’s a full guide mix' : 'No, it’s the voice on its own', () => void confirm(other), { variant: 'quiet' })),
      )
    } catch (err) {
      console.warn('[solostudio] the guide could not be worked out', err)
      setState('failed', h('p', { class: 'import-error' }, 'That file could not be read. Try an .m4a, .mp3 or .wav file.'))
    }
  }

  /** Line it up and keep it: her track and the guide in one four-channel file. */
  async function confirm(kind: GuideKind): Promise<void> {
    const d = save()
    if (!d.track.mediaId || !d.guide.mediaId) return drawGuide()
    setState('working', h('p', { class: 'note' }, 'Lining the guide up with her track… This takes a few seconds.'))
    try {
      const offset = kind === 'mix' && d.guide.guess === 'mix' ? d.guide.offset : 0
      const old = d.guide.mixId
      const mixId = await buildGuide(d.track.mediaId, d.guide.mediaId, kind, offset)
      unloadGuide()
      update((x) => {
        x.guide.kind = kind
        x.guide.offset = offset
        x.guide.mixId = mixId
        x.guide.forTrack = x.track.mediaId
      })
      if (old && old !== mixId) await (await media()).delete(old)
      forgetDecoded()
      drawGuide()
    } catch (err) {
      console.warn('[solostudio] the guide could not be built', err)
      setState('failed', h('p', { class: 'import-error' }, 'The guide could not be stored on this iPad. Try a shorter file, or free some space.'))
    }
  }

  function drawGuide(): void {
    stopTry()
    const d = save()
    const g = d.guide
    if (!d.track.mediaId) return setState('none', h('p', { class: 'note' }, 'Load her track first. The guide plays in time with it.'), g.mediaId ? removeGuide() : null)
    if (!g.mediaId) return setState('none', h('p', { class: 'note' }, 'No guide yet.'))
    if (guideReady(d)) {
      const singer = h('input', { name: 'singer', type: 'text', value: g.singer, maxlength: SINGER_NAME_MAX, autocomplete: 'off', placeholder: 'For example: the singer’s first name' })
      const nameStatus = h('div', { class: 'form-status' })
      const levels = h('div', { class: 'row' }, ...VOICE_LEVELS.map((l) => button(`Hear it at ${KID_COPY.voice[l]}`, () => tryIt(l), { variant: 'quiet' })), button('Stop', () => stopTry(), { variant: 'quiet' }))
      return setState(
        'ready',
        h('p', { class: 'guide-ready' }, `Ready: ${g.fileName}, ${KIND_WORDS[g.kind!]}. She hears it with the voice control (Off, Light, Full) wherever her track plays.`),
        h('p', { class: 'note' }, 'Try it here: the voice should sit on her music, in time, and turn down or off without the music moving.'),
        levels,
        field('Whose voice is it?', singer),
        h('p', { class: 'note' }, `Her control reads “${voiceTitle(g.singer)}”. The name stays on this iPad.`),
        h(
          'div',
          { class: 'row' },
          button('Save the name', () => {
            update((x) => (x.guide.singer = singer.value.trim().slice(0, SINGER_NAME_MAX).trim()))
            nameStatus.replaceChildren(savedNote(`Saved. Her control reads “${voiceTitle(save().guide.singer)}”.`))
          }),
        ),
        nameStatus,
        h('div', { class: 'row' }, button('Work it out again', () => void workOut(), { variant: 'quiet' }), removeGuide()),
      )
    }
    if (g.kind && (!g.mixId || g.forTrack !== d.track.mediaId)) {
      return setState('stale', h('p', null, 'Her track has changed since the guide was lined up with it.'), h('div', { class: 'row' }, button('Line it up again', () => void workOut(), { variant: 'primary' }), removeGuide()))
    }
    void workOut()
  }

  function tryIt(level: (typeof VOICE_LEVELS)[number]): void {
    const d = save()
    if (!guideReady(d)) return
    if (!tryPlayer) {
      tryPlayer = guidedPlayer(d.guide.mixId!, d.track.mediaId!, d.guide.kind!, level)
      const p = tryPlayer
      void p.ready
        .then(() => {
          if (p !== tryPlayer) return
          const dur = p.duration() ?? 0
          p.seek(Math.max(0, dur / 3))
          p.play()
        })
        .catch(() => undefined)
    }
    tryPlayer.setVoice(level)
  }

  function removeGuide(): HTMLElement {
    return confirmButton('Remove the guide', 'Yes, remove it', async () => {
      const g = save().guide
      stopTry()
      unloadGuide()
      forgetDecoded()
      const db = await media()
      for (const id of [g.mediaId, g.mixId]) if (id) await db.delete(id)
      update((x) => {
        x.guide = { ...emptyGuide(), singer: x.guide.singer }
      })
      drawGuide()
    })
  }

  const guidePick = filePick('Choose the guide from Files', 'guide', 'audio/*,video/*,.m4a,.mp3,.wav,.aac,.mp4', async (f) => {
    if (!save().track.mediaId) return drawGuide()
    setState('working', h('p', { class: 'note' }, 'Loading…'))
    try {
      const db = await media()
      const id = newMediaId('guide')
      await db.put({ id, kind: 'guide', name: f.name, type: f.type || 'audio/mp4', size: f.size, createdAt: Date.now(), group: '', blob: f })
      const duration = await probeDuration(f)
      const old = save().guide
      stopTry()
      unloadGuide()
      forgetDecoded()
      for (const x of [old.mediaId, old.mixId]) if (x && x !== id) await db.delete(x)
      update((d) => {
        d.guide = { ...emptyGuide(), mediaId: id, fileName: f.name, duration, singer: d.guide.singer }
      })
      await workOut()
    } catch (err) {
      console.warn('[solostudio] guide load failed', err)
      setState('failed', h('p', { class: 'import-error' }, 'That file could not be stored. Try an .m4a or .mp3 file.'))
    }
  })

  const standIn = h('input', { name: 'standIn', type: 'text', value: save().track.standInYoutubeId, placeholder: 'YouTube link or video id', autocomplete: 'off' })
  const standInStatus = h('div', { class: 'form-status' })

  grownScreen(
    root,
    'grownups-track',
    'Her track',
    '/grownups',
    h(
      'section',
      { class: 'card stack' },
      h('p', null, 'The showcase music with the vocals removed. Choose the file from Files on this iPad. It plays at 50% to 100% speed and never leaves the iPad.'),
      current,
      h('div', { class: 'row' }, pick),
      status,
      save().track.mediaId
        ? confirmButton('Remove her track', 'Yes, remove it', async () => {
            const id = save().track.mediaId
            if (id) await (await media()).delete(id)
            update((d) => {
              d.track.mediaId = null
              d.track.fileName = ''
              d.track.duration = null
            })
            unloadTrack()
            await guideTrackChanged()
            show()
          })
        : null,
    ),
    h(
      'section',
      { class: 'card stack guide-card' },
      h('h2', null, 'Guide file (optional)'),
      h('p', null, 'The singer’s voice, to guide her rap. Either a full guide mix of her cut (her music with the voice in it), or the voice on its own, the same length as her track. It stays on this iPad and plays in time with her track at every speed.'),
      h('p', { class: 'note' }, 'With a guide, her rap lessons go: listen at Full, say it at Light, say it at Off, then from memory. Without one, they use the karaoke videos.'),
      h('div', { class: 'row' }, guidePick),
      guideStatus,
    ),
    h(
      'section',
      { class: 'card stack' },
      h('h2', null, 'Stand-in video'),
      h('p', { class: 'note' }, 'Until her track is loaded, any YouTube video can stand in (for example the original). Her own track is always used once it is loaded.'),
      field('Stand-in video', standIn),
      standInStatus,
      h(
        'div',
        { class: 'row' },
        button('Use as stand-in', () => {
          const raw = standIn.value.trim()
          const id = raw ? parseYouTubeId(raw) : ''
          if (id === null) return standInStatus.replaceChildren(h('p', { class: 'import-error' }, 'That doesn’t look like a YouTube link.'))
          update((d) => (d.track.standInYoutubeId = id))
          standIn.value = id
          standInStatus.replaceChildren(savedNote(id ? 'Saved.' : 'Stand-in removed.'))
        }),
      ),
    ),
  )
  drawGuide()
  return () => stopTry()
}
