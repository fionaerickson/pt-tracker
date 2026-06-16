/**
 * PR / novelty cascade — spec §6.6.
 *
 * All comparisons are against the user's history PRIOR to this workout (logs
 * from other workouts), supplied via `prior` so this stays a pure function.
 *
 * Tiers (lower = higher priority):
 *   1 new_max_weight        new all-time max weight (heavier than ever, even at 1 rep)
 *   2 new_max_reps_or_time  unweighted: more reps OR more time than ever
 *   3 rep_pr_at_weight      more reps at a weight that has prior history to beat
 *   4 hard_day_consolation  FALLBACK only — no real PR AND readiness in {1,2}
 *   5 variation_win         not performed in the prior ADAPTIVE_WINDOW_DAYS
 *
 * Confirmed decisions baked in:
 *   - new_max_weight requires a strictly heavier all-time max; a novel-but-lighter
 *     weight does not trigger it (a never-before-seen exercise is caught by tier 5).
 *   - hard_day_consolation is a fallback only; it never co-appears with real PRs.
 */

import { MAX_PRS, ADAPTIVE_WINDOW_DAYS } from "@/lib/constants";
import type { Log, PrCategory } from "@/lib/types";

const TIER: Record<PrCategory, number> = {
  new_max_weight: 1,
  new_max_reps_or_time: 2,
  rep_pr_at_weight: 3,
  hard_day_consolation: 4,
  variation_win: 5,
};

/** Prior-history stats for one exercise (everything before this workout). */
export interface PriorStats {
  allTimeMaxWeight: number | null;
  allTimeMaxReps: number | null;
  allTimeMaxTime: number | null;
  /** Prior best reps keyed by the exact weight they were performed at. */
  bestRepsByWeight: Map<number, number>;
  /** Whether the exercise was performed in the prior ADAPTIVE_WINDOW_DAYS (excluding this workout). */
  performedInPriorWindow: boolean;
}

export interface ExercisePerformance<Id = string> {
  exerciseId: Id;
  exerciseName: string;
  hasWeight: boolean;
  unit: string | null;
  /** This workout's logs for this exercise. */
  sessionLogs: Log[];
  prior: PriorStats;
}

export interface PrDraft<Id = string> {
  category: PrCategory;
  exerciseId: Id | null;
  exerciseName: string | null;
  weight?: number | null;
  unit?: string | null;
  reps?: number | null;
  durationSeconds?: number | null;
  message: string;
}

export interface PrCascadeInput<Id = string> {
  readinessScore: number;
  performances: ExercisePerformance<Id>[];
}

function maxOf(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v != null);
  return nums.length ? Math.max(...nums) : null;
}

export function computePrs<Id = string>({
  readinessScore,
  performances,
}: PrCascadeInput<Id>): PrDraft<Id>[] {
  const candidates: PrDraft<Id>[] = [];

  // First pass — performance PRs (tiers 1–3).
  for (const perf of performances) {
    const { exerciseId, exerciseName, hasWeight, unit, sessionLogs, prior } = perf;

    if (hasWeight) {
      const sessionMaxWeight = maxOf(sessionLogs.map((l) => l.weight));
      if (sessionMaxWeight == null) continue;

      // Tier 1 — new all-time max weight (needs a prior baseline to beat).
      if (prior.allTimeMaxWeight != null && sessionMaxWeight > prior.allTimeMaxWeight) {
        candidates.push({
          category: "new_max_weight",
          exerciseId,
          exerciseName,
          weight: sessionMaxWeight,
          unit,
          message: `New all-time max weight on ${exerciseName}: ${sessionMaxWeight}${unit ? ` ${unit}` : ""}!`,
        });
      } else {
        // Tier 3 — rep PR at the session's top weight, only if that exact weight
        // has prior history to beat.
        const priorBestReps = prior.bestRepsByWeight.get(sessionMaxWeight) ?? null;
        const sessionRepsAtMaxWeight = maxOf(
          sessionLogs.filter((l) => l.weight === sessionMaxWeight).map((l) => l.reps),
        );
        if (
          priorBestReps != null &&
          sessionRepsAtMaxWeight != null &&
          sessionRepsAtMaxWeight > priorBestReps
        ) {
          candidates.push({
            category: "rep_pr_at_weight",
            exerciseId,
            exerciseName,
            weight: sessionMaxWeight,
            unit,
            reps: sessionRepsAtMaxWeight,
            message: `Rep PR on ${exerciseName}: ${sessionRepsAtMaxWeight} reps at ${sessionMaxWeight}${unit ? ` ${unit}` : ""}!`,
          });
        }
      }
    } else {
      // Tier 2 — unweighted: more reps OR more time than ever (needs a baseline).
      const sessionMaxReps = maxOf(sessionLogs.map((l) => l.reps));
      const sessionMaxTime = maxOf(sessionLogs.map((l) => l.durationSeconds));
      const repsImproved =
        prior.allTimeMaxReps != null &&
        sessionMaxReps != null &&
        sessionMaxReps > prior.allTimeMaxReps;
      const timeImproved =
        prior.allTimeMaxTime != null &&
        sessionMaxTime != null &&
        sessionMaxTime > prior.allTimeMaxTime;

      if (repsImproved || timeImproved) {
        const parts: string[] = [];
        if (repsImproved) parts.push(`${sessionMaxReps} reps`);
        if (timeImproved) parts.push(`${sessionMaxTime}s`);
        candidates.push({
          category: "new_max_reps_or_time",
          exerciseId,
          exerciseName,
          reps: repsImproved ? sessionMaxReps : null,
          durationSeconds: timeImproved ? sessionMaxTime : null,
          message: `New best on ${exerciseName}: ${parts.join(" and ")}!`,
        });
      }
    }
  }

  // Second pass — variation wins (tier 5).
  for (const perf of performances) {
    if (!perf.prior.performedInPriorWindow) {
      candidates.push({
        category: "variation_win",
        exerciseId: perf.exerciseId,
        exerciseName: perf.exerciseName,
        message: `Back on ${perf.exerciseName} — first time in ${ADAPTIVE_WINDOW_DAYS} days!`,
      });
    }
  }

  // Sort by tier ascending (stable — preserves exercise order within a tier), cap.
  const prs = candidates
    .map((c, i) => ({ c, i }))
    .sort((a, b) => TIER[a.c.category] - TIER[b.c.category] || a.i - b.i)
    .map((x) => x.c)
    .slice(0, MAX_PRS);

  // Consolation is a true fallback: only when no real PR surfaced AND it was a hard day.
  if (prs.length === 0 && (readinessScore === 1 || readinessScore === 2)) {
    return [
      {
        category: "hard_day_consolation",
        exerciseId: null,
        exerciseName: null,
        message: "You showed up on a hard day. That counts.",
      },
    ];
  }

  return prs;
}
