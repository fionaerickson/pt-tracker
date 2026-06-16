/**
 * One-visit setup for a fresh deployment (no terminal needed):
 *   GET /api/init           → create indexes (idempotent)
 *   GET /api/init?seed=1    → also load sample data (clears this user's data first)
 *
 * Safe to re-run. Seeding is opt-in via the query flag so it can't wipe data by
 * accident.
 */
import type { NextRequest } from "next/server";
import { ok, handle } from "@/lib/api";
import { ensureIndexes } from "@/lib/db/init";
import { seed } from "@/lib/seed";

export const GET = handle(async (req: NextRequest) => {
  await ensureIndexes();
  const wantSeed = req.nextUrl.searchParams.get("seed") === "1";
  const seeded = wantSeed ? await seed() : null;
  return ok({ indexes: "ready", seeded });
});

export const dynamic = "force-dynamic";
