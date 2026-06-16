"use client";

/**
 * Today's Workout (punch-list 3/7).
 * Lists the planned exercises for easy logging, shows the Exercise Log
 * (formerly "Cart"), and finishes the session into a celebration + summary.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type ExerciseDTO, type LogDTO, type WorkoutDTO } from "@/lib/client";
import { Summary } from "@/components/Summary";

export default function TodaysWorkout() {
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDTO | null>(null);
  const [planned, setPlanned] = useState<ExerciseDTO[]>([]);
  const [logs, setLogs] = useState<LogDTO[]>([]);
  const [summary, setSummary] = useState<WorkoutDTO | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (w: WorkoutDTO) => {
    const [all, cart] = await Promise.all([api.listExercises(), api.cartLogs(w._id)]);
    const ids = new Set([...(w.plannedExerciseIds ?? []), ...cart.map((l) => l.exerciseId)]);
    setPlanned(all.filter((e) => ids.has(e._id)));
    setLogs(cart);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const w = await api.currentCart();
        setWorkout(w);
        if (w) await refresh(w);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoaded(true);
      }
    })();
  }, [refresh]);

  async function finish() {
    if (!workout) return;
    try {
      setSummary(await api.completeWorkout(workout._id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (summary) return <Summary workout={summary} />;
  if (!loaded) return <p className="muted">Loading…</p>;
  if (error) return <p style={{ color: "var(--danger)" }}>{error}</p>;
  if (!workout)
    return (
      <div>
        <h1>No active session</h1>
        <p className="muted">
          Start one from <Link href="/plan">Plan Workout</Link>.
        </p>
      </div>
    );

  const setsByExercise = (id: string) =>
    logs.filter((l) => l.exerciseId === id).reduce((n, l) => n + l.rounds, 0);
  const totalSets = logs.reduce((n, l) => n + l.rounds, 0);

  return (
    <div>
      <div className="row spread">
        <h1>Today&apos;s Workout</h1>
        <span className="pill">readiness {workout.readinessScore}/5</span>
      </div>

      {planned.length === 0 && (
        <p className="muted">
          No exercises yet — add some from <Link href="/plan">Plan Workout</Link>.
        </p>
      )}

      {planned.map((ex) => {
        const sets = setsByExercise(ex._id);
        return (
          <Link key={ex._id} href={`/today/log/${ex._id}`}>
            <button className="card block row spread" style={{ height: "auto", textAlign: "left" }}>
              <span>
                <strong>{ex.name}</strong>
                {ex.purpose === "PT" && <span className="pill pt" style={{ marginLeft: 6 }}>PT</span>}
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  {sets > 0 ? `${sets} set${sets === 1 ? "" : "s"} logged` : "Tap to log"}
                </div>
              </span>
              <span aria-hidden>→</span>
            </button>
          </Link>
        );
      })}

      {/* Exercise Log (formerly Cart) */}
      <h2>
        Exercise Log <span className="muted">({totalSets} sets)</span>
      </h2>
      {logs.length === 0 && <p className="muted">Nothing logged yet.</p>}
      {logs.map((log) => (
        <div key={log._id} className="card">
          <strong>{log.exerciseName}</strong>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {log.weight != null ? `${log.weight}${log.unit ?? ""} · ` : ""}
            {log.reps != null ? `${log.reps} reps · ` : ""}
            {log.durationSeconds != null ? `${log.durationSeconds}s · ` : ""}
            {log.rounds} {log.rounds === 1 ? "round" : "rounds"}
          </div>
        </div>
      ))}

      {logs.length > 0 && (
        <div className="actionbar">
          <button className="primary block" onClick={finish}>
            Finish workout 🎉
          </button>
        </div>
      )}

      <div style={{ marginTop: "0.5rem" }}>
        <button className="ghost block" onClick={() => router.push("/plan")}>
          + Add more exercises
        </button>
      </div>
    </div>
  );
}
