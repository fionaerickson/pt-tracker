import { describe, it, expect } from "vitest";
import { checkOverload } from "@/lib/logic/overload";
import { makeLog } from "./helpers";

describe("checkOverload — spec §6.3", () => {
  it("fires on the worked example: 3 qualifying logs all at 30 lb", () => {
    // Worked example table from §6.3. The 15 lb dip is excluded on readiness,
    // not on weight.
    const windowedLogs = [
      makeLog({ readinessScore: 4, weight: 30 }), // qualifies
      makeLog({ readinessScore: 3, weight: 30 }), // qualifies
      makeLog({ readinessScore: 2, weight: 15 }), // excluded (low readiness)
      makeLog({ readinessScore: 3, weight: 30 }), // qualifies
    ];

    const result = checkOverload({
      currentReadiness: 3,
      windowedLogs,
      progressBy: "weight",
    });

    expect(result).toEqual({ metric: "weight", value: 30 });
  });

  it("gate 1: never nudges when current readiness is 1 or 2", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 5, weight: 30 }),
      makeLog({ readinessScore: 5, weight: 30 }),
    ];
    expect(checkOverload({ currentReadiness: 2, windowedLogs, progressBy: "weight" })).toBeNull();
    expect(checkOverload({ currentReadiness: 1, windowedLogs, progressBy: "weight" })).toBeNull();
  });

  it("does not nudge with fewer than OVERLOAD_MIN_QUALIFYING qualifying logs", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 4, weight: 30 }), // only one qualifies
      makeLog({ readinessScore: 2, weight: 30 }),
    ];
    expect(checkOverload({ currentReadiness: 4, windowedLogs, progressBy: "weight" })).toBeNull();
  });

  it("does not nudge when the metric is progressing (values differ)", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 4, weight: 35 }),
      makeLog({ readinessScore: 4, weight: 30 }),
      makeLog({ readinessScore: 4, weight: 30 }),
    ];
    expect(checkOverload({ currentReadiness: 4, windowedLogs, progressBy: "weight" })).toBeNull();
  });

  it("watches the reps metric when progressBy is reps", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 4, reps: 10 }),
      makeLog({ readinessScore: 3, reps: 10 }),
    ];
    expect(checkOverload({ currentReadiness: 5, windowedLogs, progressBy: "reps" })).toEqual({
      metric: "reps",
      value: 10,
    });
  });

  it("watches durationSeconds when progressBy is time", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 4, durationSeconds: 60 }),
      makeLog({ readinessScore: 4, durationSeconds: 60 }),
    ];
    expect(checkOverload({ currentReadiness: 4, windowedLogs, progressBy: "time" })).toEqual({
      metric: "time",
      value: 60,
    });
  });

  it("does not nudge when a qualifying log is missing the watched metric", () => {
    const windowedLogs = [
      makeLog({ readinessScore: 4, weight: 30 }),
      makeLog({ readinessScore: 4, weight: null }),
    ];
    expect(checkOverload({ currentReadiness: 4, windowedLogs, progressBy: "weight" })).toBeNull();
  });
});
