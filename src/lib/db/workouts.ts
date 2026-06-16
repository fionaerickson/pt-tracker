/**
 * Workouts data access — session lifecycle (§6.1), completion + PR cascade
 * gathering (§6.5/§6.6), and stats reads (§6.8).
 */

import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/mongodb";
import {
  GREETING_THRESHOLD_MS,
  ROLLING_STATS_MS,
  ADAPTIVE_WINDOW_MS,
  SESSION_TTL_MS,
} from "@/lib/constants";
import type { Workout, Log, Pr } from "@/lib/types";
import {
  computePrs,
  type ExercisePerformance,
  type PriorStats,
  type PrDraft,
} from "@/lib/logic/prCascade";

/** The open cart, if any (§6.1 — at most one in-progress workout per user). */
export async function getCurrentCart(userId: string): Promise<Workout | null> {
  const { workouts } = await getCollections();
  return workouts.findOne({ userId, status: "in_progress" });
}

/**
 * The active session — but auto-submits a stale one first (punch-list 3).
 * An in-progress workout older than SESSION_TTL is completed automatically and
 * treated as gone, so "Resume" only shows for genuinely fresh sessions.
 */
export async function getActiveWorkout(userId: string): Promise<Workout | null> {
  const cart = await getCurrentCart(userId);
  if (!cart) return null;
  if (Date.now() - cart.startedAt.getTime() > SESSION_TTL_MS) {
    await completeWorkout(userId, cart._id.toString());
    return null;
  }
  return cart;
}

export type SessionResolution =
  | { action: "resume"; workout: Workout }
  | { action: "stale"; workout: Workout } // older than the greeting threshold
  | { action: "greet" }; // no open cart — collect readiness and create one

/** Decide what app-open should do (§6.1 steps 1–4). */
export async function resolveSession(userId: string): Promise<SessionResolution> {
  const cart = await getCurrentCart(userId);
  if (!cart) return { action: "greet" };
  const fresh = Date.now() - cart.startedAt.getTime() <= GREETING_THRESHOLD_MS;
  return fresh ? { action: "resume", workout: cart } : { action: "stale", workout: cart };
}

/** Creating this workout is what starts the cart (§6.1 step 4). */
export async function createWorkout(
  userId: string,
  readinessScore: number,
  plannedExerciseIds: string[] = [],
): Promise<Workout> {
  const { workouts } = await getCollections();
  const now = new Date();
  const doc: Omit<Workout, "_id"> = {
    userId,
    status: "in_progress",
    readinessScore,
    startedAt: now,
    completedAt: null,
    plannedExerciseIds: plannedExerciseIds.map((id) => new ObjectId(id)),
    summary: null,
    createdAt: now,
    updatedAt: now,
  };
  const result = await workouts.insertOne(doc as Workout);
  return { ...(doc as Workout), _id: result.insertedId };
}

