"use client";

/**
 * Per-exercise log screen (punch-list 3).
 * Adaptive prefill + overload nudge (§6.2/§6.3). Two actions:
 *   - Save and Add Another Set → adds to the Exercise Log, reloads this screen.
 *   - Submit → adds to the Exercise Log, returns to Today's Workout.
 */
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type ExerciseDTO, type WorkoutDTO } from "@/lib/client";
import type { PrefillResult } from "@/lib/logic/prefill";
import type { OverloadResult } from "@/lib/logic/overload";

interface FormState {
  weight: string;
  unit: string;
  reps: string;
  durationSeconds: string;
  perceivedDifficulty: string;
}

function fieldsToForm(p: PrefillResult["fields"]): FormState {
  return {
    weight: p.weight?.toString() ?? "",
    unit: p.unit ?? "lbs",
    reps: p.reps?.toString() ?? "",
    durationSeconds: p.durationSeconds?.toString() ?? "",
    perceivedDifficulty: "",
  };
}

function nudgeText(o: OverloadResult): string {
  if (o.reason === "too_easy")
    return `That last set looked easy — time to push your ${o.metric} past ${o.value}.`;
  return `Time for progressive overload — your ${o.metric} has held at ${o.value}. Try a bump?`;
}

export default function LogExercise() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [workout, setWorkout] = useState<WorkoutDTO | null>(null);
  const [exercise, setExercise] = useState<ExerciseDTO | null>(null);
  const [prefill, setPrefill] = useState<PrefillResult | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [w, ex, p] = await Promise.all([api.currentCart(), api.getExercise(id), api.prefill(id)]);
    setWorkout(w);
    setExercise(ex);
    setPrefill(p);
    setForm(fieldsToForm(p.fields));
  }, [id]);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  async function addSet(thenReturn: boolean) {
    if (!workout || !exercise || !form) return;
    setBusy(true);
    setError(null);
    try {
      await api.addLog(workout._id, {
        exerciseId: exercise._id,
        exerciseName: exercise.name,
        weight: form.weight === "" ? null : Number(form.weight),
        unit: form.unit || null,
        reps: form.reps === "" ? null : Number(form.reps),
        durationSeconds: form.durationSeconds === "" ? null : Number(form.durationSeconds),
        perceivedDifficulty:
          form.perceivedDifficulty === "" ? null : Number(form.perceivedDifficulty),
      });
      if (thenReturn) {
        router.push("/today");
      } else {
        // Reload the same exercise's screen for the next set.
        await load();
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1500);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p style={{ color: "var(--danger)" }}>{error}</p>;
  if (!exercise || !form || !prefill) return <p className="muted">Loading…</p>;

  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div>
      <button className="ghost sm" onClick={() => router.push("/today")}>
        ← Today&apos;s Workout
      </button>
      <h1 style={{ marginTop: "0.75rem" }}>{exercise.name}</h1>
      {exercise.purpose === "PT" && <span className="pill pt">PT — no overload nudges</span>}

      {prefill.overload && <p className="nudge">{nudgeText(prefill.overload)}</p>}
      {justAdded && <p style={{ color: "var(--good)" }}>✓ Set added to your Exercise Log</p>}

      <div className="grid2" style={{ marginTop: "0.75rem" }}>
        {exercise.hasWeight && (
          <>
            <label>
              Weight
              <input
                type="number"
                inputMode="decimal"
                value={form.weight}
                onChange={(e) => set({ weight: e.target.value })}
              />
            </label>
            <label>
              Unit
              <input value={form.unit} onChange={(e) => set({ unit: e.target.value })} />
            </label>
          </>
        )}
        <label>
          Reps
          <input
            type="number"
            inputMode="numeric"
            value={form.reps}
            onChange={(e) => set({ reps: e.target.value })}
          />
        </label>
        <label>
          Duration (s)
          <input
            type="number"
            inputMode="numeric"
            value={form.durationSeconds}
            onChange={(e) => set({ durationSeconds: e.target.value })}
          />
        </label>
        <label>
          Difficulty (1–5)
          <input
            type="number"
            min={1}
            max={5}
            inputMode="numeric"
            value={form.perceivedDifficulty}
            onChange={(e) => set({ perceivedDifficulty: e.target.value })}
          />
        </label>
      </div>

      <div className="col" style={{ marginTop: "1rem" }}>
        <button className="block" disabled={busy} onClick={() => addSet(false)}>
          Save and Add Another Set
        </button>
        <button className="primary block" disabled={busy} onClick={() => addSet(true)}>
          Submit
        </button>
      </div>
    </div>
  );
}
