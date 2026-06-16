"use client";

/**
 * Progress Tracking (punch-list 2).
 * Pick an exercise → chart its tracked metric over time + show the last PR.
 */
import { useEffect, useState } from "react";
import { api, type ExerciseDTO, type LogDTO, type PrDTO } from "@/lib/client";
import type { ProgressBy } from "@/lib/types";

function metricOf(log: LogDTO, goal: ProgressBy): number | null {
  if (goal === "weight") return log.weight;
  if (goal === "reps") return log.reps;
  if (goal === "time") return log.durationSeconds;
  return log.weight ?? log.reps ?? log.durationSeconds;
}

function metricLabel(goal: ProgressBy): string {
  return goal === "time" ? "seconds" : goal === "na" ? "value" : goal;
}

function Chart({ points }: { points: { x: number; y: number }[] }) {
  const W = 300;
  const H = 160;
  const pad = 16;
  if (points.length === 0) return <p className="muted">No history yet.</p>;
  const ys = points.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const n = points.length;
  const coords = points.map((p, i) => {
    const x = n === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1);
    const y = H - pad - ((p.y - min) / span) * (H - 2 * pad);
    return { x, y, v: p.y };
  });
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `M${coords[0].x},${H - pad} ` + coords.map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ") + ` L${coords[n - 1].x},${H - pad} Z`;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polyline points={`${pad},${H - pad} ${W - pad},${H - pad}`} stroke="#E7DEC9" strokeWidth="1" fill="none" />
      {n > 1 && <path d={area} fill="#E35336" fillOpacity="0.08" stroke="none" />}
      {n > 1 && <path d={path} fill="none" stroke="#E35336" strokeWidth="2.5" strokeLinejoin="round" />}
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3.5" fill="#A0522D" />
      ))}
      <text x={pad} y="12" fontSize="10" fill="#8C7A66">
        max {max}
      </text>
      <text x={pad} y={H - 2} fontSize="10" fill="#8C7A66">
        min {min}
      </text>
    </svg>
  );
}

export default function Progress() {
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [selected, setSelected] = useState<ExerciseDTO | null>(null);
  const [history, setHistory] = useState<LogDTO[]>([]);
  const [lastPr, setLastPr] = useState<{ completedAt?: string; prs?: PrDTO[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listExercises().then(setExercises).catch((e) => setError(e.message));
  }, []);

  async function select(ex: ExerciseDTO) {
    setSelected(ex);
    setHistory([]);
    setLastPr(null);
    try {
      const [h, pr] = await Promise.all([api.history(ex._id), api.lastPr(ex._id)]);
      setHistory(h);
      setLastPr(pr.prs ? pr : null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) return <p style={{ color: "var(--danger)" }}>{error}</p>;

  if (selected) {
    const goal = selected.progressBy;
    const points = history
      .map((l) => ({ x: new Date(l.performedAt).getTime(), y: metricOf(l, goal) }))
      .filter((p): p is { x: number; y: number } => p.y != null);
    return (
      <div>
        <button className="ghost sm" onClick={() => setSelected(null)}>
          ← All exercises
        </button>
        <h1 style={{ marginTop: "0.75rem" }}>{selected.name}</h1>
        <p className="muted" style={{ marginTop: "-0.6rem" }}>
          Progress in {metricLabel(goal)} over time
        </p>
        <Chart points={points} />

        <h2>Last personal best</h2>
        {lastPr?.prs?.length ? (
          <>
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              {lastPr.completedAt ? new Date(lastPr.completedAt).toLocaleDateString() : ""}
            </p>
            {lastPr.prs.map((pr, i) => (
              <div key={i} className="pr">
                <strong>{pr.category.replace(/_/g, " ")}</strong>
                <div>{pr.message}</div>
              </div>
            ))}
          </>
        ) : (
          <p className="muted">No PR recorded yet.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1>Progress Tracking</h1>
      <p className="muted" style={{ marginTop: "-0.6rem" }}>
        Pick an exercise to see its trend.
      </p>
      {exercises.map((ex) => (
        <button
          key={ex._id}
          className="card block row spread"
          style={{ height: "auto", textAlign: "left" }}
          onClick={() => select(ex)}
        >
          <span>
            <strong>{ex.name}</strong>
            <div className="muted" style={{ fontSize: "0.8rem" }}>
              {ex.muscleGroup ?? "—"} · goal: {ex.progressBy}
            </div>
          </span>
          <span aria-hidden>→</span>
        </button>
      ))}
    </div>
  );
}
