# PT & Gym Recovery Tracker — Build Spec

A web application that helps a user recovering from an injury track their physical therapy and gym sessions. The user builds a personal bank of exercises, logs sessions quickly while moving around the gym, gets adaptive prefills and progressive-overload nudges based on recent history, and finishes each session with a celebration and a short summary of personal bests.

This document is the implementation contract: data model, indexes, and the three pieces of business logic that define the product. It is written to be handed directly to Claude Code.

---

## 1. Recommended stack

- **Database:** MongoDB Atlas (free tier is sufficient for a single user).
- **App:** Next.js (App Router), one codebase for API routes and UI, deploys to Vercel.
- **Data access:** Official MongoDB driver, or Mongoose if an ODM is preferred. Schemas below are language-agnostic and map cleanly to either.

MERN (separate Express API + React SPA) is a valid alternative if preferred. Nothing in the data model depends on the stack choice.

---

## 2. Core concepts

- **Exercise:** a reusable template in the user's bank (set up once, performed many times).
- **Workout:** a single session. While in progress it **is the cart**. Completing it stamps a finish time and computes the summary. There is at most one in-progress workout per user at a time.
- **Log:** one performed line item (an exercise at a weight/reps/time, done for a number of rounds). Logs reference their workout and exercise. Logs are the source of truth for all history and analytics.
- **Greeting / readiness:** a 1 to 5 self-report captured when a new session starts. It is stored on the workout and copied onto every log in that session.

---

## 3. Constants (keep these tunable)

```
ADAPTIVE_WINDOW_DAYS        = 14   // recency window for prefill, overload, variation win
ROLLING_STATS_DAYS          = 30   // window for the rolling workout count
GREETING_THRESHOLD_HOURS    = 12   // gap that triggers a fresh greeting
READINESS_MIN / MAX         = 1 / 5
DIFFICULTY_MIN / MAX        = 1 / 5
OVERLOAD_READINESS_FLOOR    = 3    // logs below this are excluded from overload comparison
OVERLOAD_MIN_QUALIFYING     = 2    // need at least this many qualifying logs to detect stagnation
MAX_PRS                     = 3    // cap on summary PRs shown per workout
```

---

## 4. Data model

Four collections: `users`, `exercises`, `workouts`, `logs`. `users` may be thin or absent if an auth provider owns identity; every other document carries `userId` for scoping.

### exercises (the bank)

```js
{
  _id,
  userId,
  name: "Bulgarian Split Squat",      // string
  tags: ["legs", "unilateral", "rehab"], // string[], filterable
  equipment: ["dumbbell", "bench"],    // string[], filterable
  hasWeight: true,                     // bool, controls whether weight fields show
  progressBy: "weight",                // "weight" | "reps" | "time" — metric overload watches
  defaultWeight: 25,                   // number | null, suggested entry when no recent log
  defaultUnit: "lb",                   // string
  usualRepRange: { min: 8, max: 12 },  // suggested entry when no recent log
  lastPerformedAt: ISODate,            // Date | null, DENORMALIZED for recency filter
  createdAt, updatedAt
}
```

### workouts (the session; in_progress is the cart)

```js
{
  _id,
  userId,
  status: "in_progress",               // "in_progress" | "completed"
  readinessScore: 4,                   // 1–5, set at creation from the greeting
  startedAt: ISODate,
  completedAt: null,                   // Date | null
  summary: null,                       // null until completion, then:
  // summary: {
  //   setCount: 9,                     // sum of rounds across logs
  //   workoutsLast30Days: 7,           // snapshot of the rolling count at completion
  //   prs: [ /* PR objects, see 6.6 */ ]
  // }
  createdAt, updatedAt
}
```

### logs (one per performed line item / cart row)

```js
{
  _id,
  userId,
  workoutId,
  exerciseId,
  exerciseName: "Bulgarian Split Squat", // DENORMALIZED for display without a join
  weight: 25,                          // number | null
  unit: "lb",                          // string | null
  reps: 10,                            // number | null
  durationSeconds: null,               // number | null
  rounds: 3,                           // number, default 1 — the cart "quantity"
  perceivedDifficulty: 3,              // 1–5 | null, optional, log-level
  readinessScore: 4,                   // 1–5, DENORMALIZED from the parent workout
  performedAt: ISODate,
  createdAt
}
```

