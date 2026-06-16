"use client";

/**
 * Today's Workout — the cart (design spec §7.4 / punch-list 3,7).
 * Lists planned exercises for quick logging, lets you add any exercise ad-hoc
 * (the "Launch workout" path), shows the Exercise Log, and finishes into the
 * celebration + summary.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, type ExerciseDTO, type LogDTO, type WorkoutDTO } from "@/lib/client";
import { Summary } from "@/components/Summary";
import { Icon } from "@/components/icons";

export default function TodaysWorkout() {
  const [workout, setWorkout] = useState<WorkoutDTO | null>(null);
  const [allExercises, setAllExercises] = useState<ExerciseDTO[]>([]);
  const [logs, setLogs] = useState<LogDTO[]>([]);
  const [summary, setSummary] = useState<WorkoutDTO | null>(null);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (w: WorkoutDTO) => {
    const [all, cart] = await Promise.all([api.listExercises(), api.cartLogs(w._id)]);
    setAllExercises(all);
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

  const plannedIds = useMemo(() => {
    if (!workout) return new Set<string>();
    return new Set([...(workout.plannedExerciseIds ?? []), ...logs.map((l) => l.exerciseId)]);
  }, [workout, logs]);

  const planned = allExercises.filter((e) => plannedIds.has(e._id));
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allExercises.filter((e) => !plannedIds.has(e._id) && e.name.toLowerCase().includes(q));
  }, [allExercises, plannedIds, query]);

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
          Start one from <Link href="/">Today</Link> or <Link href="/plan">Plan workout</Link>.
        </p>
      </div>
    );

  const setsByExercise = (id: string) =>
    logs.filter((l) => l.exerciseId === id).reduce((n, l) => n + l.rounds, 0);
  const totalSets = logs.reduce((n, l) => n + l.rounds, 0);

  return (
    <div>
      <div className="row spread">
        <h1>Today&apos;s workout</h1>
        <span className="pill">readiness {workout.readinessScore}/5</span>
      </div>

      {planned.map((ex) => {
        const sets = setsByExercise(ex._id);
        return (
          <Link key={ex._id} href={`/today/log/${ex._id}`}>
            <button className="card block row spread" style={{ height: "auto", textAlign: "left" }}>
              <span>
                <strong>{ex.name}</strong>
                {ex.purpose === "PT" && <span className="pill pt" style={{ marginLeft: 6 }}>PT</span>}
                <div className="caption">
                  {sets > 0 ? `${sets} set${sets === 1 ? "" : "s"} logged` : "Tap to log"}
                </div>
              </span>
              <Icon name="chevron" />
            </button>
          </Link>
        );
      })}

      {/* Ad-hoc add — the Launch-workout path logs exercises individually */}
      <h2>Add an exercise</h2>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: 13, color: "var(--muted)" }}>
          <Icon name="search" />
        </span>
        <input
          style={{ paddingLeft: 40 }}
          placeholder="Search to log…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {searchResults.slice(0, 12).map((ex) => (
        <Link key={ex._id} href={`/today/log/${ex._id}`}>
          <button className="card block row spread" style={{ height: "auto", textAlign: "left" }}>
            <span>{ex.name}</span>
            <Icon name="plus" />
          </button>
        </Link>
      ))}

      <h2>
        Exercise Log <span className="muted">({totalSets} sets)</span>
      </h2>
      {logs.length === 0 && <p className="muted">Nothing logged yet.</p>}
      {logs.map((log) => (
        <div key={log._id} className="card">
          <strong>{log.exerciseName}</strong>
          {log.isWarmup && <span className="pill" style={{ marginLeft: 6 }}>warm-up</span>}
          <div className="caption">
            {log.weight != null ? `${log.weight}${log.unit ?? ""} · ` : ""}
            {log.reps != null ? `${log.reps} reps · ` : ""}
            {log.durationSeconds != null ? `${log.durationSeconds}s · ` : ""}
            {log.rounds} {log.rounds === 1 ? "round" : "rounds"}
          </div>
        </div>
      ))}

      {logs.length > 0 && (
        <button className="primary block sticky-cta" onClick={finish}>
          Finish workout
        </button>
      )}
    </div>
  );
}
