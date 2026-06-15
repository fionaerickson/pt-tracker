/** The open cart, if any — spec §6.1. */
import { ok, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { getCurrentCart } from "@/lib/db/workouts";

export const GET = handle(async () => {
  return ok(await getCurrentCart(getUserId()));
});

export const dynamic = "force-dynamic";
