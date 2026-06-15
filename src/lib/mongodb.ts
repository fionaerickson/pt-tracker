/**
 * MongoDB connection — spec §1 (official driver).
 *
 * The client is created lazily on first use (not at import time) so that
 * `next build` and unit tests don't require a live database or env vars. In
 * development we cache the connection promise on `globalThis` to reuse a single
 * pool across hot reloads.
 */

import { MongoClient, type Db, type Collection } from "mongodb";
import type { Exercise, Workout, Log } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function connect(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable. See .env.example.");
  }
  return new MongoClient(uri).connect();
}

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) global._mongoClientPromise = connect();
    return global._mongoClientPromise;
  }
  return connect();
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const dbName = process.env.MONGODB_DB ?? "pt_tracker";
  return client.db(dbName);
}

export async function getCollections(): Promise<{
  exercises: Collection<Exercise>;
  workouts: Collection<Workout>;
  logs: Collection<Log>;
  db: Db;
}> {
  const db = await getDb();
  return {
    exercises: db.collection<Exercise>("exercises"),
    workouts: db.collection<Workout>("workouts"),
    logs: db.collection<Log>("logs"),
    db,
  };
}
