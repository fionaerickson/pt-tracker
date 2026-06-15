"use client";

/**
 * Exercise bank — spec §6.7 + build step 2.
 * Search/filter the bank and create or edit exercise templates.
 */
import { useCallback, useEffect, useState } from "react";
import { api, type ExerciseDTO } from "@/lib/client";
import type { ProgressBy } from "@/lib/types";

const EMPTY: Partial<ExerciseDTO> = {
  name: "",
  hasWeight: true,
  progressBy: "weight",
  defaultWeight: null,
  defaultUnit: "lb",
  usualRepRange: { min: 8, max: 12 },
  tags: [],
  equipment: [],
};

export default function Bank() {
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [name, setName] = useState("");
  const [recency, setRecency] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ExerciseDTO>>(EMPTY);
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

  async function save() {
    setError(null);
    try {
      const payload = {
        ...form,
        tags: typeof form.tags === "string" ? (form.tags as string).split(",").map((s) => s.trim()).filter(Boolean) : form.tags,
        equipment:
          typeof form.equipment === "string"
            ? (form.equipment as string).split(",").map((s) => s.trim()).filter(Boolean)
            : form.equipment,
      };
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
    setForm({ ...ex, tags: ex.tags.join(", ") as unknown as string[], equipment: ex.equipment.join(", ") as unknown as string[] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const set = (patch: Partial<ExerciseDTO>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div>
      <h1>Exercise bank</h1>
      {error && <p className="danger">{error}</p>}

      {/* Create / edit */}
      <div className="card">
        <strong>{editingId ? "Edit exercise" : "New exercise"}</strong>
        <div className="grid2" style={{ marginTop: "0.6rem" }}>
          <label>
            Name
            <input value={form.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label>
            Progress by
            <select
              value={form.progressBy}
              onChange={(e) => set({ progressBy: e.target.value as ProgressBy })}
            >
              <option value="weight">weight</option>
              <option value="reps">reps</option>
              <option value="time">time</option>
            </select>
          </label>
          <label>
            Default weight
            <input
              type="number"
              value={form.defaultWeight ?? ""}
              onChange={(e) => set({ defaultWeight: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </label>
          <label>
            Default unit
            <input value={form.defaultUnit ?? ""} onChange={(e) => set({ defaultUnit: e.target.value })} />
          </label>
          <label>
            Usual reps (min)
            <input
              type="number"
              value={form.usualRepRange?.min ?? ""}
              onChange={(e) =>
                set({ usualRepRange: { min: Number(e.target.value), max: form.usualRepRange?.max ?? 12 } })
              }
            />
          </label>
          <label>
            Usual reps (max)
            <input
              type="number"
              value={form.usualRepRange?.max ?? ""}
              onChange={(e) =>
                set({ usualRepRange: { min: form.usualRepRange?.min ?? 8, max: Number(e.target.value) } })
              }
            />
          </label>
          <label>
            Tags (comma-separated)
            <input
              value={(form.tags as unknown as string) ?? ""}
              onChange={(e) => set({ tags: e.target.value as unknown as string[] })}
            />
          </label>
          <label>
            Equipment (comma-separated)
            <input
              value={(form.equipment as unknown as string) ?? ""}
              onChange={(e) => set({ equipment: e.target.value as unknown as string[] })}
            />
          </label>
        </div>
        <div className="row" style={{ marginTop: "0.6rem" }}>
          <label className="row" style={{ flexDirection: "row", color: "var(--text)" }}>
            <input
              type="checkbox"
              checked={form.hasWeight ?? true}
              onChange={(e) => set({ hasWeight: e.target.checked })}
            />
            Has weight
          </label>
          <button className="primary" disabled={!form.name} onClick={save}>
            {editingId ? "Save changes" : "Add to bank"}
          </button>
          {editingId && (
            <button className="ghost" onClick={() => { setForm(EMPTY); setEditingId(null); }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Search / filter */}
      <div className="row spread" style={{ margin: "1rem 0 0.5rem" }}>
        <input placeholder="Search by name…" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={recency} onChange={(e) => setRecency(e.target.value)}>
          <option value="">All</option>
          <option value="recent">Done recently</option>
          <option value="stale">Not done recently</option>
        </select>
      </div>

      {/* List */}
      {exercises.length === 0 && <p className="muted">No exercises yet — add one above.</p>}
      {exercises.map((ex) => (
        <div key={ex._id} className="card row spread">
          <div>
            <strong>{ex.name}</strong>{" "}
            <span className="pill">{ex.progressBy}</span>{" "}
            {ex.tags.map((t) => (
              <span key={t} className="pill">{t}</span>
            ))}
            <div className="muted" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
              {ex.equipment.join(", ") || "no equipment"} ·{" "}
              {ex.lastPerformedAt
                ? `last ${new Date(ex.lastPerformedAt).toLocaleDateString()}`
                : "never performed"}
            </div>
          </div>
          <button className="ghost" onClick={() => edit(ex)}>Edit</button>
        </div>
      ))}
    </div>
  );
}
