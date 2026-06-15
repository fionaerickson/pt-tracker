# PT & Gym Recovery Tracker

A web app for tracking physical therapy and gym sessions: a personal exercise
bank, fast in-session logging with adaptive prefills and progressive-overload
nudges, and a finish-of-session celebration with personal bests.

This repository is scaffolded directly against the build spec
(`pt-recovery-tracker-spec.md`), section 8's build order. The three pieces of
real business logic live as pure, unit-tested functions in `src/lib/logic`.

## Stack

- **Next.js** (App Router) — one codebase for API routes + UI (spec §1).
- **MongoDB** via the official driver (spec §1).
- **TypeScript** throughout; **Vitest** for the logic unit tests.

## Getting started

Pick a database, then run the app. `npm test` runs the logic suite with no
database at all.

### Option A — zero setup (in-memory Mongo)

Boots a throwaway MongoDB, creates indexes, seeds sample data, and starts the
app in one command. Nothing to install, data is ephemeral. Requires outbound
access to MongoDB's binary download host on first run.

```bash
npm install
npm run dev:memory              # http://localhost:3000 (seeded)
```

### Option B — local Docker Mongo (persistent)

```bash
npm install
docker compose up -d            # MongoDB on localhost:27017
cp .env.example .env            # set MONGODB_URI="mongodb://localhost:27017"
npm run setup:indexes           # create the §5 indexes (idempotent)
npm run seed                    # optional: sample bank + history
npm run dev                     # http://localhost:3000
```

### Option C — MongoDB Atlas

Same as B, but set `MONGODB_URI` in `.env` to your Atlas connection string
(free tier is plenty for one user), then `npm run setup:indexes` and `npm run dev`.

### Sample data

`npm run seed` (and `dev:memory`) loads five exercises plus ~10 days of history,
arranged so the **overload nudge fires on Bulgarian Split Squat** (held at 30 lb
across ready sessions) and the rolling 30-day count is non-zero.

### Visual preview

`docs/preview.html` is a static, self-contained mock of every screen — open it
in a browser to review layout/styling without running anything.

## Build-order map (spec §8 → code)

| Step | Spec | Code |
|------|------|------|
| 1. Collections + indexes | §4, §5 | `src/lib/types.ts`, `scripts/setupIndexes.ts` |
| 2. Exercise bank + search/filter | §6.7 | `src/lib/db/exercises.ts`, `api/exercises` |
| 3. Session lifecycle + greeting | §6.1 | `src/lib/db/workouts.ts` (`resolveSession`), `api/session`, `api/workouts` |
| 4. Logging: adaptive prefill + cart | §6.2, §6.4 | `src/lib/logic/prefill.ts`, `src/lib/db/logs.ts`, `api/exercises/:id/prefill`, `api/workouts/:id/logs` |
| 5. Progressive overload check | §6.3 | `src/lib/logic/overload.ts` |
| 6. Complete workout + PR cascade | §6.5, §6.6 | `src/lib/logic/prCascade.ts`, `completeWorkout`, `api/workouts/:id/complete` |
| 7. Stats + retrospective PR lookups | §6.8 | `rollingWorkoutCount`, `lastPrOnExercise`, `api/stats`, `api/exercises/:id/last-pr` |

## The three logic blocks (pure & verifiable)

Each is a pure function taking already-queried data so it can be unit-tested
without a database:

- **`checkOverload`** (§6.3) — two gates + stagnation test. `tests/overload.test.ts`
  encodes the spec's worked-example table verbatim.
- **`computePrefill`** (§6.2) — branches A (overload) / B (recent) / C (cold start).
- **`computePrs`** (§6.6) — the tier 1–5 cascade with both confirmed decisions baked
  in (new_max_weight = strictly heavier all-time; hard_day_consolation is a
  fallback that never co-appears with real PRs).

```bash
npm test   # 19 tests across the three logic blocks
```

## API surface

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/exercises` | list (filters: `equipment,tags,name,recency`) / create |
| GET/PATCH | `/api/exercises/:id` | read / edit |
| GET | `/api/exercises/:id/prefill` | adaptive prefill + overload nudge |
| GET | `/api/exercises/:id/last-pr` | last PR on this exercise |
| GET | `/api/session` | resolve app-open (`resume` / `stale` / `greet`) |
| POST | `/api/workouts` | start the cart from a readiness score |
| GET | `/api/workouts/current` | the open cart, if any |
| GET | `/api/workouts/:id` | read a workout + summary |
| GET/POST | `/api/workouts/:id/logs` | cart contents / add a row |
| POST | `/api/workouts/:id/complete` | finish: summary + PR cascade |
| PATCH/DELETE | `/api/logs/:id` | edit (incl. `rounds` quantity) / remove |
| GET | `/api/stats` | rolling 30-day completed-workout count |

## Open decisions (spec §7)

Safe defaults are implemented so the build is unblocked:

- **Stale in-progress cart** older than the greeting threshold → `resolveSession`
  returns `action: "stale"` and leaves the cart intact (resume; user discards
  manually).
- **`perceivedDifficulty`** is captured on logs but not yet wired into the
  overload check.
- **Progress-over-time view** is a fast-follow; the `logs` collection and hero
  index already support the query.

## Not yet built

This is a backend + logic scaffold. The front-end screens (greeting, bank
browser, logging screen, celebration/summary) are stubbed by the index page and
build on top of the documented API routes.
