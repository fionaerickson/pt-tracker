import { describe, it, expect } from "vitest";
import { computePrs, type ExercisePerformance } from "@/lib/logic/prCascade";
import { makeLog } from "./helpers";

function perf(overrides: Partial<ExercisePerformance> = {}): ExercisePerformance {
  return {
    exerciseId: "e1",
    exerciseName: "Bulgarian Split Squat",
    hasWeight: true,
    unit: "lb",
    sessionLogs: [],
    prior: {
      allTimeMaxWeight: null,
      allTimeMaxReps: null,
      allTimeMaxTime: null,
      bestRepsByWeight: new Map(),
      performedInPriorWindow: true,
    },
    ...overrides,
  };
}

describe("computePrs — spec §6.6", () => {
  it("tier 1: new all-time max weight beats the prior baseline", () => {
    const prs = computePrs({
      readinessScore: 4,
      performances: [
        perf({
          sessionLogs: [makeLog({ weight: 40, reps: 5 })],
          prior: { allTimeMaxWeight: 35, allTimeMaxReps: null, allTimeMaxTime: null, bestRepsByWeight: new Map(), performedInPriorWindow: true },
        }),
      ],
    });
    expect(prs).toHaveLength(1);
    expect(prs[0]).toMatchObject({ category: "new_max_weight", weight: 40 });
  });

  it("does not award new_max_weight for a novel-but-lighter weight (no prior baseline)", () => {
    // No prior weighted history → not a max-weight PR. But it IS a variation win
    // because it was not performed in the prior window.
    const prs = computePrs({
      readinessScore: 4,
      performances: [
        perf({
          sessionLogs: [makeLog({ weight: 20, reps: 5 })],
          prior: { allTimeMaxWeight: null, allTimeMaxReps: null, allTimeMaxTime: null, bestRepsByWeight: new Map(), performedInPriorWindow: false },
        }),
      ],
    });
    expect(prs).toHaveLength(1);
    expect(prs[0].category).toBe("variation_win");
  });

  it("tier 3: rep PR at a weight with prior history", () => {
    const prs = computePrs({
      readinessScore: 4,
      performances: [
        perf({
          sessionLogs: [makeLog({ weight: 30, reps: 12 })],
          prior: {
            allTimeMaxWeight: 30,
            allTimeMaxReps: null,
            allTimeMaxTime: null,
            bestRepsByWeight: new Map([[30, 10]]),
            performedInPriorWindow: true,
          },
        }),
      ],
    });
    expect(prs[0]).toMatchObject({ category: "rep_pr_at_weight", weight: 30, reps: 12 });
  });

  it("tier 2: unweighted new max reps or time", () => {
    const prs = computePrs({
      readinessScore: 4,
      performances: [
        perf({
          hasWeight: false,
          exerciseName: "Plank",
          sessionLogs: [makeLog({ durationSeconds: 90 })],
          prior: { allTimeMaxWeight: null, allTimeMaxReps: null, allTimeMaxTime: 60, bestRepsByWeight: new Map(), performedInPriorWindow: true },
        }),
      ],
    });
    expect(prs[0]).toMatchObject({ category: "new_max_reps_or_time", durationSeconds: 90 });
  });

  it("tier 5: variation win when not performed in the prior window", () => {
    const prs = computePrs({
      readinessScore: 4,
      performances: [
        perf({
          sessionLogs: [makeLog({ weight: 30 })],
          prior: { allTimeMaxWeight: 35, allTimeMaxReps: null, allTimeMaxTime: null, bestRepsByWeight: new Map(), performedInPriorWindow: false },
        }),
      ],
    });
    expect(prs.some((p) => p.category === "variation_win")).toBe(true);
  });

  it("sorts by tier ascending and caps at MAX_PRS (3)", () => {
    const prs = computePrs({
      readinessScore: 4,
      performances: [
        perf({ exerciseId: "a", exerciseName: "A", sessionLogs: [makeLog({ weight: 50 })], prior: { allTimeMaxWeight: 40, allTimeMaxReps: null, allTimeMaxTime: null, bestRepsByWeight: new Map(), performedInPriorWindow: false } }),
        perf({ exerciseId: "b", exerciseName: "B", hasWeight: false, sessionLogs: [makeLog({ reps: 20 })], prior: { allTimeMaxWeight: null, allTimeMaxReps: 15, allTimeMaxTime: null, bestRepsByWeight: new Map(), performedInPriorWindow: false } }),
        perf({ exerciseId: "c", exerciseName: "C", sessionLogs: [makeLog({ weight: 30 })], prior: { allTimeMaxWeight: 25, allTimeMaxReps: null, allTimeMaxTime: null, bestRepsByWeight: new Map(), performedInPriorWindow: false } }),
      ],
    });
    expect(prs).toHaveLength(3);
    // Tier 1s come before tier 5s.
    expect(prs[0].category).toBe("new_max_weight");
    expect(prs.map((p) => TIERof(p.category)).every((t, i, arr) => i === 0 || arr[i - 1] <= t)).toBe(true);
  });

  it("hard_day_consolation: fallback only, on a hard day with no real PR", () => {
    const prs = computePrs({
      readinessScore: 2,
      performances: [
        perf({
          sessionLogs: [makeLog({ weight: 20 })],
          prior: { allTimeMaxWeight: 30, allTimeMaxReps: null, allTimeMaxTime: null, bestRepsByWeight: new Map(), performedInPriorWindow: true },
        }),
      ],
    });
    expect(prs).toHaveLength(1);
    expect(prs[0]).toMatchObject({ category: "hard_day_consolation", exerciseId: null });
  });

  it("no consolation when a real PR surfaced, even on a hard day", () => {
    const prs = computePrs({
      readinessScore: 2,
      performances: [
        perf({
          sessionLogs: [makeLog({ weight: 40 })],
          prior: { allTimeMaxWeight: 35, allTimeMaxReps: null, allTimeMaxTime: null, bestRepsByWeight: new Map(), performedInPriorWindow: true },
        }),
      ],
    });
    expect(prs.every((p) => p.category !== "hard_day_consolation")).toBe(true);
  });
});

const TIER_MAP: Record<string, number> = {
  new_max_weight: 1,
  new_max_reps_or_time: 2,
  rep_pr_at_weight: 3,
  hard_day_consolation: 4,
  variation_win: 5,
};
function TIERof(c: string): number {
  return TIER_MAP[c];
}
