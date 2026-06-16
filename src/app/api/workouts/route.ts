/** Create a workout from the readiness survey (starts the session) — spec §6.1 + punch-list 3. */
import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { READINESS_MIN, READINESS_MAX } from "@/lib/constants";
import { createWorkout, getCurrentCart } from "@/lib/db/workouts";

export const POST = handle(async (req: NextRequest) => {
  const userId = getUserId();
  const { readinessScore, plannedExerciseIds } = await req.json();
  if (
    typeof readinessScore !== "number" ||
    readinessScore < READINESS_MIN ||
    readinessScore > READINESS_MAX
  ) {
    return fail(`readinessScore must be ${READINESS_MIN}–${READINESS_MAX}`, 400);
  }
  // At most one in-progress workout per user (§2). Don't start a second session.
  const existing = await getCurrentCart(userId);
  if (existing) return fail("A workout is already in progress", 409);
  const planned = Array.isArray(plannedExerciseIds) ? plannedExerciseIds : [];
  return ok(await createWorkout(userId, readinessScore, planned), 201);
});

export const dynamic = "force-dynamic";
