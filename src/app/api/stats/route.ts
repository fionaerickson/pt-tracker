/** Stats reads — rolling completed-workout count. Spec §6.8. Build step 7. */
import { ok, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { rollingWorkoutCount } from "@/lib/db/workouts";
import { ROLLING_STATS_DAYS } from "@/lib/constants";

export const GET = handle(async () => {
  const userId = getUserId();
  return ok({
    windowDays: ROLLING_STATS_DAYS,
    workoutsLast30Days: await rollingWorkoutCount(userId),
  });
});

export const dynamic = "force-dynamic";
