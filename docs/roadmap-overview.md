# Roadmap overview (Phases 2–6)

Lock & Archer is an ATProto app for **community guides** and **local storytelling**. This doc summarizes the roadmap; see the linked docs for each phase and implementation detail.

---

## Executive summary

| Phase | Focus |
|-------|--------|
| **Phase 2 – Guides** | Store guides and guide items in each author’s PDS; mirror in app DB. Users create, edit, and fork guides (articles, events, places). Home page shows **recent guides** in place of statuses. |
| **Phase 3 – Data sources & Agate** | Pluggable data sources; Agate for Chicago places and community areas. Guides become geo-aware; “Add from Agate” and refresh. |
| **Phase 4 – Feeds** | Feeds by community area and citywide. |
| **Phase 5 – Custom feeds** | Pluggable feed pattern so technical users can write and deploy their own feeds. |
| **Phase 6 – Community-area onboarding (later)** | After sign-up, user sets community area (address or list); app recommends that area’s feed. |

---

## ATProto in plain language

- **Handle** – Human-readable name (e.g. `alice.lock-and-archer-pds.up.railway.app`). **DID** – Stable id (e.g. `did:plc:…`). Handle points to DID; DID points to where data lives.
- **PDS** – Where your content lives (guides, items, statuses). We use lock-and-archer-pds for accounts and guide data.
- **App** – Client: sign-in, read/write records via PDS. It does not own the data.
- **Lexicons** – Schemas for record types and APIs. We add `com.cpm.guides.guide` and `com.cpm.guides.guideItem`.
- **Tap** – Subscribes to the firehose; forwards events to our `/api/webhook`; we update the app DB (index for fast UIs).
- **OAuth** – Users sign in; app writes to their PDS on their behalf.

**Short:** PDS = where data lives. Lexicons = how it’s structured. Tap + webhook + DB = how we build feeds. OAuth + app = how users interact.

---

## What exists today

- **OAuth login** – Handle → DID → OAuth flow.
- **Status posting (Statusphere)** – `xyz.statusphere.status` in PDS + write-through to SQLite; “Recent” and “Top statuses.”
- **Tap + webhook** – Identity and status events → `/api/webhook` → `account` and `status` tables.
- **Create account** – When `PDS_APP_URL` is set, users can create an account on our PDS from the app.

We reuse this architecture for guides (and later feeds).

---

## Where to read next

| Doc | Audience | Purpose |
|-----|----------|---------|
| [phase-1-guide-data-model.md](phase-1-guide-data-model.md) | Product + eng | Data model, NSIDs, fork semantics, open questions |
| [phase-2-guides.md](phase-2-guides.md) | Product + eng | What a guide is, UX (including home recent guides), property badges (Sun-Times, WBEZ, chicago.com) |
| [phase-2-implementation.md](phase-2-implementation.md) | Eng | Gaps, decisions, API routes, implementation checklist, testing |
| [phase-3-agate.md](phase-3-agate.md) | Product + eng | Data sources, Agate, geo/neighborhoods |
| [phase-4-5-feeds.md](phase-4-5-feeds.md) | Product + eng | Feeds by area, citywide, custom feeds |
| [phase-6-community-onboarding.md](phase-6-community-onboarding.md) | Product + eng | Address → community area, recommend feed (later) |
| [technical-appendix.md](technical-appendix.md) | Eng | DB shapes, write/read path, adapters, references |
| [design-standards.md](design-standards.md) | Design + eng | Tokens, typography, components |
| [ACCOUNT_CREATION_PLAN.md](ACCOUNT_CREATION_PLAN.md) | Eng | Create-account flow (implemented) |
