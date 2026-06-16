"use client";

/**
 * Exercise Bank (punch-list 5) — structured fields:
 * name, progress goal, muscle group, starting weight, starting reps (min/max),
 * purpose, equipment (multiselect). Default weight unit is lbs.
 */
import { useCallback, useEffect, useState } from "react";
import { api, type ExerciseDTO } from "@/lib/client";
import {
  EQUIPMENT_OPTIONS,
  MUSCLE_GROUP_OPTIONS,
  PROGRESS_GOAL_OPTIONS,
  PURPOSE_OPTIONS,
  type Equipment,
  type MuscleGroup,
  type ProgressBy,
  type Purpose,
} from "@/lib/types";

interface FormState {
  name: string;
  progressBy: ProgressBy;
  muscleGroup: MuscleGroup | "";
  defaultWeight: string;
  repMin: string;
  repMax: string;
  purpose: Purpose;
  equipment: Equipment[];
}

const EMPTY: FormState = {
  name: "",
  progressBy: "weight",
  muscleGroup: "",
  defaultWeight: "",
  repMin: "min",
  repMax: "max",
  purpose: "Strength",
  equipment: [],
};

export default function Bank() {
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [name, setName] = useState("");
  const [recency, setRecency] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (name) params.name = name;
      if (recency) params.recency = recency;
      setExercises(await api.listExercises(params));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [name, recency]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const toggleEquip = (e: Equipment) =>
    setForm((f) => ({
      ...f,
      equipment: f.equipment.includes(e)
        ? f.equipment.filter((x) => x !== e)
        : [...f.equipment, e],
    }));

  async function save() {
    setError(null);
    const repMin = Number(form.repMin);
    const repMax = Number(form.repMax);
    const payload: Partial<ExerciseDTO> = {
      name: form.name,
      progressBy: form.progressBy,
      muscleGroup: form.muscleGroup || null,
      purpose: form.purpose,
      equipment: form.equipment,
      defaultWeight: form.defaultWeight === "" ? null : Number(form.defaultWeight),
      defaultUnit: "lbs",
      usualRepRange: {
        min: Number.isFinite(repMin) ? repMin : 8,
        max: Number.isFinite(repMax) ? repMax : 12,
      },
    };
    try {
      if (editingId) await api.updateExercise(editingId, payload);
      else await api.createExercise(payload);
      setForm(EMPTY);
      setEditingId(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function edit(ex: ExerciseDTO) {
    setEditingId(ex._id);
    setForm({
      name: ex.name,
      progressBy: ex.progressBy,
      muscleGroup: ex.muscleGroup ?? "",
      defaultWeight: ex.defaultWeight?.toString() ?? "",
      repMin: ex.usualRepRange?.min?.toString() ?? "min",
      repMax: ex.usualRepRange?.max?.toString() ?? "max",
      purpose: ex.purpose,
      equipment: ex.equipment ?? [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      <h1>Exercise Bank</h1>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="card">
        <strong>{editingId ? "Edit exercise" : "New exercise"}</strong>
        <div className="col" style={{ marginTop: "0.6rem" }}>
          <label>
            Name
            <input value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <div className="grid2">
            <label>
              Progress goal
              <select value={form.progressBy} onChange={(e) => set({ progressBy: e.target.value as ProgressBy })}>
                {PROGRESS_GOAL_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o === "na" ? "N/A" : o}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Muscle group
              <select value={form.muscleGroup} onChange={(e) => set({ muscleGroup: e.target.value as MuscleGroup | "" })}>
                <option value="">—</option>
                {MUSCLE_GROUP_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Starting weight (lbs)
              <input
                type="number"
                inputMode="decimal"
                value={form.defaultWeight}
                onChange={(e) => set({ defaultWeight: e.target.value })}
              />
            </label>
            <label>
              Purpose
              <select value={form.purpose} onChange={(e) => set({ purpose: e.target.value as Purpose })}>
                {PURPOSE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Starting reps (min)
              <input value={form.repMin} onChange={(e) => set({ repMin: e.target.value })} />
            </label>
            <label>
              Starting reps (max)
              <input value={form.repMax} onChange={(e) => set({ repMax: e.target.value })} />
            </label>
          </div>

          <div>
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.4rem", fontWeight: 500 }}>
              Equipment
            </div>
            <div className="row">
              {EQUIPMENT_OPTIONS.map((e) => (
                <span
                  key={e}
                  className={`chip ${form.equipment.includes(e) ? "on" : ""}`}
                  onClick={() => toggleEquip(e)}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>

          <div className="row">
            <button className="primary block" disabled={!form.name} onClick={save}>
              {editingId ? "Save changes" : "Add to bank"}
            </button>
            {editingId && (
              <button
                className="ghost"
                onClick={() => {
                  setForm(EMPTY);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid2" style={{ margin: "1rem 0 0.5rem" }}>
        <input placeholder="🔍 Search by name…" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={recency} onChange={(e) => setRecency(e.target.value)}>
          <option value="">All</option>
          <option value="recent">Done recently</option>
          <option value="stale">Not done recently</option>
        </select>
      </div>

      {exercises.length === 0 && <p className="muted">No exercises yet — add one above.</p>}
      {exercises.map((ex) => (
        <div key={ex._id} className="card row spread">
          <div>
            <strong>{ex.name}</strong>{" "}
            <span className={`pill ${ex.purpose === "PT" ? "pt" : ""}`}>{ex.purpose}</span>{" "}
            <span className="pill">{ex.progressBy === "na" ? "N/A" : ex.progressBy}</span>
            <div className="muted" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
              {ex.muscleGroup ?? "—"} · {ex.equipment.join(", ") || "no equipment"}
            </div>
          </div>
          <button className="ghost sm" onClick={() => edit(ex)}>
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}
