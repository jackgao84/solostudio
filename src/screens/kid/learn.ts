/**
 * A section lesson (version 1.2): one of her sections on one ladder (Rap, Dance or Together). A
 * short intro the coach reads aloud, the right video for that part (from where it is marked, or
 * from the start: no marks needed), and the ladder's rungs, each practised with the count-in. If the
 * lesson needs something setup hasn't covered, it says so plainly and offers to open that step.
 * Version 1.3: a rap lesson on a part with no lines starts straight away (the words are in the
 * listen-and-read video); it only mentions that a grown-up can add the words too.
 */
import { go, save, sectionById, unlockGrownups } from '../../app/ctx'
import { GATE_HOLD_MS } from '../../app/gate'
import type { Screen } from '../../app/router'
import { KID_COPY } from '../../content/kid'
import { LADDER_COPY, STEP_COPY } from '../../content/ladders'
import { SECTION_LESSON_COPY } from '../../content/learn'
import { LADDERS } from '../../model/ladders'
import { lessonGaps, sectionLessonVideo } from '../../model/path'
import { nextStep, progressOf } from '../../model/progress'
import type { Player } from '../../media/player'
import type { LadderId, WizardStep } from '../../storage/schema'
import { button, holdButton } from '../../ui/components'
import { fill, h } from '../../ui/dom'
import { Narrator } from '../../ui/narrator'
import { referencePlayer, youTubeIn } from '../../ui/video'
import { videoControls } from '../../ui/video-controls'
import { kidScreen, topbar } from './common'

const L = KID_COPY.learn
const GAP_WORDS: Record<WizardStep, string> = {
  track: L.needsTrack,
  lines: L.needsLines,
  starts: L.needsStarts,
  follow: L.needsStarts,
  timing: L.needsLines,
  beat: L.needsTrack,
  dates: L.needsTrack,
}

export const learnScreen: Screen = (root, { params }) => {
  const section = sectionById(params.section)
  const ladder = params.ladder as LadderId
  if (!section || !LADDERS[ladder]) {
    go('/today')
    return
  }
  const d = save()
  const copy = SECTION_LESSON_COPY[ladder]
  const p = progressOf(d.progress, section.id)[ladder]
  const next = nextStep(progressOf(d.progress, section.id), ladder)
  const gaps = lessonGaps(d, section.id, ladder)
  // No lines on a rap lesson: the words are in the video, and her track plays the rest (no marks needed).
  const wordsInVideo = ladder === 'rap' && gaps.includes('lines')
  const shown = wordsInVideo ? gaps.filter((g) => g === 'track') : gaps

  const intro = copy.intro.map((t) => h('p', { class: 'narrated' }, t))
  const narrator = d.narration.on ? new Narrator(intro, copy.intro) : null

  const gapCard = gaps.length
    ? h(
        'section',
        { class: 'lesson-gap card', role: 'note' },
        wordsInVideo ? h('p', null, L.wordsInVideo) : null,
        ...shown.map((g) => h('p', null, GAP_WORDS[g])),
        h('p', { class: 'note' }, shown.length ? L.askGrownUp : L.wordsLater),
        holdButton(L.openStep, GATE_HOLD_MS, () => {
          unlockGrownups()
          go(`/grownups/setup?step=${gaps[0]}`)
        }),
      )
    : null

  const rungs = h(
    'ol',
    { class: 'rungs' },
    ...LADDERS[ladder].map((st) => {
      const ticked = p.done.includes(st.id)
      return h(
        'li',
        { class: `rung${ticked ? ' is-done' : ''}`, 'data-step': st.id },
        h('span', { class: `lamp lamp--${ladder}${ticked ? ' is-on' : ''}`, 'aria-hidden': 'true' }),
        h('span', { class: 'rung__name' }, STEP_COPY[st.id].name),
        ticked ? h('span', { class: 'rung__done' }, KID_COPY.sections.rungTicked) : null,
        button(L.practiseShort, () => go(`/practice/${section.id}/${st.id}`), { variant: 'quiet', class: 'rung__go', label: fill(L.practise, { step: STEP_COPY[st.id].name }) }),
      )
    }),
  )
  const first = next ?? LADDERS[ladder][LADDERS[ladder].length - 1]
  const main = button(next ? fill(L.practise, { step: STEP_COPY[first.id].name }) : L.again, () => go(`/practice/${section.id}/${first.id}`), { variant: 'primary', class: 'btn--huge' })

  const videoBox = h('div', { class: 'player-area lesson-video' })
  kidScreen(
    root,
    'learn',
    topbar(),
    narrator?.el ?? null,
    h(
      'div',
      { class: 'lesson-layout' },
      h(
        'div',
        { class: 'lesson-script' },
        h('h1', { class: 'lesson__title' }, fill(KID_COPY.home.sectionLesson, { section: section.name, ladder: LADDER_COPY[ladder].name })),
        gapCard,
        ...intro,
        !next ? h('p', { class: 'note' }, L.finished) : null,
        h('h2', null, L.steps),
        rungs,
      ),
      h('div', { class: 'lesson-side' }, h('p', { class: 'lesson-video__label' }, L.video), videoBox, h('div', { class: 'row' }, main)),
    ),
  )
  // The video for this part: from where it's marked on this section, or from its start.
  const v = sectionLessonVideo(d, section, ladder)
  let player: Player | null = null
  let ctl: ReturnType<typeof videoControls> | null = null
  if (v) {
    const p = v.ref.kind === 'local' ? referencePlayer(videoBox, v.ref) : youTubeIn(videoBox, v.ref.youtubeId, undefined, v.start)
    if (v.ref.kind === 'local' && v.start) void p.ready.then(() => p.seek(v.start)).catch(() => undefined)
    player = p
    ctl = videoControls(p)
    videoBox.after(ctl.el)
  }
  narrator?.start()
  return () => {
    ctl?.destroy()
    narrator?.destroy()
    player?.destroy()
  }
}
