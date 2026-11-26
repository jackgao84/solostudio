/**
 * All kid-facing text, gathered for REVIEW.md and the copy checks: KID_COPY, phases and blocks,
 * ladders and rungs, routines, reflection choices, the sources' names and the lessons.
 */
import { BLOCK_COPY, DRILL_COPY, PHASE_COPY } from './blocks'
import { KID_COPY } from './kid'
import { LADDER_COPY, STEP_COPY } from './ladders'
import { SECTION_LESSON_COPY } from './learn'
import { LESSONS } from './lessons'
import { WENT_WELL, WORK_ON } from './reflect'
import { ROUTINES } from './routines'

export interface KidString {
  /** REVIEW.md group id. */
  group: string
  /** Sub-heading within the group ('' for none). */
  sub: string
  /** Where it lives, e.g. "kid.today.countdown". Unique. */
  where: string
  text: string
}

export const KID_GROUPS: readonly { id: string; title: string; about: string }[] = [
  { id: 'welcome', title: 'Welcome and the grown-ups’ button', about: 'The first screen, before a grown-up has set things up, and the press-and-hold button.' },
  { id: 'nav', title: 'Buttons that appear everywhere', about: 'The buttons for getting around, and the "new version" button on Today.' },
  { id: 'today', title: 'Today', about: 'Her day: the countdown, the phase, the blocks, moving blocks, checks that are due.' },
  { id: 'home', title: 'Home: today’s lessons and her lesson path', about: 'The top of the home page (Start, the D-day, today’s lessons) and her whole lesson path below it.' },
  { id: 'learn', title: 'A section lesson', about: 'One of her sections on one ladder: its intro, its video, its steps, and what it says when setup hasn’t covered something yet.' },
  { id: 'plan', title: 'Phases and blocks', about: 'The names of the plan’s phases and the day’s blocks.' },
  { id: 'block', title: 'Inside a block', about: 'The screen for one block: the gentle timer and what to practise.' },
  { id: 'routines', title: 'Warm-up, water and cool-down', about: 'The steps shown in those blocks.' },
  { id: 'ladders', title: 'The three ladders', about: 'Each ladder and each rung, with the one-line how-to shown on the practice screen.' },
  { id: 'practice', title: 'Practising', about: 'The practice screen: buttons, notes, speeds and what she sees when a video won’t play.' },
  { id: 'drills', title: 'Start anywhere and jump back in', about: 'The two drills from the together phase on: a random part with a count-in, and keeping going when the music drops out or skips.' },
  { id: 'stage', title: 'Her stage', about: 'Naming her stage and choosing its colours and her light stick’s colour.' },
  { id: 'listen', title: 'The listening run', about: 'On light days: her track with no words on screen while she imagines performing it, eyes closed.' },
  { id: 'session', title: 'The guided session', about: 'Start today’s practice: the buttons she taps between reps.' },
  { id: 'sounds', title: 'Sounds', about: 'Her volume and mute for the spoken cues and the sound effects.' },
  { id: 'tour', title: 'The first-run tour', about: 'Five short slides, about 30 seconds, offered on Today the first time.' },
  { id: 'cues', title: 'Spoken cues', about: 'What the coach says out loud (recorded; a custom section name is said in the iPad’s own voice). Only between reps, never over a video or her track.' },
  { id: 'sections', title: 'Her sections', about: 'The list of sections and each section’s page.' },
  { id: 'quiz', title: 'Quick tests', about: 'Missing words and counts from memory.' },
  { id: 'showtime', title: 'Showtime', about: 'The whole track from the top, with no stopping.' },
  { id: 'reflect', title: 'Looking back', about: 'After Showtime, a clip or performing for family: one thing that went well, one to work on.' },
  { id: 'record', title: 'Recording', about: 'The camera, recording beside the reference, and the note when an older clip is deleted.' },
  { id: 'clips', title: 'Her clips', about: 'The list of clips kept on the iPad.' },
  { id: 'narrator', title: 'The coach’s voice', about: 'The buttons for the coach reading a lesson aloud.' },
  { id: 'lessons', title: 'Lessons', about: 'The seven skill lessons, in full, each read aloud by the coach word for word, with its “try it” and the line that puts her teachers first.' },
]