**Denormalization is deliberate in three places:** `exercise.lastPerformedAt`, `log.exerciseName`, and `log.readinessScore`. The first two avoid joins on the hottest reads; the third is what makes the readiness-filtered overload check a single-collection query. `readinessScore` on a log never drifts because readiness is fixed at session start.

---

## 5. Indexes

```
exercises:  { userId: 1, lastPerformedAt: -1 }
exercises:  { userId: 1, equipment: 1 }                       // multikey
exercises:  { userId: 1, tags: 1 }                            // multikey

logs:       { userId: 1, exerciseId: 1, performedAt: -1 }     // HERO index

workouts:   { userId: 1, status: 1 }                          // find the open cart
workouts:   { userId: 1, status: 1, completedAt: -1 }         // 30-day rolling count
workouts:   { userId: 1, "summary.prs.exerciseId": 1, completedAt: -1 } // last PR on exercise X
```

The hero logs index serves the single most frequent read (a selected exercise's recent history) and powers both the adaptive prefill and the overload check.

---

## 6. Business logic

### 6.1 Session lifecycle and greeting

On app open:

1. Find `currentCart` = the workout where `userId` matches and `status = "in_progress"` (at most one).
2. If `currentCart` exists and `startedAt` is within `GREETING_THRESHOLD_HOURS` → resume it silently.
3. If `currentCart` exists but is older than the threshold → prompt to resume or discard (see Open Decisions; default is resume).
4. If no `currentCart` → show the greeting, collect `readinessScore` (1–5), and create a new workout with `status = "in_progress"`, `startedAt = now`, and that score. **Creating this workout is what starts the cart.**

### 6.2 Adaptive logging screen (per exercise tap)

Run one query: logs for `userId + exerciseId` where `performedAt >= now - ADAPTIVE_WINDOW_DAYS`, sorted `performedAt` descending. Then branch:

- **Branch A — overload nudge.** If the overload check (6.3) returns a stagnant metric → show the "time for progressive overload" message for that metric, prefill the `progressBy` field with the stagnant value, and prefill remaining fields from the most recent log.
- **Branch B — recent prefill.** Else if any logs exist in the window → prefill all fields from the most recent log, fully editable.
- **Branch C — cold start.** Else → prefill from the exercise's `defaultWeight` and `usualRepRange`, or leave blank.

### 6.3 Progressive overload check

Two gates plus a stagnation test:

1. **Current-session gate:** if the active workout's `readinessScore` is 1 or 2, return nothing. No nudge ever shows on a flare-up day.
2. **History filter:** from the windowed logs for this exercise, keep only those with `readinessScore >= OVERLOAD_READINESS_FLOOR` (3+). Low-readiness sessions are excluded from the comparison entirely.
3. **Stagnation test:** if `>= OVERLOAD_MIN_QUALIFYING` qualifying logs remain and the value of the exercise's `progressBy` metric (weight, reps, or durationSeconds) is identical across all of them → return that metric and value as the nudge.

Worked example (next session opened at readiness 3+, `progressBy = "weight"`):

| Log | Readiness | Weight | Qualifies? |
|-----|-----------|--------|-----------|
| 1   | 4         | 30     | yes       |
| 2   | 3         | 30     | yes       |
| 3   | 2         | 15     | no (low readiness) |
| 4   | 3         | 30     | yes       |

Three qualifying logs, all 30 lbs, weight unchanged → nudge fires. The 15 lb dip is excluded on readiness, not on weight.

### 6.4 Cart operations

The cart is the set of logs where `workoutId = currentCart._id`.

- **Add a log:** create a log tied to the current workout, `performedAt = now`, `rounds = 1`, with denormalized `exerciseName` and `readinessScore`.
- **Change quantity:** update `rounds` on a cart log (adding rounds of the same weight/rep combo).
- **Edit / remove:** update or delete a cart log.

### 6.5 Complete workout

1. Set `status = "completed"`, `completedAt = now`.
2. Compute `summary.setCount` = sum of `rounds` across the workout's logs.
3. Compute `summary.workoutsLast30Days` = count of workouts where `status = "completed"` and `completedAt >= now - ROLLING_STATS_DAYS`.
4. Run the PR cascade (6.6) and write `summary.prs`.
5. Update `lastPerformedAt = now` on every exercise performed in the session.
6. Frontend plays the celebration animation, then shows the summary: rolling count and the PRs.

### 6.6 PR / novelty cascade

All comparisons are against the user's history **prior to this workout** (logs from other workouts). For each exercise, evaluate the best value produced this session.

```
candidates = []

for each exercise performed this workout:
  if exercise.hasWeight:
    if sessionMaxWeight > allTimeMaxWeight(exercise):        -> tier 1: new_max_weight
    elif repsAtWeight > priorBestRepsAtSameWeight:           -> tier 3: rep_pr_at_weight
        // only when that exact weight has prior history to beat
  else: // unweighted
    if sessionMaxReps > allTimeMaxReps OR
       sessionMaxTime > allTimeMaxTime:                      -> tier 2: new_max_reps_or_time

for each exercise performed this workout:
  if not performed in the prior ADAPTIVE_WINDOW_DAYS:        -> tier 5: variation_win

prs = candidates.sortByTierAscending().take(MAX_PRS)

// consolation is a true fallback: only when no real PR surfaced AND it was a hard day
if prs is empty and workout.readinessScore in {1, 2}:
  prs = [ tier 4: hard_day_consolation ]
```

Confirmed decisions baked in above:

- **`new_max_weight` means a new all-time maximum weight** (heavier than ever, even at 1 rep). A novel-but-lighter weight does not trigger a PR.
- **`hard_day_consolation` is a fallback only**, shown when tiers 1 to 3 produced nothing and readiness was 1 or 2. It does not co-appear with real PRs.

PR object shape (written into `summary.prs`):

```js
{
  category: "new_max_weight",   // new_max_weight | new_max_reps_or_time | rep_pr_at_weight
                                //  | hard_day_consolation | variation_win
  exerciseId,                   // null for hard_day_consolation (workout-level)
  exerciseName,                 // null for hard_day_consolation
  weight, unit,                 // present for weight-based PRs
  reps,                         // present for rep-based PRs
  durationSeconds,              // present for time-based PRs
  message                       // display string
}
```

Because PRs live on the workout, "when did I last PR on exercise X" is one indexed lookup: workouts where `summary.prs.exerciseId = X`, sorted `completedAt` descending, limit 1.

### 6.7 Search and filter the bank

Query `exercises` for the user with optional filters:

- **Equipment / tags:** multikey match.
- **Name:** text match.
- **Recency:** "done recently" = `lastPerformedAt >= now - ADAPTIVE_WINDOW_DAYS`; "not done recently" = `lastPerformedAt < now - ADAPTIVE_WINDOW_DAYS` or `null`.

### 6.8 Stats reads

- **Rolling workout count:** count completed workouts with `completedAt >= now - ROLLING_STATS_DAYS`.
- **Last PR on an exercise:** the indexed `summary.prs.exerciseId` lookup above.

---

## 7. Open decisions (defaults chosen so the build is not blocked)

- **Stale in-progress cart** older than the greeting threshold: default behavior is to resume and let the user discard manually. Could instead auto-complete or auto-discard.
- **Progress-over-time view:** the logs collection fully supports a per-exercise trend (query by exercise, ordered by `performedAt`), but the exact visualization is not yet specified. Treat as a fast-follow, not part of the first build.
- **`perceivedDifficulty` consumers:** collected now, not yet wired into any logic. Natural future use is to suppress overload nudges when recent qualifying logs carried high difficulty, even if the metric is stagnant. Capture now, wire later.

---

## 8. Suggested build order

1. Atlas project, connection, and the four collections with indexes from section 5.
2. Exercise bank: create/edit, plus search and filter (6.7).
3. Session lifecycle and greeting (6.1), creating the in-progress cart.
4. Logging screen with adaptive prefill (6.2) and cart operations (6.4).
5. Progressive overload check (6.3), validated against the worked example.
6. Complete-workout flow (6.5), PR cascade (6.6), celebration, and summary.
7. Stats and retrospective PR lookups (6.8).
