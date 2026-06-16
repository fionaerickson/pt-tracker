import { describe, it, expect } from "vitest";
import { checkOverload } from "@/lib/logic/overload";
import { makeLog } from "./helpers";

const base = { currentReadiness: 4, progressBy: "weight" as const, purpose: "Strength" as const };

describe("checkOverload — spec §6.3 + difficulty/PT rules", () => {
  it("fires (stagnant) on the worked example: 3 qualifying logs all at 30 lb", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 4, weight: 30, performedAt: new Date("2026-06-12") }),
      makeLog({ readinessScore: 3, weight: 30, performedAt: new Date("2026-06-10") }),
      makeLog({ readinessScore: 2, weight: 15, performedAt: new Date("2026-06-08") }), // excluded
      makeLog({ readinessScore: 3, weight: 30, performedAt: new Date("2026-06-06") }),
    ];
    expect(checkOverload({ ...base, currentReadiness: 3, windowedLogs })).toEqual({
      metric: "weight",
      value: 30,
      reason: "stagnant",
    });
  });

  it("gate 1: never nudges when current readiness is 1 or 2", () => {
    const windowedLogs = [makeLog({ readinessScore: 5, weight: 30 }), makeLog({ readinessScore: 5, weight: 30 })];
    expect(checkOverload({ ...base, currentReadiness: 2, windowedLogs })).toBeNull();
    expect(checkOverload({ ...base, currentReadiness: 1, windowedLogs })).toBeNull();
  });

  it("does not nudge when the metric is progressing (values differ)", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 4, weight: 35, performedAt: new Date("2026-06-12") }),
      makeLog({ readinessScore: 4, weight: 30, performedAt: new Date("2026-06-10") }),
    ];
    expect(checkOverload({ ...base, windowedLogs })).toBeNull();
  });

  // Punch-list 1 — too easy
  it("fires (too_easy) when the most recent qualifying log was rated 1/5, even if not stagnant", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 4, weight: 40, perceivedDifficulty: 1, performedAt: new Date("2026-06-12") }),
      makeLog({ readinessScore: 4, weight: 30, performedAt: new Date("2026-06-10") }),
    ];
    expect(checkOverload({ ...base, windowedLogs })).toEqual({
      metric: "weight",
      value: 40,
      reason: "too_easy",
    });
  });

  // Punch-list 1 — too hard postpones
  it("postpones an otherwise-stagnant nudge when the most recent qualifying log was rated 5/5", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 4, weight: 30, perceivedDifficulty: 5, performedAt: new Date("2026-06-12") }),
      makeLog({ readinessScore: 4, weight: 30, performedAt: new Date("2026-06-10") }),
    ];
    expect(checkOverload({ ...base, windowedLogs })).toBeNull();
  });

  // Punch-list 6 — PT exclusion
  it("never nudges a PT exercise", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 4, weight: 30, perceivedDifficulty: 1 }),
      makeLog({ readinessScore: 4, weight: 30 }),
    ];
    expect(checkOverload({ ...base, purpose: "PT", windowedLogs })).toBeNull();
  });

  it("never nudges when the progress goal is na", () => {
    const windowedLogs = [makeLog({ readinessScore: 4, weight: 30 }), makeLog({ readinessScore: 4, weight: 30 })];
    expect(checkOverload({ ...base, progressBy: "na", windowedLogs })).toBeNull();
  });

  it("watches reps and time metrics", () => {
    const reps = [makeLog({ readinessScore: 4, reps: 10 }), makeLog({ readinessScore: 3, reps: 10 })];
    expect(checkOverload({ ...base, progressBy: "reps", windowedLogs: reps })).toMatchObject({
      metric: "reps",
      value: 10,
      reason: "stagnant",
    });
    const time = [makeLog({ readinessScore: 4, durationSeconds: 60 }), makeLog({ readinessScore: 4, durationSeconds: 60 })];
    expect(checkOverload({ ...base, progressBy: "time", windowedLogs: time })).toMatchObject({
      metric: "time",
      value: 60,
      reason: "stagnant",
    });
  });

  it("does not nudge with only one qualifying log (and it isn't too-easy)", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 4, weight: 30 }),
      makeLog({ readinessScore: 2, weight: 30 }),
    ];
    expect(checkOverload({ ...base, windowedLogs })).toBeNull();
  });
});