const human = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())

export function kidStrings(): KidString[] {
  const out: KidString[] = []
  for (const [group, entries] of Object.entries(KID_COPY)) {
    for (const [key, text] of Object.entries(entries as Record<string, string>)) out.push({ group, sub: '', where: `kid.${group}.${key}`, text })
  }
  for (const [phase, c] of Object.entries(PHASE_COPY)) {
    out.push({ group: 'plan', sub: 'Phases', where: `phase.${phase}.name`, text: c.name })
    out.push({ group: 'plan', sub: 'Phases', where: `phase.${phase}.about`, text: c.about })
  }
  for (const [type, c] of Object.entries(BLOCK_COPY)) {
    out.push({ group: 'plan', sub: 'Blocks', where: `block.${type}.title`, text: c.title })
    out.push({ group: 'plan', sub: 'Blocks', where: `block.${type}.how`, text: c.how })
  }
  for (const [drill, c] of Object.entries(DRILL_COPY)) {
    out.push({ group: 'plan', sub: 'Drills', where: `drill.${drill}.title`, text: c.title })
    out.push({ group: 'plan', sub: 'Drills', where: `drill.${drill}.how`, text: c.how })
  }
  for (const [id, r] of Object.entries(ROUTINES)) {
    out.push({ group: 'routines', sub: r.title, where: `routine.${id}.title`, text: r.title })
    r.steps.forEach((s, i) => out.push({ group: 'routines', sub: r.title, where: `routine.${id}.${i + 1}`, text: s }))
  }
  for (const [ladder, c] of Object.entries(LADDER_COPY)) {
    out.push({ group: 'ladders', sub: c.name, where: `ladder.${ladder}.name`, text: c.name })
    out.push({ group: 'ladders', sub: c.name, where: `ladder.${ladder}.about`, text: c.about })
    for (const [id, s] of Object.entries(STEP_COPY).filter(([id]) => id.startsWith(`${ladder}-`))) {
      out.push({ group: 'ladders', sub: c.name, where: `step.${id}.name`, text: s.name })
      out.push({ group: 'ladders', sub: c.name, where: `step.${id}.how`, text: s.how })
    }
  }
  for (const [ladder, c] of Object.entries(SECTION_LESSON_COPY)) {
    out.push({ group: 'learn', sub: `${human(ladder)} lessons`, where: `learn.${ladder}.title`, text: c.title })
    c.intro.forEach((t, i) => out.push({ group: 'learn', sub: `${human(ladder)} lessons`, where: `learn.${ladder}.${i + 1}`, text: t }))
  }
  WENT_WELL.forEach((t, i) => out.push({ group: 'reflect', sub: 'One thing that went well', where: `reflect.wentWell.${i + 1}`, text: t }))
  WORK_ON.forEach((t, i) => out.push({ group: 'reflect', sub: 'One thing to work on next', where: `reflect.workOn.${i + 1}`, text: t }))
  for (const l of LESSONS) {
    out.push({ group: 'lessons', sub: l.title, where: `lesson.${l.id}.title`, text: l.title })
    l.paragraphs.forEach((p, i) => out.push({ group: 'lessons', sub: l.title, where: `lesson.${l.id}.${i + 1}`, text: p }))
    out.push({ group: 'lessons', sub: l.title, where: `lesson.${l.id}.tryIt`, text: l.tryIt })
    out.push({ group: 'lessons', sub: l.title, where: `lesson.${l.id}.teachersFirst`, text: l.teachersFirst })
  }
  // Keep each group together, in KID_GROUPS order.
  const order = new Map(KID_GROUPS.map((g, i) => [g.id, i]))
  return out
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (order.get(a.s.group) ?? 99) - (order.get(b.s.group) ?? 99) || a.i - b.i)
    .map((x) => x.s)
}

export { human }
