"use client";

/**
 * Readiness survey interstitial (spec §6.1) — shown before launching a workout.
 * Collects the 1–5 self-report that gates overload nudges and shapes wins.
 */
import { READINESS_MIN, READINESS_MAX } from "@/lib/constants";

const LABELS: Record<number, string> = {
  1: "Flare-up",
  2: "Rough",
  3: "Okay",
  4: "Good",
  5: "Great",
};

export function ReadinessModal({
  busy,
  onConfirm,
  onCancel,
}: {
  busy?: boolean;
  onConfirm: (readiness: number) => void;
  onCancel: () => void;
}) {
  const scores = Array.from(
    { length: READINESS_MAX - READINESS_MIN + 1 },
    (_, i) => READINESS_MIN + i,
  );
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h1>How are you feeling?</h1>
        <p className="muted" style={{ marginTop: "-0.6rem" }}>
          Sets the readiness for today&apos;s session.
        </p>
        <div className="col">
          {scores.map((r) => (
            <button key={r} className="navy block" disabled={busy} onClick={() => onConfirm(r)}>
              {r} · {LABELS[r]}
            </button>
          ))}
          <button className="ghost block" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
