/** Delete a saved workout (punch-list 3). */
import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { deleteSavedWorkout } from "@/lib/db/savedWorkouts";

type Ctx = { params: { id: string } };

export const DELETE = handle(async (_req: NextRequest, { params }: Ctx) => {
  const removed = await deleteSavedWorkout(getUserId(), params.id);
  return removed ? ok({ deleted: true }) : fail("Saved workout not found", 404);
});

export const dynamic = "force-dynamic";
