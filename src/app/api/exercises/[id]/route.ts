/** Single exercise — read and edit. Build step 2. */
import type { NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { getExercise, updateExercise } from "@/lib/db/exercises";

type Ctx = { params: { id: string } };

export const GET = handle(async (_req: NextRequest, { params }: Ctx) => {
  const ex = await getExercise(getUserId(), params.id);
  return ex ? ok(ex) : fail("Exercise not found", 404);
});

export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  const body = await req.json();
  const ex = await updateExercise(getUserId(), params.id, body);
  return ex ? ok(ex) : fail("Exercise not found", 404);
});

export const dynamic = "force-dynamic";
