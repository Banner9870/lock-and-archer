# Lock & Archer – Docs

Documentation for the Lock & Archer app: ATProto guides, data sources, feeds, and design standards.

---

## Start here

- **Product / non-technical** – [roadmap-overview.md](roadmap-overview.md) for the big picture, then [phase-2-guides.md](phase-2-guides.md) for what guides are and how they behave in the UI.
- **Engineering** – [phase-2-implementation.md](phase-2-implementation.md) for gaps, API routes, checklist, and testing. Use [technical-appendix.md](technical-appendix.md) for DB shapes and write/read paths.

---

## All documents

| Doc | Purpose |
|-----|---------|
| [roadmap-overview.md](roadmap-overview.md) | Executive summary, ATProto in plain language, what exists today, and a map to the rest of the docs. |
| [phase-1-guide-data-model.md](phase-1-guide-data-model.md) | Data model research: guide and guideItem records, fork semantics, Option A (single guideItem type), open questions. |
| [phase-2-guides.md](phase-2-guides.md) | Phase 2 feature: what a guide is, data model, home page (recent guides), guides list/create/detail, add item, fork, property badges (Chicago Sun-Times, WBEZ, chicago.com). |
| [phase-2-implementation.md](phase-2-implementation.md) | Implementation: decisions (NSID, rkey, PDS), gaps addressed, API routes, checklist, testing steps, ATProto references. |
| [phase-3-agate.md](phase-3-agate.md) | Data sources and Agate: registry, Agate integration, geo/neighborhoods, refresh. |
| [phase-4-5-feeds.md](phase-4-5-feeds.md) | Phase 4 feeds (community area, citywide, custom) and Phase 5 pluggable feeds. |
| [phase-6-community-onboarding.md](phase-6-community-onboarding.md) | Later: set community area after sign-up (address or list), recommend feed. |
| [technical-appendix.md](technical-appendix.md) | DB table shapes, write/read path, adapters, feeds implementation, Phase 6 storage. |
| [design-standards.md](design-standards.md) | Lock and Archer design standards: tokens, typography, components, full token JSON reference. |
| [ACCOUNT_CREATION_PLAN.md](ACCOUNT_CREATION_PLAN.md) | Create-account flow (implemented): PDS signup, landing, login integration. |

---

## Cleanup note

The previous single-file roadmap (`phase-2-5-guides-data-sources-feeds.md`) has been split into the files above so each phase and the implementation guide are easier to find and update.
