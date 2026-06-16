/**
 * Seed sample data — a small exercise bank plus recent history so the adaptive
 * prefill, overload nudge, and PR cascade all have something to react to.
 * Idempotent per user (clears this user's seeded docs first).
 *
 * Relative imports so this runs under Next, vitest, tsx, and the /api/init route.
 */

import { ObjectId } from "mongodb";
import { getCollections } from "./mongodb";
import type { Exercise, Workout, Log, SavedWorkout } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export async function seed(userId = process.env.DEFAULT_USER_ID ?? "local-user") {
  const { exercises, workouts, logs, db } = await getCollections();
  const savedWorkouts = db.collection<SavedWorkout>("savedWorkouts");

  await Promise.all([
    exercises.deleteMany({ userId }),
    workouts.deleteMany({ userId }),
    logs.deleteMany({ userId }),
    savedWorkouts.deleteMany({ userId }),
  ]);

  const now = Date.now();
  const mk = (over: Partial<Exercise>): Exercise =>
    ({
      _id: new ObjectId(),
      userId,
      name: "",
      muscleGroup: null,
      purpose: "Strength",
      equipment: [],
      hasWeight: true,
      progressBy: "weight",
      defaultWeight: null,
      defaultUnit: "lbs",
      usualRepRange: { min: 8, max: 12 },
      weightStep: 5,
      tags: [],
      lastPerformedAt: null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      ...over,
    }) as Exercise;

  const bss = mk({
    name: "Bulgarian Split Squat",
    muscleGroup: "legs",
    purpose: "Strength",
    equipment: ["free weights"],
    progressBy: "weight",
    defaultWeight: 25,
    usualRepRange: { min: 8, max: 12 },
  });
  const rdl = mk({
    name: "Romanian Deadlift",
    muscleGroup: "legs",
    purpose: "Strength",
    equipment: ["free weights"],
    progressBy: "weight",
    defaultWeight: 95,
    usualRepRange: { min: 6, max: 10 },
  });
  const plank = mk({
    name: "Plank",
    muscleGroup: "core",
    purpose: "PT",
    equipment: ["none"],
    hasWeight: false,
    progressBy: "time",
    defaultWeight: null,
    usualRepRange: { min: 1, max: 1 },
  });
  const band = mk({
    name: "Band Pull-Apart",
    muscleGroup: "arms",
    purpose: "PT",
    equipment: ["band"],
    hasWeight: false,
    progressBy: "reps",
    defaultWeight: null,
    usualRepRange: { min: 15, max: 20 },
  });
  const goblet = mk({
    name: "Goblet Squat",
    muscleGroup: "legs",
    purpose: "Strength",
    equipment: ["free weights"],
    progressBy: "weight",
    defaultWeight: 35,
    usualRepRange: { min: 8, max: 12 },
  });

  const allExercises = [bss, rdl, plank, band, goblet];

  const sessions = [
    { daysAgo: 9, readiness: 4 },
    { daysAgo: 5, readiness: 3 },
    { daysAgo: 2, readiness: 4 },
  ];

  const workoutDocs: Workout[] = [];
  const logDocs: Log[] = [];

  for (const s of sessions) {
    const at = new Date(now - s.daysAgo * DAY);
    const workoutId = new ObjectId();
    workoutDocs.push({
      _id: workoutId,
      userId,
      status: "completed",
      readinessScore: s.readiness,
      startedAt: at,
      completedAt: at,
      plannedExerciseIds: [bss._id, plank._id, band._id],
      summary: { setCount: 6, workoutsLast30Days: 0, prs: [] },
      createdAt: at,
      updatedAt: at,
    });

    const rows: Array<Partial<Log> & { exercise: Exercise }> = [
      { exercise: bss, weight: 30, reps: 10, rounds: 3 },
      { exercise: plank, durationSeconds: 45, rounds: 2 },
      { exercise: band, reps: 18, rounds: 2 },
    ];
    for (const r of rows) {
      logDocs.push({
        _id: new ObjectId(),
        userId,
        workoutId,
        exerciseId: r.exercise._id,
        exerciseName: r.exercise.name,
        weight: r.weight ?? null,
        unit: r.exercise.hasWeight ? "lbs" : null,
        reps: r.reps ?? null,
        durationSeconds: r.durationSeconds ?? null,
        rounds: r.rounds ?? 1,
        isWarmup: false,
        perceivedDifficulty: null,
        readinessScore: s.readiness,
        performedAt: at,
        createdAt: at,
      });
    }
  }

  for (const ex of [bss, plank, band]) ex.lastPerformedAt = new Date(now - 2 * DAY);

  await exercises.insertMany(allExercises);
  await workouts.insertMany(workoutDocs);
  await logs.insertMany(logDocs);
  await savedWorkouts.insertOne({
    _id: new ObjectId(),
    userId,
    name: "Leg Day",
    exerciseIds: [bss._id, rdl._id, goblet._id],
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });

  return {
    userId,
    exercises: allExercises.length,
    workouts: workoutDocs.length,
    logs: logDocs.length,
    savedWorkouts: 1,
  };
}
