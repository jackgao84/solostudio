/**
 * The only way checks make lyric-shaped data. Real lines are typed by a grown-up on the iPad and
 * never enter the repo, so every line in code, tests and fixtures is a placeholder such as
 * "Line 3 of Verse 1" (and its meaning line, "Meaning of Line 3 of Verse 1").
 * tests/unit/lyrics.test.ts enforces this across the repo.
 */

/** "Line 3 of Verse 1", "Line 12 of Dance Break", "Meaning of Line 2 of Pre-chorus". */
export const PLACEHOLDER_RE = /^(?:Meaning of )?Line \d+ of [A-Z][A-Za-z]*(?:[ -][A-Za-z0-9]+)*$/

export function isPlaceholder(text: string): boolean {
  return text === '' || PLACEHOLDER_RE.test(text)
}

function checked(text: string): string {
  if (!PLACEHOLDER_RE.test(text)) throw new Error(`not a placeholder: ${text}`)
  return text
}

/** "Line n of <section>". */
export function lyricLine(n: number, section: string): string {
  return checked(`Line ${n} of ${section}`)
}

/** "Meaning of Line n of <section>". */
export function meaningLine(n: number, section: string): string {
  return checked(`Meaning of Line ${n} of ${section}`)
}

/** Generated word tokens (w1 … wn) for word-level rules such as fading and blanks. */
export function placeholderWords(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `w${i + 1}`)
}
