/** App-open session resolution — spec §6.1. Build step 3. */
import { ok, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { resolveSession } from "@/lib/db/workouts";

export const GET = handle(async () => {
  return ok(await resolveSession(getUserId()));
});

export const dynamic = "force-dynamic";
