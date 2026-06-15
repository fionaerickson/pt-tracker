/** Exercise bank — list (with §6.7 filters) and create. Build step 2. */
import type { NextRequest } from "next/server";
import { ok, handle } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { listExercises, createExercise, type ExerciseFilters } from "@/lib/db/exercises";

export const GET = handle(async (req: NextRequest) => {
  const userId = getUserId();
  const sp = req.nextUrl.searchParams;
  const filters: ExerciseFilters = {};
  if (sp.get("equipment")) filters.equipment = sp.get("equipment")!.split(",");
  if (sp.get("tags")) filters.tags = sp.get("tags")!.split(",");
  if (sp.get("name")) filters.name = sp.get("name")!;
  const recency = sp.get("recency");
  if (recency === "recent" || recency === "stale") filters.recency = recency;
  return ok(await listExercises(userId, filters));
});

export const POST = handle(async (req: NextRequest) => {
  const userId = getUserId();
  const body = await req.json();
  return ok(await createExercise(userId, body), 201);
});

export const dynamic = "force-dynamic";
