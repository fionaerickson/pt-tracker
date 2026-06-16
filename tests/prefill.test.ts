import { describe, it, expect } from "vitest";
import { computePrefill } from "@/lib/logic/prefill";
import type { Exercise } from "@/lib/types";
import { makeLog } from "./helpers";

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    _id: { toString: () => "e1" } as unknown as Exercise["_id"],
    userId: "u1",
    name: "Bulgarian Split Squat",
    muscleGroup: "legs",
    purpose: "Strength",
    tags: ["legs"],
    equipment: ["free weights"],
    hasWeight: true,
    progressBy: "weight",
    defaultWeight: 25,
    defaultUnit: "lb",
    usualRepRange: { min: 8, max: 12 },
    weightStep: 5,
    lastPerformedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("computePrefill — spec §6.2", () => {
  it("Branch A — overload: prefills the stagnant metric, rest from most recent log", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 4, weight: 30, reps: 8, performedAt: new Date("2026-06-10") }),
      makeLog({ readinessScore: 4, weight: 30, reps: 10, performedAt: new Date("2026-06-12") }),
    ];
    const result = computePrefill({
      currentReadiness: 4,
      windowedLogs,
      exercise: makeExercise(),
    });
    expect(result.branch).toBe("overload");
    expect(result.overload).toEqual({ metric: "weight", value: 30, reason: "stagnant" });
    expect(result.fields.weight).toBe(30); // stagnant value
    expect(result.fields.reps).toBe(10); // from most recent log (2026-06-12)
  });

  it("Branch B — recent: prefills all fields from the most recent log", () => {
    const windowedLogs = [
      makeLog({ weight: 25, reps: 8, performedAt: new Date("2026-06-10") }),
      makeLog({ weight: 35, reps: 6, performedAt: new Date("2026-06-13") }),
    ];
    const result = computePrefill({
      currentReadiness: 4,
      windowedLogs,
      exercise: makeExercise(),
    });
    expect(result.branch).toBe("recent");
    expect(result.overload).toBeNull();
    expect(result.fields).toMatchObject({ weight: 35, reps: 6, rounds: 1 });
  });

  it("Branch C — cold start: prefills from exercise defaults when no logs exist", () => {
    const result = computePrefill({
      currentReadiness: 4,
      windowedLogs: [],
      exercise: makeExercise({ defaultWeight: 25, usualRepRange: { min: 8, max: 12 } }),
    });
    expect(result.branch).toBe("cold_start");
    expect(result.fields).toMatchObject({ weight: 25, unit: "lb", reps: 8 });
  });

  it("falls back to recent (not overload) on a flare-up day even if metric is stagnant", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 4, weight: 30, performedAt: new Date("2026-06-10") }),
      makeLog({ readinessScore: 4, weight: 30, performedAt: new Date("2026-06-12") }),
    ];
    const result = computePrefill({
      currentReadiness: 1,
      windowedLogs,
      exercise: makeExercise(),
    });
    expect(result.branch).toBe("recent");
  });
});
