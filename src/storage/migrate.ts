/**
 * Moving an older save up to the current schema, one version at a time. Each step only adds what the
 * newer version needs: nothing she or a grown-up set up is changed. normalize() then fills in any
 * field still missing. The store keeps the older document as the backup copy before writing the new one.
 */
import { versionOf } from './normalize'
import { CURRENT_SCHEMA_VERSION } from './schema'

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
