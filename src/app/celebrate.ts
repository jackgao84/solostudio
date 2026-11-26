/**
 * Celebrations in the moment (version 1.1): when she ticks a step, a stage light switches on (with
 * its sound) and the next screen's top bar says so for a few seconds; finishing a ladder adds a cheer.
 * Only ever for doing things.
 */
import { cheer, lightOn } from '../audio/sfx'
import { KID_COPY } from '../content/kid'
import type { Celebration } from '../model/celebrate'
import { fill } from '../ui/dom'

let pending: string | null = null

/** Play the sounds now; the words show on the next screen's top bar. */
export function celebrate(kinds: Celebration[], section: string): void {
  if (!kinds.length) return
  lightOn()
  if (kinds.includes('ladderDone')) {
    window.setTimeout(() => cheer(), 350)
    pending = fill(KID_COPY.sections.ladderDone, { section })
  } else pending = fill(KID_COPY.sections.lightOn, { section })
}

/** The words for the top bar, once. */
export function takeCelebration(): string | null {
  const p = pending
  pending = null
  return p
}
