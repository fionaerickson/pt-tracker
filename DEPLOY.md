# Stand up the POC (no developer experience needed)

Goal: a private web link you open on your phone's browser. You'll use three free
tools — your code on **GitHub**, your database on **MongoDB Atlas**, and hosting
on **Vercel**. Plan ~15 minutes. No terminal required.

---

## Step 1 — Open up your Atlas database

1. Sign in at **cloud.mongodb.com**.
2. Left sidebar → **Network Access** → **Add IP Address** → **Allow access from
   anywhere** (`0.0.0.0/0`) → **Confirm**. (This is fine for a personal POC; we
   can lock it down later.)
3. Left sidebar → **Database** → **Connect** on your cluster → **Drivers** →
   copy the **connection string**. It looks like:
   `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/?...`
   - If it shows `<password>`, replace that with your database user's real
     password. Keep this string handy for Step 3.

---

## Step 2 — Get the code onto your main branch

The app currently lives on a working branch. On **github.com/fionaerickson/pt-tracker**:

1. You'll see a banner for the branch `claude/youthful-knuth-mg7gqw` →
   **Compare & pull request**.
2. Click **Create pull request**, then **Merge pull request** → **Confirm merge**.

That moves everything onto `main`, which Vercel will deploy. (If you'd rather not
merge, you can instead pick this branch as the Production Branch in Vercel's
settings — but merging is simplest.)

---

## Step 3 — Deploy on Vercel

1. Go to **vercel.com** → **Sign Up** → **Continue with GitHub**.
2. **Add New… → Project** → **Import** `fionaerickson/pt-tracker`.
3. Vercel auto-detects **Next.js** — leave the build settings as-is.
4. Expand **Environment Variables** and add three:
   | Name | Value |
   |------|-------|
   | `MONGODB_URI` | the connection string from Step 1 |
   | `MONGODB_DB` | `pt_tracker` |
   | `DEFAULT_USER_ID` | `me` (any word — it's just your single-user id) |
5. Click **Deploy** and wait ~1–2 minutes for "Congratulations".
6. Note your live URL, e.g. `https://pt-tracker-xxxx.vercel.app`.

---

## Step 4 — Initialize the database (one visit)

In your browser, open this once (your URL + `/api/init?seed=1`):

```
https://pt-tracker-xxxx.vercel.app/api/init?seed=1
```

You should see a line of text like
`{"indexes":"ready","seeded":{"exercises":5,...}}`. That created the database
indexes and loaded sample exercises + history so the app isn't empty.

- Want to start empty instead? Use `/api/init` (without `?seed=1`).
- Re-visiting `?seed=1` resets the sample data — don't use it once you've logged
  real workouts.

---

## Step 5 — Use it on your phone

1. Open your URL (e.g. `https://pt-tracker-xxxx.vercel.app`) in your phone's
   browser.
2. **Add to Home Screen** (Safari: Share → Add to Home Screen; Chrome: ⋮ → Add to
   Home screen) so it opens full-screen like an app.
3. Try it: **Launch workout** → pick a readiness → search an exercise → log a set.
   Open **Bulgarian Split Squat** to see the progressive-overload nudge.

---

## Good to know

- **It's single-user and unauthenticated.** Anyone with the URL can use it, so
  treat the link as private. Real logins are a later step.
- **Rotate your database password.** It was shared in plain text during setup;
  in Atlas → Database Access, edit the user and set a new password, then update
  `MONGODB_URI` in Vercel → Settings → Environment Variables → Redeploy.
- **Updating the app later:** any new commit merged to `main` auto-deploys.

## If something's off

- **`/api/init` shows a MONGODB_URI error** → the env var isn't set in Vercel.
  Project → Settings → Environment Variables → add it → Deployments → Redeploy.
- **Page hangs / "Server selection timed out"** → Atlas Network Access isn't
  allowing `0.0.0.0/0` (Step 1.2).
- **Blank screen** → Vercel → your project → latest deployment → **Logs** to see
  the error.
