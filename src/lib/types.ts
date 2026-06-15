/**
 * Data model — spec §4. Four collections: users, exercises, workouts, logs.
 * Every non-user document carries `userId` for scoping.
 *
 * Three denormalizations are deliberate (spec §4):
 *   - exercise.lastPerformedAt  → recency filter without scanning logs
 *   - log.exerciseName          → display without a join
 *   - log.readinessScore        → single-collection readiness-filtered overload query
 */

import type { ObjectId } from "mongodb";

export type WorkoutStatus = "in_progress" | "completed";

/** Metric progressive overload watches for a given exercise. */
export type ProgressBy = "weight" | "reps" | "time";

export type PrCategory =
  | "new_max_weight"
  | "new_max_reps_or_time"
  | "rep_pr_at_weight"
  | "hard_day_consolation"
  | "variation_win";

export interface RepRange {
  min: number;
  max: number;
}

/** exercises — the reusable bank. */
export interface Exercise {
  _id: ObjectId;
  userId: string;
  name: string;
  tags: string[];
  equipment: string[];
  hasWeight: boolean;
  progressBy: ProgressBy;
  defaultWeight: number | null;
  defaultUnit: string;
  usualRepRange: RepRange;
  /** DENORMALIZED for the recency filter (spec §4). */
  lastPerformedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A single PR / novelty entry written into a completed workout's summary (spec §6.6). */
export interface Pr {
  category: PrCategory;
  /** null for hard_day_consolation (workout-level). */
  exerciseId: ObjectId | null;
  exerciseName: string | null;
  weight?: number | null;
  unit?: string | null;
  reps?: number | null;
  durationSeconds?: number | null;
  message: string;
}

export interface WorkoutSummary {
  /** Sum of `rounds` across the workout's logs. */
  setCount: number;
  /** Snapshot of the rolling completed-workout count at completion. */
  workoutsLast30Days: number;
  prs: Pr[];
}

/** workouts — the session. While in_progress it IS the cart. */
export interface Workout {
  _id: ObjectId;
  userId: string;
  status: WorkoutStatus;
  /** 1–5, set at creation from the greeting. */
  readinessScore: number;
  startedAt: Date;
  completedAt: Date | null;
  summary: WorkoutSummary | null;
  createdAt: Date;
  updatedAt: Date;
}

/** logs — one performed line item / cart row. Source of truth for history. */
export interface Log {
  _id: ObjectId;
  userId: string;
  workoutId: ObjectId;
  exerciseId: ObjectId;
  /** DENORMALIZED for display without a join. */
  exerciseName: string;
  weight: number | null;
  unit: string | null;
  reps: number | null;
  durationSeconds: number | null;
  /** The cart "quantity" — defaults to 1. */
  rounds: number;
  /** 1–5, optional, log-level. */
  perceivedDifficulty: number | null;
  /** DENORMALIZED from the parent workout; never drifts (readiness fixed at session start). */
  readinessScore: number;
  performedAt: Date;
  createdAt: Date;
}
