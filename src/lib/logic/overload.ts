/**
 * Progressive overload check — spec §6.3, extended with difficulty awareness
 * and the PT exclusion (punch-list 1 & 6).
 *
 * Returns a nudge when the tracked metric warrants a bump:
 *   - reason "stagnant" — the metric is unchanged across qualifying logs.
 *   - reason "too_easy" — the most recent qualifying log was rated 1/5 difficulty.
 *
 * Guards (any → no nudge):
 *   - exercise.purpose === "PT"          (PT exercises never get nudges)
 *   - progressBy === "na"                (no tracked metric)
 *   - current session readiness 1 or 2   (flare-up day)
 *   - most recent qualifying log 5/5      (postpone an otherwise-firing nudge)
 *
 * Low-readiness logs (< OVERLOAD_READINESS_FLOOR) are excluded from the
 * comparison entirely.
 */

import {
  OVERLOAD_READINESS_FLOOR,
  OVERLOAD_MIN_QUALIFYING,
  DIFFICULTY_TOO_EASY,
  DIFFICULTY_TOO_HARD,
} from "@/lib/constants";
import type { Log, ProgressBy, Purpose } from "@/lib/types";

export type OverloadReason = "stagnant" | "too_easy";

export interface OverloadResult {
  metric: ProgressBy;
  /** The value to build the nudge around (stagnant value, or the last too-easy value). */
  value: number;
  reason: OverloadReason;
}

/** Read the field a given `progressBy` metric maps to on a log. */
function metricValue(log: Log, progressBy: ProgressBy): number | null {
  switch (progressBy) {
    case "weight":
      return log.weight;
    case "reps":
      return log.reps;
    case "time":
      return log.durationSeconds;
    case "na":
      return null;
  }
}

export interface OverloadInput {
  /** Readiness of the active workout (the current session). */
  currentReadiness: number;
  /** Logs for this exercise within the adaptive window, this user. Order irrelevant. */
  windowedLogs: Log[];
  progressBy: ProgressBy;
  /** PT exercises never receive nudges. */
  purpose: Purpose;
}

export function checkOverload({
  currentReadiness,
  windowedLogs,
  progressBy,
  purpose,
}: OverloadInput): OverloadResult | null {
  // Hard exclusions.
  if (purpose === "PT") return null; // punch-list 6
  if (progressBy === "na") return null;

  // Gate 1 — no nudge ever shows on a flare-up day.
  if (currentReadiness <= 2) return null;

  // Gate 2 — exclude low-readiness sessions; keep most-recent-first ordering.
  const qualifying = windowedLogs
    .filter((log) => log.readinessScore >= OVERLOAD_READINESS_FLOOR)
    .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());

  if (qualifying.length === 0) return null;

  const recent = qualifying[0];
  const recentValue = metricValue(recent, progressBy);

  // Too easy — the most recent qualifying log was rated 1/5: encourage a bump
  // next time, regardless of stagnation (punch-list 1).
  if (recent.perceivedDifficulty === DIFFICULTY_TOO_EASY && recentValue != null) {
    return { metric: progressBy, value: recentValue, reason: "too_easy" };
  }

  // Stagnation needs enough qualifying logs and a present, identical metric.
  if (qualifying.length < OVERLOAD_MIN_QUALIFYING) return null;
  const values = qualifying.map((log) => metricValue(log, progressBy));
  if (values.some((v) => v == null)) return null;

  const first = values[0] as number;
  const allEqual = values.every((v) => v === first);
  if (!allEqual) return null;

  // Postpone if the most recent qualifying log was rated 5/5 (punch-list 1).
  if (recent.perceivedDifficulty === DIFFICULTY_TOO_HARD) return null;

  return { metric: progressBy, value: first, reason: "stagnant" };
}
