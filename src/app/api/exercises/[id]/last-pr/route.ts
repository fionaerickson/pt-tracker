/** Retrospective "when did I last PR on exercise X" — spec §6.8 indexed lookup. */
import type { NextRequest } from "next/server";
import { ok, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { lastPrOnExercise } from "@/lib/db/workouts";

type Ctx = { params: { id: string } };

export const GET = handle(async (_req: NextRequest, { params }: Ctx) => {
  const userId = getUserId();
  const workout = await lastPrOnExercise(userId, params.id);
  if (!workout) return ok({ lastPr: null });
  const prs = (workout.summary?.prs ?? []).filter(
    (p) => p.exerciseId?.toString() === params.id,
  );
  return ok({ completedAt: workout.completedAt, workoutId: workout._id, prs });
});

export const dynamic = "force-dynamic";
