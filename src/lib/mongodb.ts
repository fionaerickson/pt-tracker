/**
 * MongoDB connection — spec §1 (official driver).
 *
 * The client is created lazily on first use (not at import time) so that
 * `next build` and unit tests don't require a live database or env vars. The
 * connected client is cached on `globalThis` and reused across requests/hot
 * reloads — critical on serverless (Vercel), where opening a fresh TLS
 * connection per request causes connection churn and intermittent Atlas TLS
 * errors.
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
  // Pooled client; reused via the global cache below.
  return new MongoClient(uri, { maxPoolSize: 10 }).connect();
}

function getClientPromise(): Promise<MongoClient> {
  // Cache in all environments so warm serverless invocations reuse one client.
  if (!global._mongoClientPromise) global._mongoClientPromise = connect();
  return global._mongoClientPromise;
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
