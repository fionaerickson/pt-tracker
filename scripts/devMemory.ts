/**
 * Zero-setup dev DB: boots an in-memory MongoDB, creates indexes, seeds sample
 * data, then launches Next against it. No Atlas account or Docker needed.
 *
 *   npm run dev:memory          # next dev
 *   npm run dev:memory -- start # next start (requires a prior `next build`)
 *
 * Data is ephemeral — it lives only as long as this process.
 */

import { spawn } from "node:child_process";
import { MongoMemoryServer } from "mongodb-memory-server";

async function main() {
  const mode = process.argv[2] === "start" ? "start" : "dev";
  // Pin a version with a published Ubuntu 24.04 build (auto-detect picks a
  // too-new release that 404s). Override via MONGOMS_VERSION if needed.
  const mongod = await MongoMemoryServer.create({
    binary: { version: process.env.MONGOMS_VERSION ?? "8.0.4" },
  });
  const uri = mongod.getUri();

  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB = "pt_tracker";
  process.env.DEFAULT_USER_ID = process.env.DEFAULT_USER_ID ?? "local-user";

  // Indexes (§5) + sample data — imported after env is set so the lazy client
  // picks up the in-memory URI.
  const { getCollections } = await import("../src/lib/mongodb");
  const { seed } = await import("./seed");
  const { exercises, workouts, logs, db } = await getCollections();
  await exercises.createIndex({ userId: 1, lastPerformedAt: -1 });
  await exercises.createIndex({ userId: 1, equipment: 1 });
  await exercises.createIndex({ userId: 1, tags: 1 });
  await logs.createIndex({ userId: 1, exerciseId: 1, performedAt: -1 });
  await workouts.createIndex({ userId: 1, status: 1 });
  await workouts.createIndex({ userId: 1, status: 1, completedAt: -1 });
  await workouts.createIndex({ userId: 1, "summary.prs.exerciseId": 1, completedAt: -1 });
  const savedWorkouts = db.collection("savedWorkouts");
  await savedWorkouts.createIndex({ userId: 1, name: 1 }, { unique: true });
  await savedWorkouts.createIndex({ userId: 1, updatedAt: -1 });
  const result = await seed();

  console.log(`\n  In-memory MongoDB at ${uri}`);
  console.log(`  Seeded ${result.exercises} exercises, ${result.workouts} workouts, ${result.logs} logs`);
  console.log(`  Launching: next ${mode}\n`);

  const child = spawn("npx", ["next", mode], { stdio: "inherit", env: process.env });

  const shutdown = async () => {
    child.kill("SIGINT");
    await mongod.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  child.on("exit", async (code) => {
    await mongod.stop();
    process.exit(code ?? 0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
