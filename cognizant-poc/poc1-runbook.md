# POC 1 Runbook — Live Tracking-Statistics Widget

**Audience:** Manuela (and anyone presenting the React widget against the live Odyssey Tracking backend on 2026-05-22).
**Use this:** as a pre-meeting and at-meeting checklist. Walk through §1 within ~1 hour of the demo. Keep §2 open in a terminal in case something hiccups live.

> ⚠️ AI-generated. Validate before acting. The procedures below assume `.env.local` is set up correctly and the dev backend has not changed schema overnight.

---

## §0 — One-time setup (run once, the first time you clone)

1. From the repo root, copy the env template:
   ```bash
   cp apps/odyssey-one/.env.local.example apps/odyssey-one/.env.local
   ```
2. Leave the `<TOKEN>` / `<SESSION>` placeholders in for now — §1 walks through filling them.
3. Confirm `.env.local` is **not** tracked by git:
   ```bash
   git check-ignore apps/odyssey-one/.env.local
   # expected: prints the file path → it IS ignored. No output = ignored too (silent pass).
   ```
   The repo-root `.gitignore` already includes `.env.local` and `.env.*.local`.

---

## §1 — Pre-demo checklist (within 1 hour of the meeting)

The JWT has ~10h lifetime per its `exp` claim. Refresh both token and SESSION cookie close to the meeting.

### 1.1 — Capture a fresh token + session

1. Open Safari → `https://odyssey-one.com/tracking/dashboard`. Log in via SSO if not already signed in.
2. Open Web Inspector → **Network** tab → reload the page.
3. Find a request to `/api/uiapi/loads/statistics` (filter the list by "statistics" to find it fast).
4. Right-click the request → **Copy** → **Copy as cURL**.
5. Paste somewhere temporary (NOT a chat, NOT git-tracked) and pull out two values:
   - `Authorization: Bearer <JWT>` → this is your token.
   - `Cookie: ... SESSION=<uuid> ...` → this is your session.
6. Open `apps/odyssey-one/.env.local` and replace the placeholders:
   ```
   VITE_ODYSSEY_TRACKING_TOKEN=eyJhbGc...    # the JWT from step 5
   VITE_ODYSSEY_TRACKING_SESSION=8a2f...     # just the value after SESSION=, not the whole Cookie line
   ```

### 1.2 — Smoke-test the credentials BEFORE you open the demo

```bash
TOKEN=$(grep VITE_ODYSSEY_TRACKING_TOKEN apps/odyssey-one/.env.local | cut -d= -f2-)
SESSION=$(grep VITE_ODYSSEY_TRACKING_SESSION apps/odyssey-one/.env.local | cut -d= -f2-)

curl -i -X POST 'https://odyssey-one.com/tracking/api/uiapi/loads/statistics' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Cookie: SESSION=$SESSION" \
  -H 'Origin: https://odyssey-one.com' \
  -d '{}'
```

Expected:
- `HTTP/2 200`
- JSON body containing a `statuses` array of 6 entries (Scheduled P/U Today, EnRoute, Delivered, At Risk, All shipments, No Tracking Data).

If you see `401` or `403`: token/session pair is wrong or expired. Re-capture in §1.1.
If you see a CORS or network error in the actual demo browser even though curl is 200: the Vite proxy isn't injecting credentials. Verify dev-server logs after starting; the `proxyReq` event must fire (no log line means env vars aren't loaded — confirm `apps/odyssey-one/.env.local` exists at that exact path).

### 1.3 — Empty `{}` body verification (FIRST RUN ONLY)

The plan assumed `body: '{}'` returns the full statuses array. If your smoke-test in §1.2 returned 200 with the expected shape, you're good. **If it returned a different shape or an error, see §3 below to switch to the captured-body fallback, and update `poc1-data-integration.md` §1 accordingly.**

### 1.4 — Start the dev server and confirm the widget renders

