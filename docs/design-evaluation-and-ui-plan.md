# Design evaluation and UI plan

This doc re-evaluates the current app UI against [design-standards.md](design-standards.md), then outlines improvements for a **social-platform** feel and **blob/avatar hydration**.

**Current status:** Blob proxy is implemented (`GET /api/blob`, `blobProxyUrl`). We do **not** yet fetch profile/avatar from the PDS or show avatars in feed cards or nav (avatar hydration is still TODO).

---

## 1. Current state vs design standards

### 1.1 Gaps

| Standard | Current state | Gap |
|----------|----------------|-----|
| **Design tokens** | No `brand/tokens.json`; no CSS variables for brand colors | Docs require tokens as source of truth and `:root` variables (e.g. `--brand-red`, `--text-headline`). We use Tailwind’s zinc/blue directly. |
| **No hardcoded hex** | `globals.css` uses `#ffffff`, `#171717`, etc.; components use Tailwind classes like `text-zinc-900`, `bg-blue-600` | Design rule: always use CSS variables for color. Tailwind classes map to framework palette, not Lock & Archer tokens. |
| **Typography** | Geist Sans + Geist Mono in `layout.tsx`; body uses Arial in `globals.css` | Docs specify: **headings** → Charter / Georgia (serif), **body** → Source Sans Pro (sans). |
| **Primary / links** | Blue (`text-blue-600`, `dark:text-blue-400`) for links and some CTAs | Brand primary is **red** (`#ed0000`); links and primary actions should use brand red. |
| **Metadata** | `title: "Create Next App"`, generic description | Should be “Lock & Archer” and product description. |
| **Icons** | None used consistently; no Bootstrap Icons or equivalent | Docs suggest an icon set and `aria-label` for icon-only buttons. |
| **Component patterns** | Ad-hoc cards: `rounded-lg border border-zinc-200 dark:border-zinc-800` repeated everywhere | Should use shared tokens (e.g. `var(--border-color)`, `var(--radius-lg)`, `var(--shadow)`) and optionally a `.feed-card`-style class. |

### 1.2 What’s already in the right direction

- **Layout**: Centered main content, max-width, padding; mobile-first.
- **Dark mode**: `prefers-color-scheme: dark` and Tailwind dark variants are used.
- **Spacing**: Consistent `p-6`, `mb-6`, `space-y-4`, etc.
- **Links**: Underline on hover, recognizable as links.

---

## 2. Social-platform feel: improvements

To feel like a **social platform** rather than a test app:

### 2.1 Persistent shell / navigation

- **Global nav** (or sidebar on desktop): Logo, primary nav (Feeds, Guides), “Create guide”, and user block (avatar + handle + logout). Same shell on home, feeds, guides, and guide detail so the product feels like one app.
- **Home**: Can be “Feed” (redirect or default view) or a dashboard that leads into Feed and Guides.

### 2.2 Feed and card hierarchy

- **Feed as the main timeline**: One column of cards; each card is a clear unit (guide or article) with:
  - **Author**: Avatar + handle (+ optional property badge).
  - **Title** (prominent) and optional description line-clamp.
  - **Timestamp** (e.g. “2h”).
  - **Type label** (Guide / Article · Source) subtle but visible.
- **Cards**: Use design tokens for border, radius, shadow, background so cards feel part of one system. Hover state (e.g. subtle shadow or border) for clickable cards.

### 2.3 Identity and avatars

- **Avatar**: Show a small circle (e.g. 32–40px) next to handle in nav and on each feed card. If we have no image, show initials or a generic avatar (design token for placeholder bg).
- **Handle**: Consistently clickable (e.g. to a future profile or guide list by author). Use brand link color.

### 2.4 Primary actions and CTAs

- **Primary button**: “Create guide”, “Post”, etc. Use **brand red** (and dark variant for hover), not neutral gray. Rounded per tokens.
- **Secondary actions**: Border-only or subtle background; keep “Feeds”, “Guides”, “All on map” as secondary.

### 2.5 Typography hierarchy

- **Page title** (e.g. “Citywide”, “Guides”): Serif (Charter/Georgia) if we adopt tokens; larger and bold.
- **Card title**: Sans, semibold, clearly above meta (author, time).
- **Meta and labels**: Smaller, secondary color (e.g. `--text-secondary`).
- **Body/description**: Base size, readable line-height.

### 2.6 Empty and loading states

- **Empty feed**: Short copy (“No guides or articles yet”) and a CTA (e.g. “Create your first guide” or “Run ingest” for admins). Avoid a bare list of links.
- **Loading**: Skeleton cards or placeholders so the feed doesn’t jump.

---

## 3. Blob storage and hydration

In ATProto, **blobs** (images, etc.) are stored in the user’s **repository on the PDS**. The app does not “store” blobs itself; it gets **blob references** (e.g. in profile or in a record) and **resolves** them to URLs the browser can load.

### 3.1 How blobs work in ATProto

