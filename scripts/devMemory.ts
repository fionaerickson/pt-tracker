/**
 * Zero-setup dev DB: boots an in-memory MongoDB, creates indexes, seeds sample
 * data, then launches Next against it. No Atlas account or Docker needed.
 *
 *   npm run dev:memory          # next dev
 *   npm run dev:memory -- start # next start (requires a prior `next build`)
 */

import { spawn } from "node:child_process";
import { MongoMemoryServer } from "mongodb-memory-server";

async function main() {
  const mode = process.argv[2] === "start" ? "start" : "dev";
  const mongod = await MongoMemoryServer.create({
    binary: { version: process.env.MONGOMS_VERSION ?? "8.0.4" },
  });
  const uri = mongod.getUri();

  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB = "pt_tracker";
  process.env.DEFAULT_USER_ID = process.env.DEFAULT_USER_ID ?? "local-user";

  // Imported after env is set so the lazy client picks up the in-memory URI.
  const { ensureIndexes } = await import("../src/lib/db/init");
  const { seed } = await import("../src/lib/seed");
  await ensureIndexes();
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
