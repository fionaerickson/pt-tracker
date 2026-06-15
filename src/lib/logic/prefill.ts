/**
 * Adaptive prefill — spec §6.2.
 *
 * Pure function deciding what the logging screen shows when an exercise is
 * tapped. Runs after a single windowed-logs query. Branches:
 *
 *   A — overload nudge: overload check (§6.3) returns a stagnant metric.
 *       Prefill the progressBy field with the stagnant value, remaining fields
 *       from the most recent log.
 *   B — recent prefill: any logs in the window → prefill all fields from the
 *       most recent log, fully editable.
 *   C — cold start: prefill from defaultWeight + usualRepRange, or blank.
 */

import type { Exercise, Log } from "@/lib/types";
import { checkOverload, type OverloadResult } from "./overload";

export type PrefillBranch = "overload" | "recent" | "cold_start";

export interface PrefillFields {
  weight: number | null;
  unit: string | null;
  reps: number | null;
  durationSeconds: number | null;
  /** A fresh cart line starts at one round (§6.4); quantity is bumped later. */
  rounds: number;
}

export interface PrefillResult {
  branch: PrefillBranch;
  fields: PrefillFields;
  /** Present only on the overload branch; drives the nudge message. */
  overload: OverloadResult | null;
}

export interface PrefillInput {
  currentReadiness: number;
  /** Logs for this exercise within the adaptive window, this user. */
  windowedLogs: Log[];
  exercise: Exercise;
}

/** Most recent log by performedAt, or null if the window is empty. */
function mostRecent(logs: Log[]): Log | null {
  if (logs.length === 0) return null;
  return logs.reduce((latest, log) =>
    log.performedAt > latest.performedAt ? log : latest,
  );
}

function fieldsFromLog(log: Log): PrefillFields {
  return {
    weight: log.weight,
    unit: log.unit,
    reps: log.reps,
    durationSeconds: log.durationSeconds,
    rounds: 1,
  };
}

export function computePrefill({
  currentReadiness,
  windowedLogs,
  exercise,
}: PrefillInput): PrefillResult {
  const recent = mostRecent(windowedLogs);

  // Branch A — overload nudge.
  const overload = checkOverload({
    currentReadiness,
    windowedLogs,
    progressBy: exercise.progressBy,
  });

  if (overload && recent) {
    const fields = fieldsFromLog(recent);
    // Prefill the watched metric with the stagnant value.
    if (overload.metric === "weight") fields.weight = overload.value;
    else if (overload.metric === "reps") fields.reps = overload.value;
    else if (overload.metric === "time") fields.durationSeconds = overload.value;
    return { branch: "overload", fields, overload };
  }

  // Branch B — recent prefill.
  if (recent) {
    return { branch: "recent", fields: fieldsFromLog(recent), overload: null };
  }

  // Branch C — cold start.
  return {
    branch: "cold_start",
    fields: {
      weight: exercise.hasWeight ? exercise.defaultWeight : null,
      unit: exercise.hasWeight ? exercise.defaultUnit : null,
      reps: exercise.usualRepRange?.min ?? null,
      durationSeconds: null,
      rounds: 1,
    },
    overload: null,
  };
}
