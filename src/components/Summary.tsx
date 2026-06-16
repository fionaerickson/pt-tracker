"use client";

/** Celebration + summary (spec §6.5/§6.6). */
import Link from "next/link";
import type { WorkoutDTO } from "@/lib/client";

export function Summary({ workout }: { workout: WorkoutDTO }) {
  const s = workout.summary;
  return (
    <div>
      <div className="celebrate">🎉</div>
      <h1 style={{ textAlign: "center" }}>Nice work!</h1>
      <div className="card" style={{ textAlign: "center" }}>
        <p>
          <strong>{s?.setCount ?? 0}</strong> sets logged
          <br />
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
      <Link href="/">
        <button className="primary block" style={{ marginTop: "1rem" }}>
          Back to Today
        </button>
      </Link>
    </div>
  );
}
