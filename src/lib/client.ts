/**
 * Client-side API helpers + the display-shaped types the UI consumes.
 *
 * Server documents are JSON-serialized over the wire, so ObjectIds become hex
 * strings and Dates become ISO strings. These types mirror src/lib/types.ts
 * with that serialization applied.
 */

import type { ProgressBy, PrCategory, RepRange } from "./types";
import type { PrefillResult } from "./logic/prefill";

export interface ExerciseDTO {
  _id: string;
  userId: string;
  name: string;
  tags: string[];
  equipment: string[];
  hasWeight: boolean;
  progressBy: ProgressBy;
  defaultWeight: number | null;
  defaultUnit: string;
  usualRepRange: RepRange;
  lastPerformedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrDTO {
  category: PrCategory;
  exerciseId: string | null;
  exerciseName: string | null;
  weight?: number | null;
  unit?: string | null;
  reps?: number | null;
  durationSeconds?: number | null;
  message: string;
}

export interface WorkoutSummaryDTO {
  setCount: number;
  workoutsLast30Days: number;
  prs: PrDTO[];
}

export interface WorkoutDTO {
  _id: string;
  userId: string;
  status: "in_progress" | "completed";
  readinessScore: number;
  startedAt: string;
  completedAt: string | null;
  summary: WorkoutSummaryDTO | null;
}

export interface LogDTO {
  _id: string;
  workoutId: string;
  exerciseId: string;
  exerciseName: string;
  weight: number | null;
  unit: string | null;
  reps: number | null;
  durationSeconds: number | null;
  rounds: number;
  perceivedDifficulty: number | null;
  readinessScore: number;
  performedAt: string;
}

export type SessionDTO =
  | { action: "resume"; workout: WorkoutDTO }
  | { action: "stale"; workout: WorkoutDTO }
  | { action: "greet" };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Session (§6.1)
  session: () => request<SessionDTO>("/api/session"),
  currentCart: () => request<WorkoutDTO | null>("/api/workouts/current"),
  startWorkout: (readinessScore: number) =>
    request<WorkoutDTO>("/api/workouts", {
      method: "POST",
      body: JSON.stringify({ readinessScore }),
    }),

  // Bank (§6.7)
  listExercises: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<ExerciseDTO[]>(`/api/exercises${qs ? `?${qs}` : ""}`);
  },
  createExercise: (body: Partial<ExerciseDTO>) =>
    request<ExerciseDTO>("/api/exercises", { method: "POST", body: JSON.stringify(body) }),
  updateExercise: (id: string, body: Partial<ExerciseDTO>) =>
    request<ExerciseDTO>(`/api/exercises/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  // Logging (§6.2 / §6.4)
  prefill: (exerciseId: string) =>
    request<PrefillResult>(`/api/exercises/${exerciseId}/prefill`),
  cartLogs: (workoutId: string) => request<LogDTO[]>(`/api/workouts/${workoutId}/logs`),
  addLog: (workoutId: string, body: Record<string, unknown>) =>
    request<LogDTO>(`/api/workouts/${workoutId}/logs`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateLog: (logId: string, body: Record<string, unknown>) =>
    request<LogDTO>(`/api/logs/${logId}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteLog: (logId: string) =>
    request<{ deleted: boolean }>(`/api/logs/${logId}`, { method: "DELETE" }),

  // Complete + stats (§6.5 / §6.8)
  completeWorkout: (workoutId: string) =>
    request<WorkoutDTO>(`/api/workouts/${workoutId}/complete`, { method: "POST" }),
  stats: () => request<{ windowDays: number; workoutsLast30Days: number }>("/api/stats"),
};
