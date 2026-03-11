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

## Troubleshooting

### "Failed to resolve identity" / "Handle does not resolve to a DID"

- **If you use a test PDS on Railway:** Set `PDS_APP_URL` on this app to your PDS full URL (e.g. `https://lock-and-archer-pds-production.up.railway.app`). The app will try standard resolution first, then fall back to that PDS's XRPC when it matches the handle's host.
- Ensure the handle matches the PDS hostname exactly (e.g. `alice.lock-and-archer-pds-production.up.railway.app`).

### PDS returns 500 on `/xrpc/_health`

The PDS service is failing. On the **PDS** Railway service (not this app):

1. **`PDS_HOSTNAME` must be hostname only** — e.g. `lock-and-archer-pds-production.up.railway.app`. Do **not** include `https://`. Including the scheme causes the PDS to crash on startup (ZodError: "Issuer URL must be in the canonical form").
2. Open the PDS service **Deployments** or **Logs** and check the error message on startup.
3. Ensure a volume is attached at `/pds` and required env vars are set (`PDS_JWT_SECRET`, `PDS_ADMIN_PASSWORD`, `PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX`). See the PDS repo README.
