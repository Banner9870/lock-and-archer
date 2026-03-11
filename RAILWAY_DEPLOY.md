# Deploying to Railway

This guide walks you through deploying your AT Protocol OAuth app to [Railway](https://railway.app).

## Prerequisites

Before deploying, generate a private key for your OAuth client:

```bash
pnpm gen-key
```

Save the output—you'll need it for the environment variables.

## Step 1: Create a New Project

1. Log in to [Railway](https://railway.app) and click **New Project**
2. Select **Deploy from GitHub repo**
3. Paste in your repository URL
4. Click **Deploy Repo**

## Step 2: Add a Volume for SQLite

Your app uses SQLite for session storage, which needs persistent disk storage.

1. Right-click on your service and select **Attach Volume**
2. Set the mount path to `/data`

## Step 3: Generate a Domain

1. Click on your service and go to the **Settings** tab
2. In the **Networking** section, click **Generate Domain**
3. Railway should automatically detect that Next.js runs on port 8080, but if not, set the port manually
4. Copy the generated domain (e.g., `your-app-name.up.railway.app`)

## Step 4: Configure Environment Variables

1. Click on your service and go to the **Variables** tab
2. Add the following variables:

| Variable        | Value                                  |
|----------------|----------------------------------------|
| `DATABASE_PATH`| `/data/app.db`                         |
| `PUBLIC_URL`   | `https://your-app-name.up.railway.app` |
| `PRIVATE_KEY`  | The JSON key from `pnpm gen-key`       |
| `PDS_APP_URL`  | *(Optional)* If using a test PDS: full PDS URL (e.g. `https://lock-and-archer-pds-production.up.railway.app`) so handle resolution works without wildcard DNS |
| `INGEST_CRON_SECRET` | *(Optional)* If set, `/api/ingest/suntimes-rss` requires `Authorization: Bearer <value>` or `x-cron-secret: <value>`. Use a long random string for production so only your cron job can trigger ingest. |
| `SEED_PASSWORD` | *(Optional)* Password for the three dummy PDS accounts (alice, bob, carol). Default: `testpass123`. Only needed if you run the Railway seed script. |
| `SEED_HANDLES` | *(Optional)* Comma-separated handles to reseed (default: alice, bob, carol at lock-and-archer-pds-production.up.railway.app). Only needed if you override the default. |

**Important notes:**

- `PUBLIC_URL` must be a full origin: include `https://` and have no trailing slash (e.g. `https://your-app-name.up.railway.app`). If you set only the hostname, the app will prefix `https://` for you.
- `PRIVATE_KEY` should be the full JSON object (e.g., `{"kty":"EC","kid":"...","crv":"P-256",...}`)
- The app supports **any** AT Protocol PDS (e.g. bsky.social, your own). You do not need a custom PDS to use the app. `PDS_APP_URL` is only an optional fallback for one specific PDS (e.g. a Railway test PDS without wildcard DNS).

## Step 5: Redeploy

After setting environment variables, Railway will automatically redeploy. Once complete, visit your domain to test the OAuth flow.

## Optional: Test PDS for Statusphere

To test status updates (and avoid “Unable to fulfill XRPC request” from bsky.social), you can run your own PDS with pre-created test accounts.

A **Railway-deployable test PDS** lives in the `pds` folder at the repo root (or in a separate repo). It uses the [official Bluesky PDS](https://github.com/bluesky-social/pds) image and on first run creates 3 test users (`alice.*`, `bob.*`, `carol.*`, password: `testpass123`).

1. Deploy the PDS (see `pds/README.md`): push the `pds` folder to a new GitHub repo, deploy on Railway with a volume at `/pds`, set `PDS_HOSTNAME`, `PDS_JWT_SECRET`, `PDS_ADMIN_PASSWORD`, and `PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX`.
2. **In this app (Lock and Archer), set `PDS_APP_URL`** to your PDS's full URL so login works without wildcard DNS (e.g. `https://lock-and-archer-pds-production.up.railway.app`). This is a **fallback only**: the app always tries standard handle resolution first and supports any PDS (bsky.social, etc.); `PDS_APP_URL` is used only when standard resolution fails and the handle matches that PDS host.
3. Sign in with a handle like `alice.lock-and-archer-pds-production.up.railway.app` (the handle must match your PDS hostname exactly).
4. Set status from the Statusphere UI; the self-hosted PDS accepts the custom `xyz.statusphere.status` lexicon.

## Deploy-time seed (alice, bob, carol)

To **reseed** the three dummy PDS accounts (profiles, avatars, mutual follows, and guides) on each deploy:

1. Set **`PDS_APP_URL`** and **`DATABASE_PATH`** (e.g. `/data/app.db`) on the app service.
2. Optionally set **`SEED_PASSWORD`** (default: `testpass123`) and **`SEED_HANDLES`** (comma-separated; default is alice, bob, carol at your PDS host).
3. Change the **start command** so the seed runs after migrate and before the server:
   - In Railway: **Settings** → **Deploy** → **Start Command**: `pnpm migrate && pnpm railway-seed && pnpm start`
   - Or leave start as default and run the seed once manually via **Run Command** (e.g. `pnpm railway-seed`) after deploy.

The script creates sessions (password login), sets profile display names and fallback avatars (from `seed/default-avatar.png` or a built-in 1×1 PNG), creates mutual follows among the three accounts, distributes guides from `seed/guides.json` across them, and inserts those guides into the app DB so they appear in **Citywide** and **Following** feeds. Add a `seed/default-avatar.png` (small PNG) in the repo if you want a custom default avatar.

## Troubleshooting

### "Failed to resolve identity" / "Handle does not resolve to a DID"

- **If you use a test PDS on Railway:** Set `PDS_APP_URL` on this app to your PDS full URL (e.g. `https://lock-and-archer-pds-production.up.railway.app`). The app will try standard resolution first, then fall back to that PDS's XRPC when it matches the handle's host.
- Ensure the handle matches the PDS hostname exactly (e.g. `alice.lock-and-archer-pds-production.up.railway.app`).

### PDS returns 500 on `/xrpc/_health`

The PDS service is failing. On the **PDS** Railway service (not this app):

1. **`PDS_HOSTNAME` must be hostname only** — e.g. `lock-and-archer-pds-production.up.railway.app`. Do **not** include `https://`. Including the scheme causes the PDS to crash on startup (ZodError: "Issuer URL must be in the canonical form").
2. Open the PDS service **Deployments** or **Logs** and check the error message on startup.
3. Ensure a volume is attached at `/pds` and required env vars are set (`PDS_JWT_SECRET`, `PDS_ADMIN_PASSWORD`, `PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX`). See the PDS repo README.

### Recent feed is empty or only shows your own status

The **Recent** and **Top Statuses** feeds are filled in two ways:

1. **Write-through** — When you set a status in the app, that status (and your account) are written into the app database immediately, so your own updates show up right away.
2. **Tap (firehose)** — To see statuses from **other** users, a [Tap](https://atproto.com/guides/backfilling#using-tap) instance must be running and sending events to your app’s webhook. Tap subscribes to the AT Protocol firehose and forwards `xyz.statusphere.status` record and identity events to your app.

If you only see your own status in Recent, Tap is not configured for production. To fix:

- Run Tap somewhere (e.g. a separate Railway service or a VPS) with your **production** webhook URL and collection filter:
  ```bash
  tap run \
    --webhook-url=https://YOUR-APP.up.railway.app/api/webhook \
    --collection-filters=xyz.statusphere.status \
    --signal-collection=xyz.statusphere.status
  ```
- Optional: set `TAP_ADMIN_PASSWORD` on this app and pass it when starting Tap so webhook requests are authenticated.
- Add the Tap admin password to the webhook URL or configure Tap to send it in the `Authorization` header (see Tap docs). Then statuses from anyone on the network who uses Statusphere will flow into your app and appear in Recent and Top Statuses.

## Daily Sun-Times RSS ingest (cron)

The app can pull Chicago Sun-Times articles into the feed on a schedule. To run ingest **once per day** on Railway:

### 1. Protect the endpoint (recommended)

On your **main app** service, set:

- **`INGEST_CRON_SECRET`** — A long random string (e.g. from `openssl rand -hex 32`). If set, only requests that send this value in `Authorization: Bearer <secret>` or `x-cron-secret: <secret>` can trigger the ingest.

If you leave `INGEST_CRON_SECRET` unset, anyone who can reach your app can call the ingest URL (fine for private or low-traffic apps).

### 2. Option A — Railway cron service (same project)

Add a second service that runs on a schedule and calls your app’s ingest URL, then exits.

1. In your Railway project, click **+ New** → **GitHub Repo** and select the **same repository** (or **+ New** → **Empty Service** and connect the repo).
2. In the new service **Settings**:
   - Set **Root Directory** to `cron` (or set **Dockerfile path** to `cron/Dockerfile` if your repo root is the app).
   - Under **Cron Schedule**, set a [crontab expression](https://docs.railway.app/reference/cron-jobs#crontab-expressions), e.g. **`0 8 * * *`** for every day at 8:00 AM UTC.
3. In the new service **Variables**, add:
   - **`INGEST_URL`** — Your app’s full origin, e.g. `https://your-app-name.up.railway.app` (no trailing slash).
   - **`INGEST_CRON_SECRET`** — The same value as on the main app (so the cron request is authorized).

The `cron` service uses a minimal Docker image that runs `curl` once to `POST $INGEST_URL/api/ingest/suntimes-rss` with the Bearer token, then exits. Railway runs it according to the cron schedule.

### 3. Option B — External cron

Use any HTTP cron (e.g. [cron-job.org](https://cron-job.org), [EasyCron](https://www.easycron.com), or a GitHub Actions scheduled workflow) to call your app once per day:

- **URL:** `https://your-app-name.up.railway.app/api/ingest/suntimes-rss`
- **Method:** POST (or GET)
- **Header:** `Authorization: Bearer YOUR_INGEST_CRON_SECRET` (if you set `INGEST_CRON_SECRET` on the app)
- **Schedule:** e.g. daily at your preferred time (UTC).

## Blob proxy (avatars and media)

The app serves ATProto blobs (e.g. profile avatars) through a **safe proxy** at `GET /api/blob?did=...&cid=...` instead of pointing the browser directly at the PDS. This follows [ATProto blob security](https://atproto.com/guides/blob-security) guidance.

**Railway:** No extra configuration. The blob route is part of the same Next.js app:

- **PUBLIC_URL** – Already required; used to build blob URLs when generating avatar links (e.g. in step 2 avatar hydration). Set to your Railway app URL.
- **PDS_APP_URL** – Optional. When set, the proxy uses it as a fallback when DID resolution fails (e.g. accounts on your own PDS). For Bluesky users the DID document points to bsky.social, so resolution works without this.

Blob responses are cached with `Cache-Control: public, max-age=3600`. To cache at the edge, you can put **Cloudflare** (or another CDN) in front of your Railway domain and cache `GET /api/blob*`; no code changes needed.
