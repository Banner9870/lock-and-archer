# Social graph and CDN plan

This doc outlines **social graph features** (follows, Following feed) and **blob/CDN** serving in Lock & Archer.

---

## 1. Social graph – ATProto basics

### 1.1 Follow relationships

- **`app.bsky.graph.follow`** – Record type: “actor A follows subject B.” Fields: `subject` (DID), `createdAt`. Stored in each user’s PDS.
- **`app.bsky.graph.getFollows`** – List accounts a given actor follows. Params: `actor`, `limit`, `cursor`. No auth required for public data.
- **`app.bsky.graph.getFollowers`** – List accounts that follow a given actor.

---

## 2. Social graph – Lock & Archer

### 2.1 Implemented

| Feature | Status |
|--------|--------|
| **Following feed** | ✅ `GET /api/feeds/following` and `/feeds/following`. Resolves signed-in user’s DID to PDS, calls `getFollows`, then lists guides from app DB where `authorDid` is in the followed set. No mirror table; uses PDS getFollows on each request. |
| **Deploy-time seed** | ✅ `pnpm railway-seed` creates mutual follows among alice, bob, carol so the Following feed is populated after reseed. |

### 2.2 Not implemented

- **Follow / unfollow UI** – No “Follow” / “Unfollow” button; no create/delete `app.bsky.graph.follow` from the app.
- **Followers / following lists** – No profile page showing “X follows Y” or “followers of @handle.”
- **Mirror** – We do not mirror the follow graph in the app DB; we call PDS `getFollows` when loading the Following feed. A mirror (e.g. Tap → `follow` table) could be added later for performance or offline use.

---

## 3. CDN – Blob proxy (implemented)

### 3.1 Why proxy blobs?

Serving user-uploaded files directly from the PDS to browsers is [not recommended](https://atproto.com/guides/blob-security) (XSS, MIME, EXIF). Apps should proxy blobs with safe headers.

### 3.2 Implemented

- **Route:** `GET /api/blob?did=...&cid=...` in `app/api/blob/route.ts`. Resolves DID to PDS via `resolveDidToPdsUrl` (`lib/did-resolve.ts`), falls back to `PDS_APP_URL`. Fetches PDS `com.atproto.sync.getBlob`, streams with security headers and allowlisted image types (jpeg, png, gif, webp). Cache-Control and X-Content-Type-Options.
- **Helper:** `lib/blob-url.ts` – `blobProxyUrl(did, cid)` builds the app URL to the blob proxy (uses `PUBLIC_URL`).
- **Railway:** See [RAILWAY_DEPLOY.md](../RAILWAY_DEPLOY.md#blob-proxy-avatars-and-media). Optional: Cloudflare in front to cache at edge.

### 3.3 Not implemented

- **Avatar hydration** – We do not yet fetch `app.bsky.actor.profile` from the PDS or build avatar URLs for feed cards or nav. When we do, we will use `blobProxyUrl(did, cid)` for the avatar image source.

---

## 4. References

- [ATProto Social Graph](https://atproto.com/guides/social-graph)
- [Blob security](https://atproto.com/guides/blob-security)
- [design-evaluation-and-ui-plan.md](design-evaluation-and-ui-plan.md) – Avatar hydration plan
