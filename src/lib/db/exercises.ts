/**
 * Exercise bank data access — spec §6.7 (search/filter) and the create/edit
 * surface for build step 2.
 */

import { ObjectId, type Filter } from "mongodb";
import { getCollections } from "@/lib/mongodb";
import { ADAPTIVE_WINDOW_MS } from "@/lib/constants";
import type { Exercise, ProgressBy, RepRange } from "@/lib/types";

export interface ExerciseInput {
  name: string;
  tags?: string[];
  equipment?: string[];
  hasWeight?: boolean;
  progressBy?: ProgressBy;
  defaultWeight?: number | null;
  defaultUnit?: string;
  usualRepRange?: RepRange;
}

export interface ExerciseFilters {
  /** Multikey match — any of these equipment values. */
  equipment?: string[];
  /** Multikey match — any of these tags. */
  tags?: string[];
  /** Case-insensitive name substring match. */
  name?: string;
  /** "recent" → lastPerformedAt within window; "stale" → older or null. */
  recency?: "recent" | "stale";
}

export async function listExercises(
  userId: string,
  filters: ExerciseFilters = {},
): Promise<Exercise[]> {
  const { exercises } = await getCollections();
  const query: Filter<Exercise> = { userId };

  if (filters.equipment?.length) query.equipment = { $in: filters.equipment };
  if (filters.tags?.length) query.tags = { $in: filters.tags };
  if (filters.name) query.name = { $regex: escapeRegex(filters.name), $options: "i" };

  if (filters.recency) {
    const cutoff = new Date(Date.now() - ADAPTIVE_WINDOW_MS);
    if (filters.recency === "recent") {
      query.lastPerformedAt = { $gte: cutoff };
    } else {
      // "not done recently" — older than the window OR never performed.
      query.$or = [{ lastPerformedAt: { $lt: cutoff } }, { lastPerformedAt: null }];
    }
  }

  return exercises.find(query).sort({ lastPerformedAt: -1 }).toArray();
}

export async function getExercise(userId: string, id: string): Promise<Exercise | null> {
  const { exercises } = await getCollections();
  return exercises.findOne({ _id: new ObjectId(id), userId });
}

export async function createExercise(userId: string, input: ExerciseInput): Promise<Exercise> {
  const { exercises } = await getCollections();
  const now = new Date();
  const doc: Omit<Exercise, "_id"> = {
    userId,
    name: input.name,
    tags: input.tags ?? [],
    equipment: input.equipment ?? [],
    hasWeight: input.hasWeight ?? true,
    progressBy: input.progressBy ?? "weight",
    defaultWeight: input.defaultWeight ?? null,
    defaultUnit: input.defaultUnit ?? "lb",
    usualRepRange: input.usualRepRange ?? { min: 8, max: 12 },
    lastPerformedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const result = await exercises.insertOne(doc as Exercise);
  return { ...(doc as Exercise), _id: result.insertedId };
}

export async function updateExercise(
  userId: string,
  id: string,
  input: Partial<ExerciseInput>,
): Promise<Exercise | null> {
  const { exercises } = await getCollections();
  const { ...fields } = input;
  return exercises.findOneAndUpdate(
    { _id: new ObjectId(id), userId },
    { $set: { ...fields, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
