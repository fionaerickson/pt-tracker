"use client";

/**
 * Plan Workout (punch-list 3).
 * - Search bar; saved workouts show until the user starts searching.
 * - Searching lets you add individual exercises to a "Workout Menu".
 * - With a menu built: Save Workout (names + persists) or Launch Workout
 *   (readiness interstitial → Today's Workout). Selecting a saved workout
 *   launches it the same way.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ExerciseDTO, type SavedWorkoutDTO } from "@/lib/client";
import { ReadinessModal } from "@/components/ReadinessModal";

export default function PlanWorkout() {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [saved, setSaved] = useState<SavedWorkoutDTO[]>([]);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [menu, setMenu] = useState<ExerciseDTO[]>([]);
  const [launchIds, setLaunchIds] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listExercises().then(setExercises).catch((e) => setError(e.message));
    api.listSavedWorkouts().then(setSaved).catch(() => {});
  }, []);

  const searching = focused || query.trim().length > 0;
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises
      .filter((e) => !menu.some((m) => m._id === e._id))
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true));
  }, [exercises, query, menu]);

  const add = (ex: ExerciseDTO) => setMenu((m) => [...m, ex]);
  const remove = (id: string) => setMenu((m) => m.filter((e) => e._id !== id));

  async function saveMenu() {
    const name = window.prompt("Name this workout:");
    if (!name?.trim()) return;
    setError(null);
    try {
      await api.saveWorkout(name.trim(), menu.map((e) => e._id));
      setSaved(await api.listSavedWorkouts());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function launch(readiness: number) {
    if (!launchIds) return;
    setBusy(true);
    setError(null);
    try {
      await api.startWorkout(readiness, launchIds);
      router.push("/today");
    } catch (e) {
      const msg = (e as Error).message;
      // Already in progress → just go to the session.
      if (msg.includes("already in progress")) router.push("/today");
      else {
        setError(msg);
        setBusy(false);
        setLaunchIds(null);
      }
    }
  }

  return (
    <div>
      <h1>Plan Workout</h1>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <input
        placeholder="🔍 Search exercises…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
      />

      {/* Default view: saved workouts (until the user searches) */}
      {!searching && menu.length === 0 && (
        <>
          <h2>Saved workouts</h2>
          {saved.length === 0 && <p className="muted">No saved workouts yet. Search to build one.</p>}
          {saved.map((w) => (
            <button
              key={w._id}
              className="card block"
              style={{ textAlign: "left", height: "auto" }}
              onClick={() => setLaunchIds(w.exerciseIds)}
            >
              <strong>{w.name}</strong>
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                {w.exerciseIds.length} exercises · tap to launch
              </div>
            </button>
          ))}
        </>
      )}

      {/* Search results */}
      {searching && (
        <>
          <h2>Add exercises</h2>
          {results.length === 0 && <p className="muted">No matches.</p>}
          {results.slice(0, 20).map((ex) => (
            <div key={ex._id} className="card row spread">
              <div>
                <strong>{ex.name}</strong>
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  {ex.muscleGroup ?? "—"} · {ex.purpose}
                </div>
              </div>
              <button className="primary sm" onClick={() => add(ex)}>
                + Add
              </button>
            </div>
          ))}
        </>
      )}

      {/* Workout menu */}
      {menu.length > 0 && (
        <>
          <h2>Workout Menu</h2>
          {menu.map((ex) => (
            <div key={ex._id} className="card row spread">
              <strong>{ex.name}</strong>
              <button className="danger sm" onClick={() => remove(ex._id)}>
                Remove
              </button>
            </div>
          ))}
          <div className="actionbar">
            <button className="block" onClick={saveMenu}>
              Save Workout
            </button>
            <button className="primary block" onClick={() => setLaunchIds(menu.map((e) => e._id))}>
              Launch Workout
            </button>
          </div>
        </>
      )}

      {launchIds && (
        <ReadinessModal busy={busy} onConfirm={launch} onCancel={() => setLaunchIds(null)} />
      )}
    </div>
  );
}
