/**
 * Index creation (spec §5) as an importable function so it can run from the
 * setup script, the in-memory dev launcher, and the /api/init endpoint.
 * createIndex is idempotent — safe to call repeatedly.
 */
import { getCollections } from "../mongodb";

export async function ensureIndexes(): Promise<void> {
  const { exercises, workouts, logs, db } = await getCollections();
  const savedWorkouts = db.collection("savedWorkouts");

  await exercises.createIndex({ userId: 1, lastPerformedAt: -1 });
  await exercises.createIndex({ userId: 1, equipment: 1 });
  await exercises.createIndex({ userId: 1, tags: 1 });

  await logs.createIndex({ userId: 1, exerciseId: 1, performedAt: -1 }); // hero index

  await workouts.createIndex({ userId: 1, status: 1 });
  await workouts.createIndex({ userId: 1, status: 1, completedAt: -1 });
  await workouts.createIndex({ userId: 1, "summary.prs.exerciseId": 1, completedAt: -1 });

  await savedWorkouts.createIndex({ userId: 1, name: 1 }, { unique: true });
  await savedWorkouts.createIndex({ userId: 1, updatedAt: -1 });
}
