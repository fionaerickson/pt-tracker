/** Edit (incl. change quantity / rounds) or remove a cart row — spec §6.4. */
import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { updateLog, deleteLog } from "@/lib/db/logs";

type Ctx = { params: { id: string } };

export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  const body = await req.json();
  const log = await updateLog(getUserId(), params.id, body);
  return log ? ok(log) : fail("Log not found", 404);
});

export const DELETE = handle(async (_req: NextRequest, { params }: Ctx) => {
  const removed = await deleteLog(getUserId(), params.id);
  return removed ? ok({ deleted: true }) : fail("Log not found", 404);
});
