/** Clips stay on the iPad: the newest 3 per section and the newest 3 run-throughs. */

export const KEEP_NEWEST = 3

/**
 * A recording runs for at least this long (ms): WebKit's recorder can hand back an empty clip when it
 * is stopped a few milliseconds after it starts, so a Stop before then takes effect once it passes.
 */
export const MIN_RECORD_MS = 1000

/** How long to wait before stopping a recording that has run for `elapsedMs`. */
export function stopDelay(elapsedMs: number): number {
  return Math.max(0, MIN_RECORD_MS - elapsedMs)
}

/** A clip is kept only when there is something in it. */
export function keepable(size: number): boolean {
  return size > 0
}

/** 'run' for run-throughs, 'section:<id>' for a section. */
export function groupOf(target: string): string {
  return target === 'run' ? 'run' : `section:${target}`
}

export function clipsToDelete<T extends { id: string; group: string; createdAt: number }>(clips: readonly T[], group: string): T[] {
  return clips
    .filter((c) => c.group === group)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(KEEP_NEWEST)
    .sort((a, b) => a.createdAt - b.createdAt)
}
