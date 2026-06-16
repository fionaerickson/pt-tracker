"use client";

/**
 * Plan Workout (design spec §7.2 / punch-list 3).
 * Search → Workout Menu → Save Workout / Launch Workout (readiness sheet).
 * Saved workouts launch in one tap (also via the readiness sheet).
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ExerciseDTO, type SavedWorkoutDTO } from "@/lib/client";
import { ReadinessModal } from "@/components/ReadinessModal";
import { Icon } from "@/components/icons";

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
      <h1>Plan workout</h1>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: 13, color: "var(--muted)" }}>
          <Icon name="search" />
        </span>
        <input
          style={{ paddingLeft: 40 }}
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
        />
      </div>

      {!searching && menu.length === 0 && (
        <>
          <h2>Saved workouts</h2>
          {saved.length === 0 && <p className="muted">No saved workouts yet. Search to build one.</p>}
          {saved.map((w) => (
            <button
              key={w._id}
              className="card block row spread"
              style={{ height: "auto", textAlign: "left" }}
              onClick={() => setLaunchIds(w.exerciseIds)}
            >
              <span>
                <strong>{w.name}</strong>
                <div className="caption">{w.exerciseIds.length} exercises · tap to launch</div>
              </span>
              <Icon name="chevron" />
            </button>
          ))}
        </>
      )}

      {searching && (
        <>
          <h2>Add exercises</h2>
          {results.length === 0 && <p className="muted">No matches.</p>}
          {results.slice(0, 20).map((ex) => (
            <div key={ex._id} className="card row spread">
              <div>
                <strong>{ex.name}</strong>
                <div className="caption">
                  {ex.muscleGroup ?? "—"} · {ex.purpose}
                </div>
              </div>
              <button className="primary sm" onClick={() => add(ex)}>
                <Icon name="plus" size={16} /> Add
              </button>
            </div>
          ))}
        </>
      )}

      {menu.length > 0 && (
        <>
          <h2>Today&apos;s menu</h2>
          {menu.map((ex) => (
            <div key={ex._id} className="card row spread">
              <strong>{ex.name}</strong>
              <button className="danger" onClick={() => remove(ex._id)}>
                <Icon name="trash" size={16} /> Remove
              </button>
            </div>
          ))}
          <div className="row sticky-cta" style={{ background: "var(--bg)" }}>
            <button className="secondary" style={{ flex: 1 }} onClick={saveMenu}>
              Save workout
            </button>
            <button className="primary" style={{ flex: 1 }} onClick={() => setLaunchIds(menu.map((e) => e._id))}>
              Launch workout
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
