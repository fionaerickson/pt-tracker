/** Full per-exercise log history for the progress chart (punch-list 2). */
import type { NextRequest } from "next/server";
import { ok, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { getExerciseHistory } from "@/lib/db/logs";

type Ctx = { params: { id: string } };

export const GET = handle(async (_req: NextRequest, { params }: Ctx) => {
  return ok(await getExerciseHistory(getUserId(), params.id));
});

export const dynamic = "force-dynamic";
