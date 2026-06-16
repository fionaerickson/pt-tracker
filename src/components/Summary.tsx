"use client";

/** Celebration + summary (design spec §7.8 / build spec §6.5/§6.6). */
import Link from "next/link";
import type { WorkoutDTO } from "@/lib/client";
import { Icon } from "@/components/icons";

export function Summary({ workout }: { workout: WorkoutDTO }) {
  const s = workout.summary;
  const hardDayConsolation = s?.prs.find((p) => p.category === "hard_day_consolation");
  const realPrs = s?.prs.filter((p) => p.category !== "hard_day_consolation") ?? [];
  return (
    <div>
      <div className="celebrate">
        <Icon name="party" size={64} />
      </div>
      <h1 style={{ textAlign: "center" }}>Nice work!</h1>

      <div className="card" style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        <div>
          <div className="stat">{s?.setCount ?? 0}</div>
          <div className="caption">sets</div>
        </div>
        <div>
          <div className="stat">{s?.workoutsLast30Days ?? 0}</div>
          <div className="caption">workouts · 30 days</div>
        </div>
      </div>

      <h2>Personal bests</h2>
      {hardDayConsolation && (
        <div className="nudge">
          <Icon name="trophy" size={18} />
          <div>{hardDayConsolation.message}</div>
        </div>
      )}
      {!hardDayConsolation && realPrs.length === 0 && (
        <p className="muted">No PRs this session — still counts.</p>
      )}
      {realPrs.map((pr, i) => (
        <div key={i} className="pr">
          <div className="eyebrow">{pr.category.replace(/_/g, " ")}</div>
          <div className="row" style={{ gap: 8 }}>
            <Icon name="trophy" size={18} />
            <span>{pr.message}</span>
          </div>
        </div>
      ))}

      <Link href="/">
        <button className="primary block" style={{ marginTop: 16 }}>
          Back to Today
        </button>
      </Link>
    </div>
  );
}
