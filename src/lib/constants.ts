/**
 * Tunable constants — spec §3.
 * Centralised so the business logic has a single source of truth for every
 * threshold and window. Keep these here; do not inline magic numbers.
 */

/** Recency window for prefill, overload, and the variation-win PR (days). */
export const ADAPTIVE_WINDOW_DAYS = 14;

/** Window for the rolling workout count shown in the summary (days). */
export const ROLLING_STATS_DAYS = 30;

/** A gap larger than this between session start and now triggers a fresh greeting (hours). */
export const GREETING_THRESHOLD_HOURS = 12;

export const READINESS_MIN = 1;
export const READINESS_MAX = 5;

export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 5;

/** Logs below this readiness are excluded from the overload comparison. */
export const OVERLOAD_READINESS_FLOOR = 3;

/** Need at least this many qualifying logs to detect stagnation. */
export const OVERLOAD_MIN_QUALIFYING = 2;

/** Cap on the number of PRs shown per workout summary. */
export const MAX_PRS = 3;

/** A most-recent qualifying log at this difficulty means "too easy" → encourage a bump. */
export const DIFFICULTY_TOO_EASY = 1;

/** A most-recent qualifying log at this difficulty postpones an otherwise-firing nudge. */
export const DIFFICULTY_TOO_HARD = 5;

// Derived helpers for working with the windows in milliseconds.
export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

export const ADAPTIVE_WINDOW_MS = ADAPTIVE_WINDOW_DAYS * DAY_MS;
export const ROLLING_STATS_MS = ROLLING_STATS_DAYS * DAY_MS;
export const GREETING_THRESHOLD_MS = GREETING_THRESHOLD_HOURS * HOUR_MS;
