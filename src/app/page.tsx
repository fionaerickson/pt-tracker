"use client";

/**
 * Today — landing hub (design spec §7.1 / punch-list 3).
 * If a session started within SESSION_TTL is active → "Resume workout".
 * Otherwise → "Launch workout" (ad-hoc session), opening the readiness sheet.
 * Plan Workout and Saved Workouts are the other two start paths.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type WorkoutDTO } from "@/lib/client";
import { ReadinessModal } from "@/components/ReadinessModal";
import { Icon } from "@/components/icons";

export default function Today() {
  const router = useRouter();
  const [cart, setCart] = useState<WorkoutDTO | null>(null);
  const [setsIn, setSetsIn] = useState(0);
  const [stats, setStats] = useState<{ workoutsLast30Days: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, s] = await Promise.all([api.currentCart(), api.stats().catch(() => null)]);
        setCart(c);
        setStats(s);
        if (c) {
          const logs = await api.cartLogs(c._id);
          setSetsIn(logs.reduce((n, l) => n + l.rounds, 0));
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function launch(readiness: number) {
    setBusy(true);
    setError(null);
    try {
      await api.startWorkout(readiness, []);
      router.push("/today");
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("already in progress")) router.push("/today");
      else {
        setError(msg);
        setBusy(false);
        setLaunching(false);
      }
    }
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <h1 style={{ marginBottom: 2 }}>Today</h1>
      <p className="caption">{today}</p>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      {loaded && cart ? (
        <Link href="/today">
          <button className="primary block hero">
            <span className="big">Resume workout</span>
            <span className="sub">
              Readiness {cart.readinessScore}/5 · {setsIn} {setsIn === 1 ? "set" : "sets"} in
            </span>
          </button>
        </Link>
      ) : (
        <button className="primary block hero" disabled={!loaded} onClick={() => setLaunching(true)}>
          <span className="big">Launch workout</span>
          <span className="sub">Start logging right away</span>
        </button>
      )}

      <div className="col" style={{ marginTop: 10 }}>
        <Link href="/plan">
          <button className="secondary block" style={{ justifyContent: "flex-start", gap: 10 }}>
            <Icon name="clipboard" /> Plan a workout
          </button>
        </Link>
        <Link href="/progress">
          <button className="secondary block" style={{ justifyContent: "flex-start", gap: 10 }}>
            <Icon name="trending" /> Progress
          </button>
        </Link>
      </div>

      {stats && (
        <div className="statblock" style={{ marginTop: 16 }}>
          <div className="stat">{stats.workoutsLast30Days}</div>
          <div className="label">workouts · last 30 days</div>
        </div>
      )}

      {launching && (
        <ReadinessModal busy={busy} onConfirm={launch} onCancel={() => setLaunching(false)} />
      )}
    </div>
  );
}