/** Add exercises to the active session's planned list (idempotent via $addToSet). */
export async function addPlannedExercises(
  userId: string,
  workoutId: string,
  exerciseIds: string[],
): Promise<Workout | null> {
  const { workouts } = await getCollections();
  return workouts.findOneAndUpdate(
    { _id: new ObjectId(workoutId), userId },
    {
      $addToSet: { plannedExerciseIds: { $each: exerciseIds.map((id) => new ObjectId(id)) } },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" },
  );
}

export async function getWorkout(userId: string, id: string): Promise<Workout | null> {
  const { workouts } = await getCollections();
  return workouts.findOne({ _id: new ObjectId(id), userId });
}

/** Rolling count of completed workouts within the stats window (§6.8). */
export async function rollingWorkoutCount(userId: string): Promise<number> {
  const { workouts } = await getCollections();
  const cutoff = new Date(Date.now() - ROLLING_STATS_MS);
  return workouts.countDocuments({
    userId,
    status: "completed",
    completedAt: { $gte: cutoff },
  });
}

/** Last workout that PR'd on a given exercise (§6.8, indexed lookup). */
export async function lastPrOnExercise(userId: string, exerciseId: string): Promise<Workout | null> {
  const { workouts } = await getCollections();
  return workouts.findOne(
    { userId, "summary.prs.exerciseId": new ObjectId(exerciseId) },
    { sort: { completedAt: -1 } },
  );
}

/**
 * Gather prior-history stats for one exercise (everything before `workoutId`)
 * so the PR cascade stays pure. Reads the full log history for the exercise.
 */
async function gatherPriorStats(
  userId: string,
  exerciseId: ObjectId,
  excludeWorkoutId: ObjectId,
  hasWeight: boolean,
): Promise<PriorStats> {
  const { logs } = await getCollections();
  const prior = await logs
    .find({ userId, exerciseId, workoutId: { $ne: excludeWorkoutId } })
    .toArray();

  const windowCutoff = new Date(Date.now() - ADAPTIVE_WINDOW_MS);

  let allTimeMaxWeight: number | null = null;
  let allTimeMaxReps: number | null = null;
  let allTimeMaxTime: number | null = null;
  const bestRepsByWeight = new Map<number, number>();
  let performedInPriorWindow = false;

  for (const log of prior) {
    if (log.performedAt >= windowCutoff) performedInPriorWindow = true;
    if (log.weight != null) allTimeMaxWeight = Math.max(allTimeMaxWeight ?? -Infinity, log.weight);
    if (log.reps != null) allTimeMaxReps = Math.max(allTimeMaxReps ?? -Infinity, log.reps);
    if (log.durationSeconds != null)
      allTimeMaxTime = Math.max(allTimeMaxTime ?? -Infinity, log.durationSeconds);
    if (hasWeight && log.weight != null && log.reps != null) {
      const best = bestRepsByWeight.get(log.weight);
      if (best == null || log.reps > best) bestRepsByWeight.set(log.weight, log.reps);
    }
  }

  return { allTimeMaxWeight, allTimeMaxReps, allTimeMaxTime, bestRepsByWeight, performedInPriorWindow };
}

/**
 * Complete the workout (§6.5): stamp finish, compute setCount + rolling count,
 * run the PR cascade (§6.6), persist the summary, and update lastPerformedAt on
 * every exercise performed. Returns the completed workout.
 */
export async function completeWorkout(userId: string, workoutId: string): Promise<Workout | null> {
  const { workouts, logs, exercises } = await getCollections();
  const workout = await workouts.findOne({ _id: new ObjectId(workoutId), userId });
  if (!workout || workout.status === "completed") return workout ?? null;

  const now = new Date();
  const cartLogs = await logs.find({ userId, workoutId: workout._id }).toArray();

  // setCount = sum of rounds across the workout's logs (§6.5 step 2).
  const setCount = cartLogs.reduce((sum, l) => sum + (l.rounds ?? 0), 0);

  // Group session logs by exercise and gather prior stats for the PR cascade.
  const byExercise = new Map<string, Log[]>();
  for (const log of cartLogs) {
    const key = log.exerciseId.toString();
    (byExercise.get(key) ?? byExercise.set(key, []).get(key)!).push(log);
  }

  const performances: ExercisePerformance<ObjectId>[] = [];
  for (const [exerciseIdStr, sessionLogs] of byExercise) {
    const exerciseId = new ObjectId(exerciseIdStr);
    const exercise = await exercises.findOne({ _id: exerciseId, userId });
    const hasWeight = exercise?.hasWeight ?? sessionLogs.some((l) => l.weight != null);
    const prior = await gatherPriorStats(userId, exerciseId, workout._id, hasWeight);
    performances.push({
      exerciseId,
      exerciseName: exercise?.name ?? sessionLogs[0]?.exerciseName ?? "Exercise",
      hasWeight,
      unit: exercise?.defaultUnit ?? sessionLogs[0]?.unit ?? null,
      sessionLogs,
      prior,
    });
  }

  const drafts: PrDraft<ObjectId>[] = computePrs<ObjectId>({
    readinessScore: workout.readinessScore,
    performances,
  });
  const prs: Pr[] = drafts.map((d) => ({
    category: d.category,
    exerciseId: d.exerciseId,
    exerciseName: d.exerciseName,
    weight: d.weight ?? null,
    unit: d.unit ?? null,
    reps: d.reps ?? null,
    durationSeconds: d.durationSeconds ?? null,
    message: d.message,
  }));

  // Rolling count is a snapshot taken at completion (§6.5 step 3). Count the
  // already-completed workouts and add 1 for this one.
  const completedBefore = await workouts.countDocuments({
    userId,
    status: "completed",
    completedAt: { $gte: new Date(now.getTime() - ROLLING_STATS_MS) },
  });
  const workoutsLast30Days = completedBefore + 1;

  await workouts.updateOne(
    { _id: workout._id, userId },
    {
      $set: {
        status: "completed",
        completedAt: now,
        updatedAt: now,
        summary: { setCount, workoutsLast30Days, prs },
      },
    },
  );

  // Update lastPerformedAt on every exercise performed (§6.5 step 5).
  const exerciseIds = [...byExercise.keys()].map((id) => new ObjectId(id));
  if (exerciseIds.length) {
    await exercises.updateMany(
      { _id: { $in: exerciseIds }, userId },
      { $set: { lastPerformedAt: now, updatedAt: now } },
    );
  }

  return workouts.findOne({ _id: workout._id, userId });
}
