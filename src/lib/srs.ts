/**
 * SM-2 spaced repetition scheduler.
 *
 * Ratings (Anki-style, 0–3):
 *   0 = Again   — failed; reset interval
 *   1 = Hard    — recalled with difficulty
 *   2 = Good    — recalled cleanly
 *   3 = Easy    — instant, effortless
 *
 * Returns the new SM-2 state for a card after a review.
 */

export type Rating = 0 | 1 | 2 | 3

export interface SrsState {
  ease_factor: number    // 1.30 – 2.50+
  interval_days: number  // days until next review
  repetitions: number    // successful reps in a row
}

export interface SrsNextState extends SrsState {
  next_review_at: Date
}

const MIN_EF = 1.30
const DEFAULT_EF = 2.50

// SM-2 quality mapping. We compress the 0–5 quality scale to 0–3.
const QUALITY_MAP: Record<Rating, number> = {
  0: 0, // again → fail
  1: 3, // hard → barely passing
  2: 4, // good → solid
  3: 5, // easy → perfect
}

export function schedule(state: SrsState, rating: Rating, now: Date = new Date()): SrsNextState {
  const q = QUALITY_MAP[rating]
  let { ease_factor, interval_days, repetitions } = state

  // Update ease factor (SM-2 formula)
  ease_factor = Math.max(
    MIN_EF,
    ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  )

  if (q < 3) {
    // Failed — reset
    repetitions = 0
    interval_days = 0  // review again today (or in a few minutes)
  } else {
    repetitions += 1
    if (repetitions === 1) {
      interval_days = 1
    } else if (repetitions === 2) {
      interval_days = 6
    } else {
      interval_days = Math.round(interval_days * ease_factor)
    }
  }

  // For "Easy" we give an extra bump
  if (rating === 3 && repetitions > 0) {
    interval_days = Math.round(interval_days * 1.3)
  }

  const next_review_at = new Date(now)
  if (interval_days === 0) {
    // Failed card — see it again in ~10 minutes
    next_review_at.setMinutes(next_review_at.getMinutes() + 10)
  } else {
    next_review_at.setDate(next_review_at.getDate() + interval_days)
  }

  return { ease_factor, interval_days, repetitions, next_review_at }
}

export function initialState(): SrsState {
  return { ease_factor: DEFAULT_EF, interval_days: 0, repetitions: 0 }
}
