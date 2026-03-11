# Lock & Archer

An AT Protocol (ATProto) app for **community guides** and **local storytelling**: create and share guides (articles, events, places), follow other guide authors, and browse unified feeds (citywide, by community area, or from people you follow).

## Stack

- **Next.js 16** (App Router)
- **ATProto** – OAuth sign-in, guides and guide items stored in the user’s PDS; app DB (SQLite) for indexing and feeds
- **Kysely** + **better-sqlite3** for the app database

## Getting started

```bash
pnpm install
pnpm migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Set `PDS_APP_URL` in `.env.local` (and optionally `PUBLIC_URL`, `PRIVATE_KEY`, `DATABASE_PATH`) for full OAuth and guide features.

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Run migrations and start Next.js dev server |
| `pnpm build` | Build for production |
| `pnpm start` | Run migrations and start production server |
| `pnpm migrate` | Run DB migrations |
| `pnpm seed-guides` | Seed guides for one account (requires OAuth session; set `SEED_HANDLE` or `SEED_DID`) |
| `pnpm railway-seed` | Reseed alice/bob/carol on PDS (profiles, avatars, follows, guides); use on deploy when `PDS_APP_URL` is set |
| `pnpm gen-key` | Generate OAuth client private key for `PRIVATE_KEY` |

## Docs

- **[docs/README.md](docs/README.md)** – Doc index and roadmap
- **[RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md)** – Deploying to Railway (env, volume, deploy-time seed, blob proxy)

## Features (current)

- **Auth** – OAuth sign-in; create account on your PDS when `PDS_APP_URL` is set
- **Guides** – Create guides, add items (from Agate or Chicago Public Library events), view on map
- **Feeds** – Citywide (guides + Sun-Times RSS), by community area, **Following** (guides from people you follow; requires sign-in)
- **Blob proxy** – Safe avatar/media URLs via `GET /api/blob?did=...&cid=...`
- **Deploy seed** – `pnpm railway-seed` to reseed three test accounts with profiles, avatars, mutual follows, and guides
