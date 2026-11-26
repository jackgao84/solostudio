/**
 * Moving an older save up to the current schema, one version at a time. Each step only adds what the
 * newer version needs: nothing she or a grown-up set up is changed. normalize() then fills in any
 * field still missing. The store keeps the older document as the backup copy before writing the new one.
 */
import { versionOf } from './normalize'
import { CURRENT_SCHEMA_VERSION, WIZARD_STEPS, type WizardStep } from './schema'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Step from version n to n + 1. */
const STEPS: Record<number, (doc: Obj) => Obj> = {
  /**
   * 1 → 2 (version 1.1): her stage, sounds, the Showtime routine, notes, the practice log, the tour
   * and celebrations start at their defaults (normalize fills them in). A Showtime or a performance
   * for family she already finished counts as her first Showtime, so its confetti never fires late.
   */
  1: (doc) => {
    const reflections = Array.isArray(doc.reflections) ? doc.reflections : []
    const ranBefore = reflections.some((r) => isObj(r) && (r.kind === 'showtime' || r.kind === 'family'))
    return { ...doc, schemaVersion: 2, celebrated: { firstShowtime: ranBefore } }
  },
  /**
   * 2 → 3 (version 1.2): narration on, no skill lesson finished yet (normalize fills both in), and
   * the setup wizard counts every step a grown-up already did on 1.1 as done, so nobody is asked to
   * set up again. Nothing already there changes, the walk-on time included.
   */
  2: (doc) => ({ ...doc, schemaVersion: 3, wizard: { at: null, done: setupAlreadyDone(doc) } }),
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v)

/** The wizard steps a 1.1 save already covers. */
export function setupAlreadyDone(doc: Obj): WizardStep[] {
  const sections = (Array.isArray(doc.sections) ? doc.sections : []).filter(isObj)
  const lines = sections.flatMap((s) => (Array.isArray(s.lines) ? s.lines.filter(isObj) : []))
  const track = isObj(doc.track) ? doc.track : {}
  const tempo = isObj(doc.tempo) ? doc.tempo : {}
  const refs = (Array.isArray(doc.refs) ? doc.refs : []).filter(isObj)
  const mirrored = refs.filter((r) => r.role === 'mirrored' || (r.kind === 'local' && r.mirror === true)).map((r) => r.id)
  const has: Record<WizardStep, boolean> = {
    track: typeof track.mediaId === 'string' && track.mediaId !== '',
    lines: lines.length > 0,
    starts: sections.length > 0 && sections.every((s) => isObj(s.track) && num(s.track.start)),
    follow: sections.some((s) => isObj(s.refs) && mirrored.some((id) => isObj((s.refs as Obj)[id as string]) && num(((s.refs as Obj)[id as string] as Obj).start))),
    timing: lines.length > 0 && lines.every((l) => num(l.time)),
    beat: num(tempo.bpm) && num(tempo.offset),
    dates: isObj(doc.show) && isObj(doc.plan),
  }
  return WIZARD_STEPS.filter((s) => has[s])
}

/** An older document brought up to CURRENT_SCHEMA_VERSION (newer and unknown documents come back as they are). */
export function migrate(raw: unknown): unknown {
  let v = versionOf(raw)
  if (v === null || v >= CURRENT_SCHEMA_VERSION) return raw
  let doc = raw as Obj
  while (v < CURRENT_SCHEMA_VERSION) {
    const step = STEPS[v]
    doc = step ? step(doc) : { ...doc, schemaVersion: v + 1 }
    v = versionOf(doc) ?? v + 1
  }
  return doc
}
