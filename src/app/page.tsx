"use client";

/**
 * Today / session entry — spec §6.1.
 * Resolves the open cart on load: resume (fresh), prompt (stale), or greet
 * (none → collect readiness 1–5 and start a workout, which creates the cart).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type SessionDTO } from "@/lib/client";
import { READINESS_MIN, READINESS_MAX, GREETING_THRESHOLD_HOURS } from "@/lib/constants";

const READINESS_LABELS: Record<number, string> = {
  1: "Flare-up",
  2: "Rough",
  3: "Okay",
  4: "Good",
  5: "Great",
};

export default function Today() {
  const router = useRouter();
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.session().then(setSession).catch((e) => setError(e.message));
  }, []);

  async function start(readiness: number) {
    setBusy(true);
    setError(null);
    try {
      await api.startWorkout(readiness);
      router.push("/workout");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (error) return <p className="danger">{error}</p>;
  if (!session) return <p className="muted">Loading…</p>;

  if (session.action === "resume" || session.action === "stale") {
    const started = new Date(session.workout.startedAt);
    return (
      <div>
        <h1>Session in progress</h1>
        <div className="card">
          <p>
            Started {started.toLocaleString()} · readiness{" "}
            <span className="pill">{session.workout.readinessScore}/5</span>
          </p>
          {session.action === "stale" && (
            <p className="muted">
              This cart is more than {GREETING_THRESHOLD_HOURS}h old. You can pick up where you
              left off (discarding it manually is a fast-follow).
            </p>
          )}
          <button className="primary" onClick={() => router.push("/workout")}>
            Continue session →
          </button>
        </div>
      </div>
    );
  }

  // Greeting — collect readiness.
  return (
    <div>
      <h1>How are you feeling today?</h1>
      <p className="muted">Your readiness gates overload nudges and shapes today&apos;s wins.</p>
      <div className="card">
        <div className="row">
          {Array.from({ length: READINESS_MAX - READINESS_MIN + 1 }, (_, i) => READINESS_MIN + i).map(
            (r) => (
              <button key={r} className="primary" disabled={busy} onClick={() => start(r)}>
                {r} · {READINESS_LABELS[r]}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
