/**
 * The setup wizard's logic (version 1.2), pure so the checks can read it.
 *  - The lines box: each section headed by its name in square brackets, then its lines, with an
 *    optional meaning line ("= …") under any line. A line with a meaning is Korean said by sound.
 *  - Section starts from taps on one play of her track: each section ends where the next begins.
 *  - Lines spread evenly through their section as a first guess.
 *  - The click a grown-up checks the beat against.
 * The app is usable once her track, her lines and the section starts are in; nothing else is required.
 */
import { setupAlreadyDone } from '../storage/migrate'
import { REQUIRED_WIZARD_STEPS, WIZARD_STEPS, type Line, type Marks, type SaveData, type Section, type WizardStep } from '../storage/schema'
import { standardSection } from '../content/narration'
import { MIN_SECTION, round2, spanOf, type Span } from './timing'

export interface ParsedLine {
  lyric: string
  meaning: string
}
export interface ParsedSection {
  name: string
  lines: ParsedLine[]
}

const HEADER = /^\s*\[\s*(.+?)\s*\]\s*$/
const MEANING = /^\s*=\s*(.*?)\s*$/

/** The box's words, read into sections. Problems are said plainly (and nothing is saved). */
export function parseSongText(text: string): { sections: ParsedSection[]; problems: string[] } {
  const sections: ParsedSection[] = []
  const problems: string[] = []
  const rows = text.split(/\r?\n/)
  rows.forEach((raw, i) => {
    if (!raw.trim()) return
    const head = HEADER.exec(raw)
    if (head) {
      sections.push({ name: standardSection(head[1]) ?? head[1].replace(/\s+/g, ' '), lines: [] })
      return
    }
    const current = sections.at(-1)
    const meaning = MEANING.exec(raw)
    if (meaning) {
      const line = current?.lines.at(-1)
      if (!line) problems.push(`Line ${i + 1}: a meaning line (starting with =) needs a line above it.`)
      else line.meaning = meaning[1]
      return
    }
    if (!current) {
      problems.push(`Line ${i + 1}: put a section name in square brackets, like [Verse 1], before the first line.`)
      return
    }
    current.lines.push({ lyric: raw.trim().replace(/\s+/g, ' '), meaning: '' })
  })
  if (!sections.length && !problems.length) problems.push('Paste her lines, with each section’s name in square brackets above its lines.')
  return { sections, problems }
}

/** The box as it would look for these sections (so saved lines can be edited the same way). */
export function songText(sections: readonly Section[]): string {
  return sections
    .map((s) => [`[${s.name}]`, ...s.lines.flatMap((l) => [l.lyric, ...(l.meaning ? [`= ${l.meaning}`] : [])])].join('\n'))
    .join('\n\n')
}

const key = (name: string) => name.trim().toLowerCase()

/**
 * The sections after saving the box: a section with the same name keeps its id, its marks and so
 * everything she has done in it; a line that is still there keeps its breaths and timing. Sections
 * not in the box are kept as they are (a grown-up deletes those in Sections).
 */
export function applySongText(save: Pick<SaveData, 'sections'>, parsed: readonly ParsedSection[], now: Date): Section[] {
  const old = new Map(save.sections.map((s) => [key(s.name), s]))
  const used = new Set<string>()
  const stamp = now.getTime().toString(36)
  const out: Section[] = parsed.map((p, si) => {
    const was = old.get(key(p.name))
    const id = was?.id ?? `sec-${stamp}-${si + 1}`
    used.add(id)
    const oldLines = was?.lines ?? []
    const lines: Line[] = p.lines.map((l, li) => {
      const same = oldLines.find((x, xi) => x.lyric === l.lyric && (xi === li || !p.lines.slice(0, li).some((y) => y.lyric === l.lyric)))
      return {
        id: same?.id ?? `${id}-l${li + 1}-${stamp}`,
        lyric: l.lyric,
        lang: l.meaning ? 'ko' : (same?.lang ?? 'en'),
        meaning: l.meaning,
        breaths: same?.breaths ?? [],
        time: same?.time ?? null,
      }
    })
    return was ? { ...was, name: p.name, lines } : { id, name: p.name, lines, track: { start: null, end: null }, refs: {}, createdAt: new Date(now.getTime() + si).toISOString() }
  })
  return [...out, ...save.sections.filter((s) => !used.has(s.id))]
}

/** Section marks from a tap as each section started: each ends where the next begins. */
export function startsFromTaps(taps: readonly number[], duration: number | null): Marks[] {
  return taps.map((t, i) => ({ start: round2(t), end: i + 1 < taps.length ? round2(taps[i + 1]) : duration != null ? round2(duration) : null }))
}

/** Move section i's start (and the end of the section before it) by delta, never past a neighbour. */
export function nudgeStart(marks: readonly Marks[], i: number, delta: number, duration: number | null): Marks[] {
  const out = marks.map((m) => ({ ...m }))
  const m = out[i]
  if (m?.start == null) return out
  const lo = i > 0 && out[i - 1].start != null ? out[i - 1].start! + MIN_SECTION : 0
  const hiEnd = m.end ?? duration ?? Infinity
  const hi = hiEnd - MIN_SECTION
  const next = round2(Math.min(hi, Math.max(lo, m.start + delta)))
  m.start = next
  if (i > 0) out[i - 1].end = next
  return out
}

/** A first guess at line timing: the section's lines evenly through it. */
export function spreadLines(n: number, span: Span): number[] {
  if (n <= 0) return []
  const step = (span.end - span.start) / n
  return Array.from({ length: n }, (_, i) => round2(span.start + i * step))
}

/** Her track, her lines and where each section starts: enough to practise. */
export function setupUsable(save: Pick<SaveData, 'track' | 'sections'>): boolean {
  return !!save.track.mediaId && save.sections.some((s) => s.lines.length > 0) && save.sections.every((s) => !!spanOf(s.track))
}

/** The wizard steps that are done: the required ones from what's there, the optional ones when a grown-up did them. */
export function stepsDone(save: SaveData): WizardStep[] {
  const fromData = setupAlreadyDone(save as unknown as Record<string, unknown>).filter((s) => REQUIRED_WIZARD_STEPS.includes(s))
  return WIZARD_STEPS.filter((s) => fromData.includes(s) || save.wizard.done.includes(s))
}

/** The click to check the beat against: every beat from `from` to `to`, the 1 of each bar marked. */
export function clickTimes(t: { bpm: number; offset: number }, from: number, to: number): { at: number; one: boolean }[] {
  const beat = 60 / t.bpm
  const first = Math.ceil((from - t.offset) / beat - 1e-9)
  const out: { at: number; one: boolean }[] = []
  for (let k = first; ; k++) {
    const at = Math.round((t.offset + k * beat) * 1000) / 1000
    if (at > to + 1e-9) break
    if (at >= from - 1e-9) out.push({ at, one: ((k % 4) + 4) % 4 === 0 })
  }
  return out
}
