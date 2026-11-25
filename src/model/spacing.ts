/**
 * Spaced review. A finished ladder comes back for a check after 1, 3 and 7 days, then every 7. A
 * section she marks shaky comes back the next day and climbs the gaps again from the start.
 */
import type { ReviewState } from '../storage/schema'
import { addDays } from './dates'

export const REVIEW_GAPS = [1, 3, 7] as const

export function startReviews(today: string): ReviewState {
  return { step: 0, due: addDays(today, REVIEW_GAPS[0]), shaky: false }
}

/** She did the check: the next one comes after the next gap, counted from today. */
export function reviewed(s: ReviewState, today: string): ReviewState {
  const step = Math.min(s.step + 1, REVIEW_GAPS.length - 1)
  return { step, due: addDays(today, REVIEW_GAPS[step]), shaky: false }
}

export function shakyReview(today: string): ReviewState {
  return { step: 0, due: addDays(today, 1), shaky: true }
}

export function isDue(s: ReviewState | null | undefined, today: string): boolean {
  return !!s && s.due <= today
}