- **Profile avatar**: Stored in the repo at `app.bsky.actor.profile/self`; field `avatar` is a blob reference (e.g. `blob: …`).
- **Resolving**: Blob URL is something like `https://<pds>/xrpc/com.atproto.sync.getBlob?did=...&cid=...`. The app (or a proxy) turns the reference into that URL.
- **Our app**: We don’t need our own blob storage for profile images. We need to **hydrate** profile (and optionally other records) from the PDS and then **resolve blob URLs** when rendering.

### 3.2 Hydration

- **Hydration** here means: **fetching rich data from the PDS** (e.g. profile with avatar blob ref) and **making it available to the UI**.
- **Today**: We have `authorDid` and resolve **handle** via DB or DID resolution. We have a **blob proxy** (`GET /api/blob?did=&cid=`, see [social-graph-and-cdn-plan.md](social-graph-and-cdn-plan.md)) but we do **not** yet fetch full profile or avatar for feed cards or nav.
- **To show avatars** (when implemented):
  1. Resolve profile: For each author DID, call PDS to get `app.bsky.actor.profile/self`.
  2. Extract blob ref: Profile has `avatar: { … }`. Build blob URL via **our proxy**: `blobProxyUrl(did, cid)` → `https://<our-app>/api/blob?did=<did>&cid=<cid>`.
  3. Render: `<img src={blobUrl} alt="" />` with fallback (initials or placeholder) if no avatar or load error.

We can do this in API routes (e.g. feed API returns `authorAvatarUrl` per item) or in a small **profile-hydration** layer that the UI calls.

### 3.3 Where to implement

- **Profile service**: Add something like `getProfileWithAvatar(did): Promise<{ handle, avatarUrl? }>` that:
  - Uses existing DID → handle resolution.
  - Optionally calls PDS `getProfile` (or sync.getRecord) for the repo, gets avatar blob ref, builds blob URL.
- **Caching**: To avoid hitting the PDS on every request, cache profile (and avatar URL) in memory or in the app DB (e.g. `account` table: add `avatarCid`, `avatarMimeType`; blob URL derived from PDS host + DID + CID). Invalidate on webhook identity/record events if we get them.
- **UI**: One shared **Avatar** component: `avatarUrl` or initials, size variant, round; use in nav and feed cards.

### 3.4 Future: guide images

- **Guide cover / item images**: Phase 1 data model mentions optional `imageUrl` for articles/events/places. Options:
  - **External URL**: Keep `imageUrl` as a string (e.g. from RSS or Agate); no ATProto blob.
  - **ATProto blob**: Add a blob ref to the guide or guideItem lexicon; upload image via PDS `uploadBlob`, store ref in record; we resolve to blob URL when rendering. That implies “blob storage” is on the PDS; we only **reference and resolve**.
- **Our own CDN/cache**: Optional later: proxy or cache blob URLs (e.g. for performance or to avoid hot-linking the PDS). That would be a separate “blob cache” service; not required for the first social-platform pass.

---

## 4. Recommended implementation order

1. **Design tokens and globals**
   - Add `brand/tokens.json` (or embed the doc’s token set).
   - In `globals.css`, add `:root` (and dark) CSS variables for brand red, text, background, border, radius, shadow, and fonts.
   - Switch layout to Source Sans Pro (body) and Charter/Georgia (headings) per docs; remove or keep Geist only for code if needed.
   - Update metadata to “Lock & Archer” and product description.

2. **Use tokens in UI**
   - Replace primary link/CTA colors with `var(--brand-red)` (and hover).
   - Replace card borders/shadows with token-based values (or a single `.feed-card` class that uses tokens).
   - Ensure no raw hex in components; use variables or Tailwind config that references the same variables.

3. **Shell and nav**
   - Add a persistent **AppShell** (or layout nav): logo, Feeds, Guides, Create guide, user block (avatar placeholder + handle + logout).
   - Use this shell on all main pages (home, feeds, guides, guide detail).

4. **Feed cards**
   - Introduce a **FeedCard** component (or reuse a single card component with a “feed” variant).
   - Card content: avatar (placeholder) + handle + timestamp, then title, then description snippet; type label.
   - Apply tokens for border, radius, shadow, hover.

5. **Profile and avatar hydration**
   - Add profile resolution that can return avatar URL (PDS blob URL) for a DID.
   - Add **Avatar** component (image or initials fallback).
   - Use Avatar in shell and in feed cards; optionally cache avatar URL in DB and invalidate on identity events.

6. **Polish**
   - Empty states and loading skeletons.
   - Icons for nav and actions (with `aria-label`).
   - Accessibility pass (focus, contrast, semantics).

---

## 5. References

- [design-standards.md](design-standards.md) – Tokens, typography, no hex, components.
- [technical-appendix.md](technical-appendix.md) – Design standards requirement.
- [phase-1-guide-data-model.md](phase-1-guide-data-model.md) – Optional `imageUrl` / blob for items.
- ATProto: blob references in records; `com.atproto.sync.getBlob` (or repo-specific blob endpoint) for resolving blob URLs.
