/** Local calendar days as "YYYY-MM-DD" strings (the iPad's own time zone). */

const RE = /^(\d{4})-(\d{2})-(\d{2})$/

const pad = (n: number) => String(n).padStart(2, '0')

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Noon on that day, so clock changes never move it to another date. */
function noon(key: string): Date {
  const m = RE.exec(key)
  if (!m) throw new Error(`not a day: ${key}`)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)
}

export function isDayKey(s: unknown): s is string {
  if (typeof s !== 'string' || !RE.test(s)) return false
  return dayKey(noon(s)) === s
}

export function addDays(key: string, n: number): string {
  const d = noon(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const a = noon(from)
  const b = noon(to)
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((utc(b) - utc(a)) / 86_400_000)
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(key: string): number {
  return noon(key).getDay()
}

export const today = (): string => dayKey(new Date())
