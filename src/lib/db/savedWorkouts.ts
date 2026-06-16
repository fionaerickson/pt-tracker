/**
 * Saved workouts — named, reusable exercise sets used on the Plan Workout page
 * (punch-list 3).
 */

import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/mongodb";
import type { SavedWorkout } from "@/lib/types";

export async function listSavedWorkouts(userId: string): Promise<SavedWorkout[]> {
  const { db } = await getCollections();
  return db
    .collection<SavedWorkout>("savedWorkouts")
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();
}

export async function createSavedWorkout(
  userId: string,
  name: string,
  exerciseIds: string[],
): Promise<SavedWorkout> {
  const { db } = await getCollections();
  const now = new Date();
  const doc: Omit<SavedWorkout, "_id"> = {
    userId,
    name: name.trim(),
    exerciseIds: exerciseIds.map((id) => new ObjectId(id)),
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection<SavedWorkout>("savedWorkouts").insertOne(doc as SavedWorkout);
  return { ...(doc as SavedWorkout), _id: result.insertedId };
}

export async function deleteSavedWorkout(userId: string, id: string): Promise<boolean> {
  const { db } = await getCollections();
  const result = await db
    .collection<SavedWorkout>("savedWorkouts")
    .deleteOne({ _id: new ObjectId(id), userId });
  return result.deletedCount === 1;
}
