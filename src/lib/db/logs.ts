/**
 * Logs data access — the source of truth for history (spec §4) and the cart
 * rows (§6.4). Also the windowed read powering prefill + overload (§6.2/§6.3).
 */

import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/mongodb";
import { ADAPTIVE_WINDOW_MS } from "@/lib/constants";
import type { Log } from "@/lib/types";

/**
 * The single hottest read (§5 hero index): one exercise's logs within the
 * adaptive window, newest first. Feeds both prefill and the overload check.
 */
export async function getWindowedLogs(userId: string, exerciseId: string): Promise<Log[]> {
  const { logs } = await getCollections();
  const cutoff = new Date(Date.now() - ADAPTIVE_WINDOW_MS);
  return logs
    .find({ userId, exerciseId: new ObjectId(exerciseId), performedAt: { $gte: cutoff } })
    .sort({ performedAt: -1 })
    .toArray();
}

/** Full history for one exercise, oldest-first — powers the progress chart (punch-list 2). */
export async function getExerciseHistory(userId: string, exerciseId: string): Promise<Log[]> {
  const { logs } = await getCollections();
  return logs
    .find({ userId, exerciseId: new ObjectId(exerciseId) })
    .sort({ performedAt: 1 })
    .toArray();
}

/** All logs for a workout — the cart contents (§6.4). */
export async function getCartLogs(userId: string, workoutId: string): Promise<Log[]> {
  const { logs } = await getCollections();
  return logs
    .find({ userId, workoutId: new ObjectId(workoutId) })
    .sort({ performedAt: 1 })
    .toArray();
}

export interface AddLogInput {
  exerciseId: string;
  exerciseName: string;
  weight?: number | null;
  unit?: string | null;
  reps?: number | null;
  durationSeconds?: number | null;
  perceivedDifficulty?: number | null;
}

/** Add a cart row (§6.4): rounds default 1, readinessScore denormalized from the workout. */
export async function addLog(
  userId: string,
  workoutId: string,
  readinessScore: number,
  input: AddLogInput,
): Promise<Log> {
  const { logs } = await getCollections();
  const now = new Date();
  const doc: Omit<Log, "_id"> = {
    userId,
    workoutId: new ObjectId(workoutId),
    exerciseId: new ObjectId(input.exerciseId),
    exerciseName: input.exerciseName,
    weight: input.weight ?? null,
    unit: input.unit ?? null,
    reps: input.reps ?? null,
    durationSeconds: input.durationSeconds ?? null,
    rounds: 1,
    perceivedDifficulty: input.perceivedDifficulty ?? null,
    readinessScore,
    performedAt: now,
    createdAt: now,
  };
  const result = await logs.insertOne(doc as Log);
  return { ...(doc as Log), _id: result.insertedId };
}

export interface UpdateLogInput {
  weight?: number | null;
  unit?: string | null;
  reps?: number | null;
  durationSeconds?: number | null;
  /** Cart "quantity" (§6.4). */
  rounds?: number;
  perceivedDifficulty?: number | null;
}

export async function updateLog(
  userId: string,
  id: string,
  input: UpdateLogInput,
): Promise<Log | null> {
  const { logs } = await getCollections();
  return logs.findOneAndUpdate(
    { _id: new ObjectId(id), userId },
    { $set: { ...input } },
    { returnDocument: "after" },
  );
}

export async function deleteLog(userId: string, id: string): Promise<boolean> {
  const { logs } = await getCollections();
  const result = await logs.deleteOne({ _id: new ObjectId(id), userId });
  return result.deletedCount === 1;
}
