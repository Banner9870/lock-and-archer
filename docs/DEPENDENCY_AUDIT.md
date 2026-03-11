# Dependency audit (lock-and-archer app)

**Last run:** 2026-03-11

## Summary

- **Runtime and build:** All required dependencies are in place. `pnpm install` and `pnpm build` succeed.
- **Scripts:** `migrate`, `gen-key`, `seed-guides`, `railway-seed` use `tsx`; `lex` uses the Lex CLI from `@atproto/lex` (not the `go` package).

## Known issues

**`pnpm audit`** reports 7 vulnerabilities, all coming from the **`go`** package (npm name `go`, used for lexicon/tooling). Paths are `.>go>...` (ejs, minimist, braces, micromatch, tmp). These are **build-time / dev** dependencies only; they do not run in the Next.js server or browser.

- If you use the **`go`** CLI (e.g. for lexicon scaffolding), consider updating it when a patched version is available or use an alternative.
- If you **do not** use the `go` package, you can remove it to clear the audit:
  ```bash
  pnpm remove go
  ```
  The app uses `lex build` from `@atproto/lex` for lexicon codegen; removing `go` does not affect that.

## Dependency list (production)

| Package | Version | Purpose |
|---------|---------|---------|
| @atproto/common-web | ^0.4.18 | ATProto utilities |
| @atproto/lex | ^0.0.20 | Lexicons + Lex CLI |
| @atproto/oauth-client-node | ^0.3.17 | OAuth sign-in |
| @atproto/syntax | ^0.5.0 | AT URIs, DIDs |
| @atproto/tap | ^0.2.8 | Tap / webhook helpers |
| @atproto-labs/handle-resolver | ^0.3.6 | Handle resolution |
| @atproto-labs/handle-resolver-node | ^0.1.25 | Node resolver |
| better-sqlite3 | ^12.6.2 | SQLite DB |
| kysely | ^0.28.11 | Query builder |
| next | 16.1.6 | Next.js |
| react, react-dom | 19.2.3 | UI |
| react-leaflet, leaflet | ^5 / ^1.9 | Map (guides) |
| go | ^3.0.1 | Optional lexicon CLI (see audit above) |

All other deps are devDependencies (TypeScript, ESLint, Tailwind, tsx, types).
