import type { Log } from "@/lib/types";

let counter = 0;

/** Build a Log with sensible defaults; override only what a test cares about. */
export function makeLog(overrides: Partial<Log> = {}): Log {
  counter += 1;
  return {
    _id: { toString: () => `log-${counter}` } as unknown as Log["_id"],
    userId: "u1",
    workoutId: { toString: () => "w1" } as unknown as Log["workoutId"],
    exerciseId: { toString: () => "e1" } as unknown as Log["exerciseId"],
    exerciseName: "Bulgarian Split Squat",
    weight: null,
    unit: "lb",
    reps: null,
    durationSeconds: null,
    rounds: 1,
    isWarmup: false,
    perceivedDifficulty: null,
    readinessScore: 4,
    performedAt: new Date("2026-06-01T00:00:00Z"),
    createdAt: new Date("2026-06-01T00:00:00Z"),
    ...overrides,
  };
}
