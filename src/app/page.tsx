/**
 * Landing page — a scaffold home that documents the API surface mapped to the
 * spec's build order (§8). The screens (greeting, bank, logging, summary) layer
 * on top of these routes; this page is a placeholder index, not the final UI.
 */
const buildOrder: { step: string; spec: string; routes: string[] }[] = [
  { step: "1. Collections + indexes", spec: "§5", routes: ["npm run setup:indexes"] },
  {
    step: "2. Exercise bank: create/edit, search/filter",
    spec: "§6.7",
    routes: ["GET/POST /api/exercises", "GET/PATCH /api/exercises/:id"],
  },
  {
    step: "3. Session lifecycle + greeting",
    spec: "§6.1",
    routes: ["GET /api/session", "POST /api/workouts", "GET /api/workouts/current"],
  },
  {
    step: "4. Logging: adaptive prefill + cart ops",
    spec: "§6.2 / §6.4",
    routes: [
      "GET /api/exercises/:id/prefill",
      "GET/POST /api/workouts/:id/logs",
      "PATCH/DELETE /api/logs/:id",
    ],
  },
  { step: "5. Progressive overload check", spec: "§6.3", routes: ["(inside prefill)"] },
  {
    step: "6. Complete workout + PR cascade",
    spec: "§6.5 / §6.6",
    routes: ["POST /api/workouts/:id/complete"],
  },
  {
    step: "7. Stats + retrospective PR lookups",
    spec: "§6.8",
    routes: ["GET /api/stats", "GET /api/exercises/:id/last-pr"],
  },
];

export default function Home() {
  return (
    <div>
      <h1>PT &amp; Gym Recovery Tracker</h1>
      <p style={{ color: "#9aa3ad" }}>
        Scaffold against spec §8. Business logic (§6.2/§6.3/§6.6) lives in{" "}
        <code>src/lib/logic</code> as pure, unit-tested functions.
      </p>
      <ol>
        {buildOrder.map((b) => (
          <li key={b.step} style={{ marginBottom: "0.75rem" }}>
            <strong>{b.step}</strong> <span style={{ color: "#6b7280" }}>({b.spec})</span>
            <ul>
              {b.routes.map((r) => (
                <li key={r}>
                  <code>{r}</code>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
