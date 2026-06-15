/**
 * Progressive overload check — spec §6.3.
 *
 * Pure function: given the current session's readiness, the windowed logs for
 * one exercise, and the exercise's `progressBy` metric, decide whether the
 * tracked metric has stagnated and a nudge should fire.
 *
 * Two gates plus a stagnation test:
 *   1. Current-session gate: readiness 1 or 2 → never nudge (flare-up day).
 *   2. History filter: keep only logs with readiness >= OVERLOAD_READINESS_FLOOR.
 *   3. Stagnation: >= OVERLOAD_MIN_QUALIFYING qualifying logs AND the metric
 *      value is identical across all of them → nudge with that metric + value.
 */

import { OVERLOAD_READINESS_FLOOR, OVERLOAD_MIN_QUALIFYING } from "@/lib/constants";
import type { Log, ProgressBy } from "@/lib/types";

export interface OverloadResult {
  metric: ProgressBy;
  /** The stagnant value of the metric (weight in units, reps, or seconds). */
  value: number;
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
  }
}

export interface OverloadInput {
  /** Readiness of the active workout (the current session). */
  currentReadiness: number;
  /** Logs for this exercise within the adaptive window, this user. Order irrelevant. */
  windowedLogs: Log[];
  progressBy: ProgressBy;
}

export function checkOverload({
  currentReadiness,
  windowedLogs,
  progressBy,
}: OverloadInput): OverloadResult | null {
  // Gate 1 — no nudge ever shows on a flare-up day.
  if (currentReadiness <= 2) return null;

  // Gate 2 — exclude low-readiness sessions from the comparison entirely.
  const qualifying = windowedLogs.filter(
    (log) => log.readinessScore >= OVERLOAD_READINESS_FLOOR,
  );

  if (qualifying.length < OVERLOAD_MIN_QUALIFYING) return null;

  // Stagnation test — the metric must be present and identical across all.
  const values = qualifying.map((log) => metricValue(log, progressBy));
  if (values.some((v) => v == null)) return null;

  const first = values[0] as number;
  const allEqual = values.every((v) => v === first);
  if (!allEqual) return null;

  return { metric: progressBy, value: first };
}
