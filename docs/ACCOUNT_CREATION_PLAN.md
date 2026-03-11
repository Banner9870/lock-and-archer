# Plan: Create Account flow for Lock and Archer

## Goal

Let users who don’t have an Atmosphere account or existing PDS **create an account on our PDS** from the app. Keep the flow **simple and test-friendly** so multiple test accounts can be created quickly.

## References

- [Handle – AT Protocol](https://atproto.com/specs/handle) – handle format and resolution  
- [DID – AT Protocol](https://atproto.com/specs/did) – account identifiers  
- [XRPC – AT Protocol](https://atproto.com/specs/xrpc) – HTTP API (procedures = POST)  
- PDS implements **`com.atproto.server.createAccount`**: POST to `https://<pds>/xrpc/com.atproto.server.createAccount` with JSON body. No auth required for signup.  
- Our app already uses **`PDS_APP_URL`** for handle resolution; the same URL is the base for createAccount.

## Behaviour

1. **When to show “Create account”**  
   Only when **`PDS_APP_URL`** is set (we have a PDS to create accounts on). Otherwise we only show “Sign in” for existing accounts.

2. **Landing (home) page**  
   When not logged in, show:
   - Existing **Sign in** form (handle → OAuth).
   - A short line: **“Don’t have an account? Create one.”** with a link to the create-account flow (e.g. `/create-account`). Only render this when `PDS_APP_URL` is configured.

3. **Create-account page** (`/create-account`)  
   - **Form fields**
     - **Handle** (required): full handle under our PDS, e.g. `dave.lock-and-archer-pds-production.up.railway.app`.  
       - Helper text or placeholder: “Choose a username; your handle will be `<username>.<pds-host>`.” Optionally pre-fill the domain part from `PDS_APP_URL` so users only type the local part (e.g. `dave`).
     - **Password** (required): account password (PDS may enforce minimum length; document in UI if known).
     - **Email** (optional): for recovery/contact if the PDS supports it.
     - **Invite code** (optional): only if the PDS is configured to require invites; can be hidden or shown via env (e.g. `REQUIRE_INVITE_CODE=true`). For testing, we can assume open signup (no invite) and add this later if needed.
   - **Submit**  
     - Client POSTs to app route (e.g. `POST /api/create-account`) with `{ handle, password, email? }` (and `inviteCode` if we add it).  
     - App validates that `handle` is under the PDS host (derived from `PDS_APP_URL`).  
     - App proxies to PDS: `POST <PDS_APP_URL>/xrpc/com.atproto.server.createAccount` with the same body.  
     - **On success**: redirect to home with a query, e.g. `/?account_created=<handle>`, and show a success message: “Account created. Sign in with your new handle below.” Pre-fill the handle in the Sign in form so the user only has to go through OAuth (and enter password on the PDS).  
     - **On error**: surface PDS error (e.g. `HandleNotAvailable`, `InvalidHandle`, `InvalidPassword`) in the form.

4. **No “auto-login” after create**  
   We do **not** use the createAccount response JWTs to set an app session. The app session is OAuth-based; `getSession()` uses `client.restore(did)` and the OAuth session store. Keeping “create → then sign in” avoids touching session format and keeps one auth path. It also makes testing clear: create account → sign in with new handle.

## Implementation outline

| Item | Action |
|------|--------|
| **Env** | Use existing `PDS_APP_URL`. Optional later: `REQUIRE_INVITE_CODE` or similar for invite-only PDS. |
| **Landing** | In `app/page.tsx`, when not logged in and `PDS_APP_URL` is set, render “Don’t have an account? [Create one](/create-account).” |
| **Route: create-account page** | New `app/create-account/page.tsx`: form (handle, password, email optional). Optional: server component reads `PDS_APP_URL` and passes PDS hostname so the client can suggest `username.<host>`. |
| **API route** | New `app/api/create-account/route.ts`: read `PDS_APP_URL`; if missing return 503. Validate handle is under PDS host. POST to `PDS_APP_URL/xrpc/com.atproto.server.createAccount` with `{ handle, password, email? }`. Return JSON success/error; client redirects on success with `?account_created=<handle>`. |
| **LoginForm** | Support optional initial handle (e.g. `defaultHandle` prop or read `account_created` from URL/searchParams) so the home page can pre-fill the handle after redirect. |
| **Home success state** | When `searchParams.account_created` is set, show a green notice above the form: “Account created. Sign in with your new handle below.” and pass the value into `LoginForm` for pre-fill. |

## createAccount API (reference)

- **Endpoint**: `POST <PDS_APP_URL>/xrpc/com.atproto.server.createAccount`  
- **Request body** (JSON):  
  - `handle` (string, required)  
  - `password` (string, required)  
  - `email` (string, optional)  
  - `inviteCode` (string, optional) – if PDS requires it  
- **Response (200)**: e.g. `{ accessJwt, refreshJwt, handle, did }` – we ignore tokens and redirect to sign-in.  
- **Errors**: 400 with body like `{ error: "HandleNotAvailable" }` or `{ error: "InvalidHandle", message: "..." }`. Map these to user-friendly messages in the UI.

## Testing

- With `PDS_APP_URL` set, open home → “Create one” → fill handle (e.g. `test1.<pds-host>`), password, submit → redirect to home with “Account created” and handle pre-filled → Sign in → complete OAuth on PDS → back in app, signed in.  
- Create several accounts (e.g. `test1`, `test2`, `test3`) to validate repeated use.  
- If PDS is invite-only, add optional invite code field and document how to generate codes (e.g. admin or existing user); for initial testing, prefer PDS configured for open signup.

## PDS / invite codes

- Many self-hosted PDS instances can be configured for **open signup** (no invite). Our PDS (lock-and-archer-pds) uses `goat pds admin account create` for seeding; the **public** `com.atproto.server.createAccount` is a separate endpoint that may or may not require an invite depending on PDS config.  
- If the deployed PDS requires invite codes: either configure it for open signup for testing, or add an optional “Invite code” field and document how admins generate codes (e.g. `com.atproto.server.createInviteCode` or admin tooling). The plan above keeps the flow minimal and adds invite code as an optional enhancement.

## Summary

- **Landing**: “Create an account” link when `PDS_APP_URL` is set.  
- **Create-account page**: handle, password, optional email; submit → app API → PDS `createAccount`.  
- **After success**: redirect to home with `?account_created=<handle>`, show success message and pre-fill handle in Sign in form; user completes OAuth to sign in.  
- **Testing**: create multiple accounts by repeating the flow; keep invite code optional and PDS open for signup if possible.
