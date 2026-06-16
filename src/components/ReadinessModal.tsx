"use client";

/**
 * Readiness sheet (design spec §7.3 / build spec §6.1) — shown before a workout
 * starts via any of the three paths (Launch, Plan, Saved). Neutral segments with
 * a coral selected state; coral reads as energy, not as a "bad" score.
 */
import { useState } from "react";
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
  const [sel, setSel] = useState<number | null>(null);
  const scores = Array.from(
    { length: READINESS_MAX - READINESS_MIN + 1 },
    (_, i) => READINESS_MIN + i,
  );
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h1 style={{ marginBottom: 2 }}>How are you feeling?</h1>
        <p className="caption" style={{ marginTop: 0 }}>
          Sets today&apos;s readiness.
        </p>
        <div className="col" style={{ marginTop: 12 }}>
          {scores.map((r) => (
            <div
              key={r}
              className={`seg ${sel === r ? "sel" : ""}`}
              style={{ justifyContent: "flex-start", paddingLeft: 16 }}
              onClick={() => {
                if (busy) return;
                setSel(r);
                onConfirm(r);
              }}
            >
              <strong style={{ marginRight: 10 }}>{r}</strong> {LABELS[r]}
            </div>
          ))}
          <button className="ghost block" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
