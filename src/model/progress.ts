/** Her ladder ticks, shaky sections, and which checks are due. All pure: each returns a new object. */
import { emptyProgress, type LadderId, type SectionProgress } from '../storage/schema'
import { addDays } from './dates'
import { LADDERS, LADDER_IDS, type StepDef } from './ladders'
import { isDue, reviewed, shakyReview, startReviews } from './spacing'

const copy = (p: SectionProgress): SectionProgress => JSON.parse(JSON.stringify(p)) as SectionProgress

export function progressOf(all: Record<string, SectionProgress>, id: string): SectionProgress {
  return all[id] ?? emptyProgress()
}

export function nextStep(p: SectionProgress, ladder: LadderId): StepDef | null {
  return LADDERS[ladder].find((s) => !p[ladder].done.includes(s.id)) ?? null
}

/** "I did it" on a step. When every step of the ladder is ticked, its spaced checks begin. */
export function tickStep(p: SectionProgress, ladder: LadderId, stepId: string, today: string): SectionProgress {
  if (p[ladder].done.includes(stepId)) return p
  const out = copy(p)
  out[ladder].done.push(stepId)
  if (!out[ladder].finishedAt && LADDERS[ladder].every((s) => out[ladder].done.includes(s.id))) {
    out[ladder].finishedAt = today
    out[ladder].review = startReviews(today)
  }
  return out
}

export function setFade(p: SectionProgress, level: number): SectionProgress {
  const out = copy(p)
  out.rap.fade = Math.max(0, level)
  return out
}

/** She marks the section shaky: it comes back tomorrow, and finished ladders start their gaps again. */
export function markShaky(p: SectionProgress, today: string): SectionProgress {
  const out = copy(p)
  out.shaky = true
  out.shakyDue = addDays(today, 1)
  for (const l of LADDER_IDS) if (out[l].review) out[l].review = shakyReview(today)
  return out
}

export function clearShaky(p: SectionProgress): SectionProgress {
  const out = copy(p)
  out.shaky = false
  out.shakyDue = null
  for (const l of LADDER_IDS) if (out[l].review) out[l].review = { ...out[l].review!, shaky: false }
  return out
}

/** She did a check on a finished ladder ("I did it" on a quick test or the last rung). */
export function reviewLadder(p: SectionProgress, ladder: LadderId, today: string): SectionProgress {
  const out = copy(p)
  if (out[ladder].review) out[ladder].review = reviewed(out[ladder].review!, today)
  if (out.shaky) {
    out.shaky = false
    out.shakyDue = null
    for (const l of LADDER_IDS) if (out[l].review) out[l].review = { ...out[l].review!, shaky: false }
  }
  return out
}

export interface DueItem {
  sectionId: string
  ladder: LadderId
  shaky: boolean
  due: string
}

/** Checks due today: shaky sections first, then the longest waiting, then song order. */
export function dueItems(all: Record<string, SectionProgress>, order: readonly string[], today: string): DueItem[] {
  const items: (DueItem & { pos: number })[] = []
  order.forEach((sectionId, pos) => {
    const p = all[sectionId]
    if (!p) return
    let any = false
    for (const ladder of LADDER_IDS) {
      const r = p[ladder].review
      if (r && isDue(r, today)) {
        items.push({ sectionId, ladder, shaky: p.shaky || r.shaky, due: r.due, pos })
        any = true
      }
    }
    if (!any && p.shaky && p.shakyDue && p.shakyDue <= today) {
      const ladder = LADDER_IDS.find((l) => nextStep(p, l)) ?? 'together'
      items.push({ sectionId, ladder, shaky: true, due: p.shakyDue, pos })
    }
  })
  items.sort((a, b) => (a.shaky !== b.shaky ? (a.shaky ? -1 : 1) : a.due !== b.due ? (a.due < b.due ? -1 : 1) : a.pos - b.pos))
  return items.map(({ pos: _pos, ...rest }) => rest)
}
