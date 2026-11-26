/**
 * Everything the coach says out loud (version 1.2), recorded once by `npm run voice` and kept in the
 * repo as small MP3s: every lesson script word for word, every fixed cue phrase, every standard
 * section name and every cue a standard section name can be part of. Only a custom section name is
 * left to the iPad's own voice (see src/audio/speech-plan.ts).
 */
import { BLOCK_COPY, DRILL_COPY } from './blocks'
import { KID_COPY } from './kid'
import { LADDER_COPY } from './ladders'
import { LESSONS, type Lesson } from './lessons'
import { COUNT_IN_WORDS } from '../model/countin'
import { LADDERS, LADDER_IDS } from '../model/ladders'
import { showtimeRoutine } from '../model/routine'
import { defaultShowtime } from '../storage/schema'
import { fill } from '../ui/dom'

/** The section names a grown-up picks from in setup (or types a custom one). */
export const STANDARD_SECTIONS = ['Intro', 'Verse 1', 'Verse 2', 'Pre-chorus', 'Chorus', 'Post-chorus', 'Rap', 'Bridge', 'Dance break', 'Outro'] as const

/** How a line is looked up: curly quotes, spacing and capitals don't matter. */
export function clipKey(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** The standard name a section's name matches (whatever its capitals), or null for a custom name. */
export function standardSection(name: string): string | null {
  const k = clipKey(name)
  return STANDARD_SECTIONS.find((s) => clipKey(s) === k) ?? null
}

/** One line for the coach to record; `prev`/`next` are the words around it, for natural timing. */
export interface NarrationLine {
  text: string
  prev?: string
  next?: string
}

/** A lesson as it is read aloud: exactly the words on screen, in order. */
export function lessonScript(l: Lesson): string[] {
  return [l.title, ...l.paragraphs, l.tryIt, l.teachersFirst]
}

/** "Next" in "Next: {section}": what the coach says before a custom name. */
export function cuePrefix(): string {
  return KID_COPY.cues.nextSection.split('{section}')[0].replace(/[:\s]+$/, '')
}

/** Every "{ladder}, {speed}% speed" a step cue can end with (said after a custom name). */
export function stepCueTails(): string[] {
  const tail = KID_COPY.cues.nextStep.split('{section}, ')[1]
  const out = new Set<string>()
  for (const id of LADDER_IDS) for (const s of LADDERS[id]) out.add(fill(tail, { ladder: LADDER_COPY[id].name, speed: Math.round(s.speed * 100) }))
  return [...out]
}

/** The cues a section name can be part of. */
export function sectionCues(name: string): string[] {
  const out = new Set([name, fill(KID_COPY.cues.nextSection, { section: name })])
  for (const id of LADDER_IDS) for (const s of LADDERS[id]) out.add(fill(KID_COPY.cues.nextStep, { section: name, ladder: LADDER_COPY[id].name, speed: Math.round(s.speed * 100) }))
  return [...out]
}

/** Every fixed cue phrase (no section name in it). */
export function fixedCues(): string[] {
  const C = KID_COPY.cues
  const S = KID_COPY.showtime
  const T = KID_COPY.tour
  const routine = showtimeRoutine(defaultShowtime())
    .map((s) => s.cue)
    .filter((c): c is string => !!c)
  return [
    C.countIn,
    C.sessionDone,
    C.getToSpot,
    C.again,
    cuePrefix(),
    ...stepCueTails(),
    S.breatheIn,
    S.breatheOut,
    ...routine,
    KID_COPY.listen.cueStart,
    KID_COPY.listen.cueEnd,
    T.slide1,
    T.slide2,
    T.slide3,
    T.slide4,
    T.slide5,
    T.end,
    ...Object.values(BLOCK_COPY).map((b) => fill(C.nextBlock, { block: b.title })),
    ...Object.values(DRILL_COPY).map((b) => fill(C.nextBlock, { block: b.title })),
    ...LESSONS.map((l) => fill(C.nextBlock, { block: l.title })),
  ]
}

/** Everything the coach records, once each. */
export function narrationLines(): NarrationLine[] {
  const out = new Map<string, NarrationLine>()
  const add = (line: NarrationLine) => {
    if (line.text.trim() && !out.has(line.text)) out.set(line.text, line)
  }
  // The count-in, one word per beat, recorded with the words around it so it sounds like counting.
  COUNT_IN_WORDS.forEach((w, i) =>
    add({ text: w, prev: i ? `${COUNT_IN_WORDS.slice(0, i).join(', ')},` : undefined, next: i < COUNT_IN_WORDS.length - 1 ? COUNT_IN_WORDS.slice(i + 1).join(', ') : undefined }),
  )
  for (const t of fixedCues()) add({ text: t })
  for (const name of STANDARD_SECTIONS) for (const t of sectionCues(name)) add({ text: t })
  for (const l of LESSONS) for (const t of lessonScript(l)) add({ text: t })
  return [...out.values()]
}
