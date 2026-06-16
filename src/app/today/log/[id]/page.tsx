"use client";

/**
 * Log a set — the signature button-first screen (design spec §6, §7.5).
 * Weight button group (last−step / last / last+step / Other), reps slider,
 * difficulty segments, lbs/kg toggle, and a Warm Up? checkbox (punch-list 1).
 * Actions: Save and add another (stays) · Add to workout (returns).
 */
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type ExerciseDTO, type WorkoutDTO } from "@/lib/client";
import type { PrefillResult } from "@/lib/logic/prefill";
import type { OverloadResult } from "@/lib/logic/overload";
import { Icon } from "@/components/icons";

const DURATION_QUICK = [30, 45, 60, 90];

export default function LogExercise() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [workout, setWorkout] = useState<WorkoutDTO | null>(null);
  const [exercise, setExercise] = useState<ExerciseDTO | null>(null);
  const [prefill, setPrefill] = useState<PrefillResult | null>(null);

  const [unit, setUnit] = useState("lbs");
  const [weight, setWeight] = useState<number | null>(null);
  const [otherWeight, setOtherWeight] = useState<string>("");
  const [useOtherWeight, setUseOtherWeight] = useState(false);
  const [reps, setReps] = useState<number>(8);
  const [duration, setDuration] = useState<number>(45);
  const [difficulty, setDifficulty] = useState<number>(3);
  const [isWarmup, setIsWarmup] = useState(false);

  const [justAdded, setJustAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTime = exercise?.progressBy === "time";
  const step = exercise?.weightStep ?? 5;

  const load = useCallback(async () => {
    const [w, ex, p] = await Promise.all([api.currentCart(), api.getExercise(id), api.prefill(id)]);
    setWorkout(w);
    setExercise(ex);
    setPrefill(p);
    setUnit(p.fields.unit ?? ex.defaultUnit ?? "lbs");

    const base = p.fields.weight ?? ex.defaultWeight ?? ex.weightStep ?? 5;
    // Overload → preselect the heavier suggestion.
    setWeight(p.overload && p.overload.metric === "weight" ? base + (ex.weightStep ?? 5) : base);
    setUseOtherWeight(false);
    setReps(p.fields.reps ?? Math.round(((ex.usualRepRange?.min ?? 8) + (ex.usualRepRange?.max ?? 12)) / 2));
    setDuration(p.fields.durationSeconds ?? 45);
    setDifficulty(3);
    setIsWarmup(false);
  }, [id]);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  async function addSet(thenReturn: boolean) {
    if (!workout || !exercise) return;
    setBusy(true);
    setError(null);
    const finalWeight = !exercise.hasWeight
      ? null
      : useOtherWeight
        ? otherWeight === ""
          ? null
          : Number(otherWeight)
        : weight;
    try {
      await api.addLog(workout._id, {
        exerciseId: exercise._id,
        exerciseName: exercise.name,
        weight: finalWeight,
        unit: exercise.hasWeight ? unit : null,
        reps: isTime ? null : reps,
        durationSeconds: isTime ? duration : null,
        perceivedDifficulty: difficulty,
        isWarmup,
      });
      if (thenReturn) {
        router.push("/today");
      } else {
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
  if (!exercise || !prefill) return <p className="muted">Loading…</p>;

  const base = prefill.fields.weight ?? exercise.defaultWeight ?? step;
  const overloaded = prefill.overload?.metric === "weight";
  const suggestions = Array.from(new Set([base - step, base, base + step])).filter((w) => w > 0);
  const repMin = exercise.usualRepRange?.min ?? 1;
  const repMax = Math.max(exercise.usualRepRange?.max ?? 12, repMin + 1);

  return (
    <div>
      <button className="ghost" style={{ paddingLeft: 0, gap: 6 }} onClick={() => router.push("/today")}>
        <Icon name="back" size={16} /> Today&apos;s workout
      </button>
      <h1 style={{ marginTop: 6 }}>{exercise.name}</h1>
      {exercise.purpose === "PT" && <span className="pill pt">PT — no overload nudges</span>}

      {prefill.overload && (
        <div className="nudge">
          <Icon name="dumbbell" size={18} />
          <div>{nudgeText(prefill.overload, step)}</div>
        </div>
      )}

      <label className="check" style={{ marginTop: 8 }}>
        <input type="checkbox" checked={isWarmup} onChange={(e) => setIsWarmup(e.target.checked)} />
        Warm-up set <span className="caption">(ignored for nudges)</span>
      </label>

      {/* Weight */}
      {exercise.hasWeight && (
        <>
          <div className="row spread" style={{ marginTop: 14, marginBottom: 8 }}>
            <span className="eyebrow">Weight</span>
            <div className="unit-toggle">
              <span className={unit === "lbs" ? "on" : ""} onClick={() => setUnit("lbs")}>
                lbs
              </span>
              <span className={unit === "kg" ? "on" : ""} onClick={() => setUnit("kg")}>
                kg
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {suggestions.map((w) => (
              <div
                key={w}
                className={`seg ${!useOtherWeight && weight === w ? "sel" : ""}`}
                onClick={() => {
                  setUseOtherWeight(false);
                  setWeight(w);
                }}
              >
                {w}
              </div>
            ))}
            <div
              className={`seg muted ${useOtherWeight ? "sel" : ""}`}
              onClick={() => setUseOtherWeight(true)}
            >
              Other
            </div>
          </div>
          {useOtherWeight && (
            <div className="stepper" style={{ marginTop: 10, justifyContent: "center" }}>
              <button onClick={() => setOtherWeight((v) => String(Math.max(0, (Number(v) || 0) - step)))}>
                <Icon name="minus" size={18} />
              </button>
              <input
                style={{ width: 90, textAlign: "center" }}
                inputMode="decimal"
                value={otherWeight}
                onChange={(e) => setOtherWeight(e.target.value)}
              />
              <button onClick={() => setOtherWeight((v) => String((Number(v) || 0) + step))}>
                <Icon name="plus" size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Reps or Duration */}
      {isTime ? (
        <>
          <div className="row spread" style={{ marginTop: 18, marginBottom: 8 }}>
            <span className="eyebrow">Duration</span>
            <span className="stat" style={{ fontSize: 26 }}>
              {duration}s
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {DURATION_QUICK.map((d) => (
              <div key={d} className={`seg ${duration === d ? "sel" : ""}`} onClick={() => setDuration(d)}>
                {d}s
              </div>
            ))}
          </div>
          <div className="stepper" style={{ marginTop: 10, justifyContent: "center" }}>
            <button onClick={() => setDuration((d) => Math.max(0, d - 5))}>
              <Icon name="minus" size={18} />
            </button>
            <span className="stat" style={{ fontSize: 22, minWidth: 60, textAlign: "center" }}>
              {duration}
            </span>
            <button onClick={() => setDuration((d) => d + 5)}>
              <Icon name="plus" size={18} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="row spread" style={{ marginTop: 18, marginBottom: 6, alignItems: "baseline" }}>
            <span className="eyebrow">Reps</span>
            <span className="stat" style={{ fontSize: 28 }}>
              {reps}
            </span>
          </div>
          <input
            type="range"
            min={repMin}
            max={repMax}
            step={1}
            value={Math.min(Math.max(reps, repMin), repMax)}
            onChange={(e) => setReps(Number(e.target.value))}
          />
          <div className="row spread">
            <span className="caption">{repMin}</span>
            <span className="caption">{repMax}</span>
          </div>
        </>
      )}

      {/* Difficulty */}
      <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>
        How hard did that feel?
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((d) => (
          <div key={d} className={`seg ${difficulty === d ? "sel" : ""}`} onClick={() => setDifficulty(d)}>
            {d}
          </div>
        ))}
      </div>
      <div className="row spread" style={{ marginTop: 6 }}>
        <span className="caption">Easy</span>
        <span className="caption">Max effort</span>
      </div>

      {justAdded && (
        <p style={{ color: "var(--success)", display: "flex", gap: 6, alignItems: "center" }}>
          <Icon name="check" size={16} /> Added to your Exercise Log
        </p>
      )}

      <div className="col" style={{ marginTop: 18 }}>
        <button className="secondary block" disabled={busy} onClick={() => addSet(false)}>
          Save and add another
        </button>
        <button className="primary block" disabled={busy} onClick={() => addSet(true)}>
          Add to workout
        </button>
      </div>
    </div>
  );
}

function nudgeText(o: OverloadResult, step: number): string {
  if (o.reason === "too_easy") {
    return `That last set looked easy — time to push your ${o.metric} past ${o.value}.`;
  }
  if (o.metric === "weight") {
    return `Your weight has held at ${o.value} for a few sessions. Ready to try ${o.value + step}?`;
  }
  return `Your ${o.metric} has held at ${o.value}. Time for a bump?`;
}
