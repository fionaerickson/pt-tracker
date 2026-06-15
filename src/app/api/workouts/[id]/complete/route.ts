/** Complete the workout: summary + PR cascade — spec §6.5/§6.6. Build step 6. */
import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { completeWorkout } from "@/lib/db/workouts";

type Ctx = { params: { id: string } };

export const POST = handle(async (_req: NextRequest, { params }: Ctx) => {
  const w = await completeWorkout(getUserId(), params.id);
  return w ? ok(w) : fail("Workout not found", 404);
});
