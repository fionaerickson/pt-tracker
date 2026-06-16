/** Cart contents + add a row — spec §6.4. Build step 4. */
import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { getCartLogs, addLog } from "@/lib/db/logs";
import { getWorkout } from "@/lib/db/workouts";

type Ctx = { params: { id: string } };

export const GET = handle(async (_req: NextRequest, { params }: Ctx) => {
  return ok(await getCartLogs(getUserId(), params.id));
});

export const POST = handle(async (req: NextRequest, { params }: Ctx) => {
  const userId = getUserId();
  const workout = await getWorkout(userId, params.id);
  if (!workout) return fail("Workout not found", 404);
  if (workout.status !== "in_progress") return fail("Workout is not in progress", 409);
  const body = await req.json();
  if (!body.exerciseId || !body.exerciseName) {
    return fail("exerciseId and exerciseName are required", 400);
  }
  // readinessScore is denormalized from the parent workout (§4).
  const log = await addLog(userId, params.id, workout.readinessScore, body);
  return ok(log, 201);
});

export const dynamic = "force-dynamic";
