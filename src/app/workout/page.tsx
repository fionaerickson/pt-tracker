"use client";

/**
 * Active session / logging screen — spec §6.2 (adaptive prefill, which runs the
 * §6.3 overload check), §6.4 (cart operations), and §6.5/§6.6 (complete →
 * celebration + summary).
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  type ExerciseDTO,
  type LogDTO,
  type WorkoutDTO,
} from "@/lib/client";
import type { PrefillResult } from "@/lib/logic/prefill";

interface FormState {
  weight: string;
  unit: string;
  reps: string;
  durationSeconds: string;
  perceivedDifficulty: string;
}

const emptyForm: FormState = { weight: "", unit: "", reps: "", durationSeconds: "", perceivedDifficulty: "" };

function fieldsToForm(p: PrefillResult["fields"]): FormState {
  return {
    weight: p.weight?.toString() ?? "",
    unit: p.unit ?? "",
    reps: p.reps?.toString() ?? "",
    durationSeconds: p.durationSeconds?.toString() ?? "",
    perceivedDifficulty: "",
  };
}

export default function WorkoutScreen() {
  const [workout, setWorkout] = useState<WorkoutDTO | null>(null);
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [cart, setCart] = useState<LogDTO[]>([]);
  const [selected, setSelected] = useState<ExerciseDTO | null>(null);
  const [prefill, setPrefill] = useState<PrefillResult | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [summary, setSummary] = useState<WorkoutDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCart = useCallback(async (workoutId: string) => {
    setCart(await api.cartLogs(workoutId));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const w = await api.currentCart();
        setWorkout(w);
        setExercises(await api.listExercises());
        if (w) await loadCart(w._id);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [loadCart]);

  async function selectExercise(ex: ExerciseDTO) {
    setError(null);
    setSelected(ex);
    try {
      const p = await api.prefill(ex._id);
      setPrefill(p);
      setForm(fieldsToForm(p.fields));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function addToCart() {
    if (!workout || !selected) return;
    setError(null);
    try {
      await api.addLog(workout._id, {
        exerciseId: selected._id,
        exerciseName: selected.name,
        weight: form.weight === "" ? null : Number(form.weight),
        unit: form.unit || null,
        reps: form.reps === "" ? null : Number(form.reps),
        durationSeconds: form.durationSeconds === "" ? null : Number(form.durationSeconds),
        perceivedDifficulty:
          form.perceivedDifficulty === "" ? null : Number(form.perceivedDifficulty),
      });
      setSelected(null);
      setPrefill(null);
      setForm(emptyForm);
      await loadCart(workout._id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function changeRounds(log: LogDTO, delta: number) {
    if (!workout) return;
    const rounds = Math.max(1, log.rounds + delta);
    await api.updateLog(log._id, { rounds });
    await loadCart(workout._id);
  }

  async function removeLog(log: LogDTO) {
    if (!workout) return;
    await api.deleteLog(log._id);
    await loadCart(workout._id);
  }

  async function complete() {
    if (!workout) return;
    setError(null);
    try {
      setSummary(await api.completeWorkout(workout._id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) return <p className="danger">{error}</p>;
  if (summary) return <Summary workout={summary} />;
  if (!workout)
    return (
      <div>
        <h1>No active session</h1>
        <p className="muted">
          Start one from <Link href="/">Today</Link>.
        </p>
      </div>
    );

  const setF = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div>
      <div className="row spread">
        <h1>Session</h1>
        <span className="pill">readiness {workout.readinessScore}/5</span>
      </div>

      {/* Exercise picker */}
      {!selected && (
        <>
          <p className="muted">Tap an exercise to log it.</p>
          {exercises.length === 0 && (
            <p className="muted">
              No exercises — add some in the <Link href="/bank">bank</Link>.
            </p>
          )}
          {exercises.map((ex) => (
            <div key={ex._id} className="card row spread">
              <span>{ex.name}</span>
              <button onClick={() => selectExercise(ex)}>Log →</button>
            </div>
          ))}
        </>
      )}

      {/* Adaptive logging form */}
      {selected && prefill && (
        <div className="card">
          <div className="row spread">
            <strong>{selected.name}</strong>
            <span className="pill">{prefill.branch.replace("_", " ")}</span>
          </div>

          {prefill.overload && (
            <p className="nudge">
              Time for progressive overload — your {prefill.overload.metric} has held at{" "}
              {prefill.overload.value} across recent ready sessions. Try a bump?
            </p>
          )}

          <div className="grid2" style={{ marginTop: "0.6rem" }}>
            {selected.hasWeight && (
              <>
                <label>
                  Weight
                  <input type="number" value={form.weight} onChange={(e) => setF({ weight: e.target.value })} />
                </label>
                <label>
                  Unit
                  <input value={form.unit} onChange={(e) => setF({ unit: e.target.value })} />
                </label>
              </>
            )}
            <label>
              Reps
              <input type="number" value={form.reps} onChange={(e) => setF({ reps: e.target.value })} />
            </label>
            <label>
              Duration (s)
              <input
                type="number"
                value={form.durationSeconds}
                onChange={(e) => setF({ durationSeconds: e.target.value })}
              />
            </label>
            <label>
              Difficulty (1–5)
              <input
                type="number"
                min={1}
                max={5}
                value={form.perceivedDifficulty}
                onChange={(e) => setF({ perceivedDifficulty: e.target.value })}
              />
            </label>
          </div>
          <div className="row" style={{ marginTop: "0.6rem" }}>
            <button className="primary" onClick={addToCart}>Add to cart</button>
            <button className="ghost" onClick={() => { setSelected(null); setPrefill(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cart */}
      <h2 style={{ marginTop: "1.5rem" }}>
        Cart <span className="muted">({cart.reduce((n, l) => n + l.rounds, 0)} sets)</span>
      </h2>
      {cart.length === 0 && <p className="muted">Nothing logged yet.</p>}
      {cart.map((log) => (
        <div key={log._id} className="card row spread">
          <div>
            <strong>{log.exerciseName}</strong>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              {log.weight != null ? `${log.weight}${log.unit ?? ""} · ` : ""}
              {log.reps != null ? `${log.reps} reps · ` : ""}
              {log.durationSeconds != null ? `${log.durationSeconds}s · ` : ""}
              {log.rounds} {log.rounds === 1 ? "round" : "rounds"}
            </div>
          </div>
          <div className="row">
            <button onClick={() => changeRounds(log, -1)}>−</button>
            <span>{log.rounds}</span>
            <button onClick={() => changeRounds(log, 1)}>+</button>
            <button className="danger" onClick={() => removeLog(log)}>Remove</button>
          </div>
        </div>
      ))}

      {cart.length > 0 && (
        <button className="primary" style={{ marginTop: "1rem" }} onClick={complete}>
          Finish workout 🎉
        </button>
      )}
    </div>
  );
}

function Summary({ workout }: { workout: WorkoutDTO }) {
  const s = workout.summary;
  return (
    <div>
      <div className="celebrate">🎉</div>
      <h1 style={{ textAlign: "center" }}>Nice work!</h1>
      <div className="card" style={{ textAlign: "center" }}>
        <p>
          <strong>{s?.setCount ?? 0}</strong> sets logged ·{" "}
          <strong>{s?.workoutsLast30Days ?? 0}</strong> workouts in the last 30 days
        </p>
      </div>
      <h2>Personal bests</h2>
      {(!s || s.prs.length === 0) && <p className="muted">No PRs this session — still counts.</p>}
      {s?.prs.map((pr, i) => (
        <div key={i} className="pr">
          <strong>{pr.category.replace(/_/g, " ")}</strong>
          <div>{pr.message}</div>
        </div>
      ))}
      <div style={{ marginTop: "1rem" }}>
        <Link href="/">← Back to Today</Link>
      </div>
    </div>
  );
}
