/**
 * Exercise bank data access — spec §6.7 (search/filter) and the create/edit
 * surface, with the structured bank fields (punch-list 5).
 */

import { ObjectId, type Filter } from "mongodb";
import { getCollections } from "@/lib/mongodb";
import { ADAPTIVE_WINDOW_MS, DEFAULT_WEIGHT_STEP } from "@/lib/constants";
import type {
  Exercise,
  ProgressBy,
  RepRange,
  MuscleGroup,
  Purpose,
  Equipment,
} from "@/lib/types";

export interface ExerciseInput {
  name: string;
  muscleGroup?: MuscleGroup | null;
  purpose?: Purpose;
  equipment?: Equipment[];
  /** Progress goal. */
  progressBy?: ProgressBy;
  /** Starting weight (lbs by default). */
  defaultWeight?: number | null;
  defaultUnit?: string;
  /** Starting reps. */
  usualRepRange?: RepRange;
  /** Weight increment for logging suggestions (lbs). */
  weightStep?: number;
  tags?: string[];
  hasWeight?: boolean;
}

export interface ExerciseFilters {
  equipment?: string[];
  tags?: string[];
  muscleGroup?: string;
  purpose?: string;
  name?: string;
  recency?: "recent" | "stale";
}

/** Weight fields show when the goal is weight or a starting weight is set. */
function deriveHasWeight(input: Partial<ExerciseInput>): boolean {
  if (typeof input.hasWeight === "boolean") return input.hasWeight;
  return input.progressBy === "weight" || input.defaultWeight != null;
}

export async function listExercises(
  userId: string,
  filters: ExerciseFilters = {},
): Promise<Exercise[]> {
  const { exercises } = await getCollections();
  const query: Filter<Exercise> = { userId };

  if (filters.equipment?.length) query.equipment = { $in: filters.equipment as Equipment[] };
  if (filters.tags?.length) query.tags = { $in: filters.tags };
  if (filters.muscleGroup) query.muscleGroup = filters.muscleGroup as MuscleGroup;
  if (filters.purpose) query.purpose = filters.purpose as Purpose;
  if (filters.name) query.name = { $regex: escapeRegex(filters.name), $options: "i" };

  if (filters.recency) {
    const cutoff = new Date(Date.now() - ADAPTIVE_WINDOW_MS);
    if (filters.recency === "recent") {
      query.lastPerformedAt = { $gte: cutoff };
    } else {
      query.$or = [{ lastPerformedAt: { $lt: cutoff } }, { lastPerformedAt: null }];
    }
  }

  return exercises.find(query).sort({ name: 1 }).toArray();
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
    muscleGroup: input.muscleGroup ?? null,
    purpose: input.purpose ?? "Strength",
    equipment: input.equipment ?? [],
    hasWeight: deriveHasWeight(input),
    progressBy: input.progressBy ?? "weight",
    defaultWeight: input.defaultWeight ?? null,
    defaultUnit: input.defaultUnit ?? "lbs",
    usualRepRange: input.usualRepRange ?? { min: 8, max: 12 },
    weightStep: input.weightStep ?? DEFAULT_WEIGHT_STEP,
    tags: input.tags ?? [],
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
  const fields: Record<string, unknown> = { ...input, updatedAt: new Date() };
  // Keep hasWeight consistent when the goal or starting weight changes.
  if ("progressBy" in input || "defaultWeight" in input || "hasWeight" in input) {
    const current = await exercises.findOne({ _id: new ObjectId(id), userId });
    if (current) fields.hasWeight = deriveHasWeight({ ...current, ...input });
  }
  return exercises.findOneAndUpdate(
    { _id: new ObjectId(id), userId },
    { $set: fields },
    { returnDocument: "after" },
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
