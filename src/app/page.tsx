"use client";

/**
 * Today — landing hub (spec §6.1 + punch-list 2/3).
 * Resumes an in-progress session if one exists, and links to Plan Workout and
 * Progress Tracking.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type WorkoutDTO } from "@/lib/client";

export default function Today() {
  const [cart, setCart] = useState<WorkoutDTO | null>(null);
  const [stats, setStats] = useState<{ workoutsLast30Days: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([api.currentCart(), api.stats().catch(() => null)])
      .then(([c, s]) => {
        setCart(c);
        setStats(s);
      })
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div>
      <h1>Today</h1>

      {loaded && cart && (
        <Link href="/today">
          <button className="primary block hero-btn">
            <span className="big">Resume today&apos;s workout →</span>
            <span className="sub">Readiness {cart.readinessScore}/5 · in progress</span>
          </button>
        </Link>
      )}

      <div className="col" style={{ marginTop: cart ? "0.75rem" : 0 }}>
        <Link href="/plan">
          <button className="navy block hero-btn">
            <span className="big">📋 Plan Workout</span>
            <span className="sub">Build a session or launch a saved one</span>
          </button>
        </Link>
        <Link href="/progress">
          <button className="block hero-btn">
            <span className="big">📈 Progress Tracking</span>
            <span className="sub">Charts &amp; personal bests by exercise</span>
          </button>
        </Link>
      </div>

      {stats && (
        <div className="card" style={{ marginTop: "1rem", textAlign: "center" }}>
          <strong style={{ fontSize: "1.6rem" }}>{stats.workoutsLast30Days}</strong>
          <div className="muted">workouts in the last 30 days</div>
        </div>
      )}
    </div>
  );
}
