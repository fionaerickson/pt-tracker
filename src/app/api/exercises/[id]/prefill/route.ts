/**
 * Adaptive prefill for the logging screen — spec §6.2 (which runs the overload
 * check §6.3). Build steps 4 + 5. Returns the branch, prefilled fields, and any
 * overload nudge for the current session.
 */
import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { getExercise } from "@/lib/db/exercises";
import { getWindowedLogs } from "@/lib/db/logs";
import { getActiveWorkout } from "@/lib/db/workouts";
import { computePrefill } from "@/lib/logic/prefill";

type Ctx = { params: { id: string } };

export const GET = handle(async (_req: NextRequest, { params }: Ctx) => {
  const userId = getUserId();
  const exercise = await getExercise(userId, params.id);
  if (!exercise) return fail("Exercise not found", 404);

  // Readiness comes from the active session; without one, fall back to a neutral
  // value so prefill still produces recent/cold-start branches.
  const cart = await getActiveWorkout(userId);
  const currentReadiness = cart?.readinessScore ?? 3;

  const windowedLogs = await getWindowedLogs(userId, params.id);
  const result = computePrefill({ currentReadiness, windowedLogs, exercise });
  return ok(result);
});

export const dynamic = "force-dynamic";
