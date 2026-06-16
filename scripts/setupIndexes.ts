/**
 * Index setup — spec §5. Idempotent: createIndex is a no-op if the index exists.
 * Run with `npm run setup:indexes` after setting MONGODB_URI.
 *
 * Each index is annotated with the read it serves.
 */

import { MongoClient } from "mongodb";

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? "pt_tracker";
  if (!uri) throw new Error("Missing MONGODB_URI. See .env.example.");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const exercises = db.collection("exercises");
  const workouts = db.collection("workouts");
  const logs = db.collection("logs");
  const savedWorkouts = db.collection("savedWorkouts");

  await exercises.createIndex({ userId: 1, lastPerformedAt: -1 }); // recency filter / bank ordering
  await exercises.createIndex({ userId: 1, equipment: 1 }); // multikey equipment filter
  await exercises.createIndex({ userId: 1, tags: 1 }); // multikey tags filter

  // HERO index — a selected exercise's recent history; powers prefill + overload.
  await logs.createIndex({ userId: 1, exerciseId: 1, performedAt: -1 });

  await workouts.createIndex({ userId: 1, status: 1 }); // find the open cart
  await workouts.createIndex({ userId: 1, status: 1, completedAt: -1 }); // 30-day rolling count
  await workouts.createIndex({ userId: 1, "summary.prs.exerciseId": 1, completedAt: -1 }); // last PR on exercise X

  await savedWorkouts.createIndex({ userId: 1, name: 1 }, { unique: true }); // unique name per user
  await savedWorkouts.createIndex({ userId: 1, updatedAt: -1 }); // list ordering

  console.log("Indexes created (or already present):");
  for (const coll of [exercises, workouts, logs, savedWorkouts]) {
    const idx = await coll.indexes();
    console.log(`  ${coll.collectionName}:`, idx.map((i) => i.name).join(", "));
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
