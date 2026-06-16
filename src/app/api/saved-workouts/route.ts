/** Saved workouts — list and create (punch-list 3). */
import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { listSavedWorkouts, createSavedWorkout } from "@/lib/db/savedWorkouts";

export const GET = handle(async () => {
  return ok(await listSavedWorkouts(getUserId()));
});

export const POST = handle(async (req: NextRequest) => {
  const userId = getUserId();
  const { name, exerciseIds } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return fail("A unique workout name is required", 400);
  }
  if (!Array.isArray(exerciseIds) || exerciseIds.length === 0) {
    return fail("Add at least one exercise before saving", 400);
  }
  try {
    return ok(await createSavedWorkout(userId, name, exerciseIds), 201);
  } catch (e) {
    // Unique index on { userId, name }.
    if ((e as { code?: number }).code === 11000) {
      return fail("You already have a workout with that name", 409);
    }
    throw e;
  }
});

export const dynamic = "force-dynamic";
