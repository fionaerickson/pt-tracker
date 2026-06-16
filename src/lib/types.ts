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

/** Metric progressive overload watches for a given exercise ("na" → never nudge). */
export type ProgressBy = "weight" | "reps" | "time" | "na";

/** Coarse muscle group for the bank. */
export type MuscleGroup = "arms" | "core" | "legs";

/** Why the exercise is in the bank. PT exercises never receive overload nudges. */
export type Purpose = "PT" | "Strength";

/** Fixed equipment options (multiselect in the bank). */
export type Equipment =
  | "free weights"
  | "machine"
  | "band"
  | "yoga block"
  | "cable tower"
  | "none"
  | "other";

export const EQUIPMENT_OPTIONS: Equipment[] = [
  "free weights",
  "machine",
  "band",
  "yoga block",
  "cable tower",
  "none",
  "other",
];
export const MUSCLE_GROUP_OPTIONS: MuscleGroup[] = ["arms", "core", "legs"];
export const PROGRESS_GOAL_OPTIONS: ProgressBy[] = ["weight", "reps", "time", "na"];
export const PURPOSE_OPTIONS: Purpose[] = ["PT", "Strength"];

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
  /** Coarse muscle group: arms | core | legs. */
  muscleGroup: MuscleGroup | null;
  /** PT | Strength. PT exercises never receive overload nudges (§ punch-list 6). */
  purpose: Purpose;
  equipment: Equipment[];
  hasWeight: boolean;
  /** The "progress goal": metric overload watches, or "na". */
  progressBy: ProgressBy;
  /** Starting weight (lbs by default). */
  defaultWeight: number | null;
  defaultUnit: string;
  /** Starting reps (min/max). */
  usualRepRange: RepRange;
  /** Free-form tags (retained alongside the structured fields). */
  tags: string[];
  /** DENORMALIZED for the recency filter (spec §4). */
  lastPerformedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** savedWorkouts — a named, reusable set of exercises ("Plan Workout" templates). */
export interface SavedWorkout {
  _id: ObjectId;
  userId: string;
  /** Unique per user. */
  name: string;
  exerciseIds: ObjectId[];
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
  /** Exercises planned for this session (the "Today's Workout" list). */
  plannedExerciseIds: ObjectId[];
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
