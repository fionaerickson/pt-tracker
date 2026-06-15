/** Read a single workout (including its summary once completed). */
import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { getWorkout } from "@/lib/db/workouts";

type Ctx = { params: { id: string } };

export const GET = handle(async (_req: NextRequest, { params }: Ctx) => {
  const w = await getWorkout(getUserId(), params.id);
  return w ? ok(w) : fail("Workout not found", 404);
});

export const dynamic = "force-dynamic";
