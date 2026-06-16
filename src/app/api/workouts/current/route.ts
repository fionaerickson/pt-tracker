/** The open cart, if any — spec §6.1. */
import { ok, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { getActiveWorkout } from "@/lib/db/workouts";

export const GET = handle(async () => {
  return ok(await getActiveWorkout(getUserId()));
});

export const dynamic = "force-dynamic";
