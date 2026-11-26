/**
 * The grown-ups' home: a setup checklist, the menu, Test YouTube (version 1.3: it says whether the
 * iPad is offline, YouTube is blocked, or it works), storage, the version line and updates.
 */
import { go, save } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { applyUpdateIfSafe, onUpdateReady } from '../../app/sw-register'
import { versionLine } from '../../app/version'
import { mediaIdsIn } from '../../storage/backup'
import { media } from '../../storage/media'
import { DEFAULT_REFS } from '../../content/references'
import { youTubePlayer, type YouTubePlayer } from '../../media/youtube'
import { YOUTUBE_TEST_WORDS, youTubeTestResult, type YouTubeTest } from '../../model/video-problems'
import { spanOf } from '../../model/timing'
import { button } from '../../ui/components'
import { h } from '../../ui/dom'
import { grownScreen } from './common'
import { setupButtonLabel } from './setup'

export const grownupsHome: Screen = (root) => {
  const d = save()
  const tick = (ok: boolean, text: string) => h('li', null, `${ok ? '✓' : '○'} ${text}`)
  const marked = d.sections.filter((s) => spanOf(s.track)).length
  const lines = d.sections.reduce((a, s) => a + s.lines.length, 0)
  const el = grownScreen(
    root,
    'grownups',
    'Grown-ups',
    null,
    h('p', null, 'She can already use the practice room with no setup. Set up Solo Studio here to add her own song: about 10 minutes, and her lessons start after the first three steps. SETUP.md (in the project) walks through it.'),
    h('div', { class: 'row' }, button(setupButtonLabel(), () => go('/grownups/setup'), { variant: 'primary', class: 'btn--big setup-go' })),
    h(
      'section',
      { class: 'card' },
      h('h2', null, d.setup.complete ? 'Setup' : 'Start here'),
      h(
        'ul',
        { class: 'checklist' },
        tick(!!d.show, d.show ? `Show: ${d.show.name} on ${d.show.date}` : 'Set the show date and practice minutes (Show and plan)'),
        tick(!!d.track.mediaId || !!d.track.standInYoutubeId, d.track.mediaId ? `Her track: ${d.track.fileName}` : d.track.standInYoutubeId ? 'A YouTube video is standing in for her track' : 'Load her track from Files (Her track)'),
        tick(d.sections.length > 0 && lines > 0, `${d.sections.length} sections, ${lines} lines typed, ${marked} marked on her track`),
        tick(!!d.tempo.bpm && d.tempo.offset != null, d.tempo.bpm ? `Tempo ${d.tempo.bpm} BPM` : 'Tap the tempo and a "1" (Tempo and counts)'),
      ),
    ),
  )
  const missing = h('p', { class: 'media-missing', hidden: true })
  el.append(missing)

  // Test YouTube: offline, blocked, or working (with the mirrored follow-along as the test video).
  const testBox = h('div', { class: 'yt-test-box' })
  const result = h('p', { class: 'yt-test-result', role: 'status', hidden: true })
  let testPlayer: YouTubePlayer | null = null
  const runTest = () => {
    testPlayer?.destroy()
    testPlayer = null
    testBox.replaceChildren()
    result.hidden = false
    result.removeAttribute('data-result')
    result.textContent = 'Testing YouTube…'
    const show = (r: YouTubeTest) => {
      result.setAttribute('data-result', r)
      result.textContent = YOUTUBE_TEST_WORDS[r]
    }
    if (!navigator.onLine) return show('offline')
    const id = save().refs.find((r) => r.role === 'mirrored' && r.kind === 'youtube' && r.youtubeId)?.youtubeId ?? DEFAULT_REFS.find((r) => r.role === 'mirrored')!.youtubeId
    let settled = false
    const p = youTubePlayer(testBox, id, {
      onError: (kind) => {
        if (settled) return
        settled = true
        show(youTubeTestResult(kind))
      },
    })
    testPlayer = p
    // YouTube can say a video won't play inside apps just after its player is ready: give it a moment.
    p.ready.then(
      () =>
        window.setTimeout(() => {
          if (settled || testPlayer !== p) return
          settled = true
          show(youTubeTestResult('ready'))
        }, 2000),
      () => undefined,
    )
  }
  el.append(
    h(
      'section',
      { class: 'card yt-test' },
      h('h2', null, 'YouTube on this iPad'),
      h('p', null, 'If videos don’t play for her, test YouTube here. It says whether the iPad is offline, YouTube is blocked, or it works.'),
      h('div', { class: 'row' }, button('Test YouTube', () => runTest())),
      result,
      testBox,
    ),
  )
  void (async () => {
    try {
      const db = await media()
      const lost: string[] = []
      for (const id of mediaIdsIn(save())) if (!(await db.has(id))) lost.push(id)
      if (lost.length) {
        const trackLost = !!d.track.mediaId && lost.includes(d.track.mediaId)
        missing.textContent = `${trackLost ? 'Her track needs loading again on this iPad (Her track).' : ''} ${lost.length - (trackLost ? 1 : 0) > 0 ? 'Some local videos need adding again (Videos).' : ''}`.trim()
        missing.hidden = false
      }
    } catch (err) {
      console.warn('[solostudio] media check failed', err)
    }
  })()

  el.append(
    h(
      'div',
      { class: 'gu-menu' },
      ...(
        [
          ['Her week', '/grownups/week'],
          ['Notes', '/grownups/notes'],
          ['Show and plan', '/grownups/plan'],
          ['Her track', '/grownups/track'],
          ['Videos', '/grownups/refs'],
          ['Sections', '/grownups/sections'],
          ['Tempo and counts', '/grownups/tempo'],
          ['Backup', '/grownups/backup'],
          ['Links', '/grownups/links'],
          ['Showtime routine', '/grownups/showtime'],
          ['Lessons and narration', '/grownups/lessons'],
        ] as const
      ).map(([label, path]) => button(label, () => go(path))),
    ),
  )

  const storage = h('p', { class: 'storage-status note' }, d.setup.persisted ? 'Storage: the iPad has agreed to keep this app’s data.' : 'Storage: Safari may clear data if the iPad runs short of space. Export a backup now and then.')
  const updateSlot = h('div', { class: 'row', hidden: true })
  const stop = onUpdateReady(() => {
    updateSlot.hidden = false
    updateSlot.replaceChildren(h('span', null, 'A new version is ready.'), button('Restart now', () => applyUpdateIfSafe()))
  })
  el.append(
    h('section', { class: 'card' }, storage, updateSlot, h('p', { class: 'version-line' }, versionLine())),
    h('div', { class: 'row' }, button('Back to practice', () => go(save().setup.complete ? '/today' : '/welcome'), { variant: 'primary' })),
  )
  return () => {
    stop()
    testPlayer?.destroy()
  }
}
