/** Clips stay on the iPad: the newest 3 per section and the newest 3 run-throughs. */

export const KEEP_NEWEST = 3

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