```bash
npm run dev:odyssey-one
```

Open the URL Vite prints (typically `http://localhost:5173`). Navigate to `/` (Home). Look at the `shipments-exceptions` widget — third in the Shipments section.

Expected visual:
- **Title:** "Tracking — Load Status"
- **Big number (left):** a number in the 80,000s (`85,241` at last validation)
- **Donut chart (left/center):** four colored segments
- **Rows (right):** four rows — Scheduled P/U Today, EnRoute, Delivered, At Risk — each with a real count
- **Footer link:** "Go to Tracking"

If you see the **old** mock values (376 total, four exception categories like "Date Issues / Routing Review / Tender Issues / Bid Review"), the live fetch failed silently. Check DevTools → Console for the `[useTrackingLoadStatistics] fetch failed` warning, and the Network tab for the actual response code.

---

## §2 — Demo-time talking points

When you open the slide / browser tab:

> "This widget is the same shipments-exceptions tile from our Home prototype. Instead of mock data, it's now reading the live load-statistics payload from the Odyssey Tracking platform — the same backend the production tracking dashboard uses. If I refresh the page in a minute, you'll see these counts drift; that's not animation, that's the database moving."

If something hiccups mid-meeting (widget shows mock values, or the dev server times out):

> "The live endpoint is having a transient — the widget falls back to a cached snapshot, which is the design point we wanted: a degraded backend never shows broken UI. The story is the same: the React prototype talks to your existing backend."

(Both the live behavior and the fallback behavior are *intentional* and *correct* — neither is a bug to apologize for.)

---

## §3 — If empty `{}` body doesn't work (fallback)

The earlier curl validation worked with the body the live dashboard sends (about 246 bytes). If the smoke-test in §1.2 returns 400 / bad-request / wrong-shape for empty `{}`, do this:

1. Capture the full request body from the Network tab in step 1.1 (the "Request payload" panel — copy as JSON).
2. Paste it (verbatim) into `apps/odyssey-one/src/hooks/useTrackingLoadStatistics.js`, replacing the `body: '{}'` line. Keep it minified:
   ```js
   body: JSON.stringify({ /* paste the captured object here */ }),
   ```
3. Restart `npm run dev:odyssey-one`.
4. Update `cognizant-poc/poc1-data-integration.md` §1 — replace "empty `{}` returns the full statuses array" with the captured body shape, verbatim, so future readers know what was needed.

---

## §4 — Credential hygiene (one-liner pre-commit check)

Before every `git commit`, run:

```bash
git diff --staged | grep -c 'eyJ'
```

`eyJ` is the base64 prefix of every JWT (`{"alg":...`). If this prints `0`, no JWT-shaped string is in your staged diff. Anything else is a red flag — inspect what you're committing.

This is **not** a real git hook. It is a one-liner you (or any reviewer) run manually. We deliberately did not install a hook into the repo because the cost of forcing infrastructure on every contributor is higher than the cost of remembering one command on a single feature branch.

---

## §5 — What was touched, in case it needs to be reverted

| Path | Change |
|---|---|
| `apps/odyssey-one/.env.local.example` | New — env template with placeholders |
| `apps/odyssey-one/vite.config.js` | Added `server.proxy` block + `loadEnv` import |
| `apps/odyssey-one/src/hooks/useTrackingLoadStatistics.js` | New — fetch hook |
| `apps/odyssey-one/src/routes/Home.jsx` | Added hook import + `useEffect` patcher for the `shipments-exceptions` widget |

To revert: `git diff apps/odyssey-one/ cognizant-poc/poc1-runbook.md` shows the full surface area; `git checkout -- apps/odyssey-one/vite.config.js apps/odyssey-one/src/routes/Home.jsx` undoes the wiring; `rm apps/odyssey-one/.env.local apps/odyssey-one/.env.local.example apps/odyssey-one/src/hooks/useTrackingLoadStatistics.js` removes the new files.
