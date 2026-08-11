# Authentication — Requirements (as built)

> Reverse-engineered from the current implementation. Describes what the system does today,
> not what it should do. Items that could not be confirmed from code are marked
> **Unknown / needs confirmation**.

## Feature overview

Users sign in either with an email + password (credentials) or with a Google account.
Sessions are JWT-based. A signed-in user carries three pieces of identity through the app:
`id`, `role` (`USER` | `ADMIN`), and `activeDomainId`. Route access is gated by
`src/middleware.ts` plus per-page and per-API-route checks.

## Purpose / user problem

Content in this app is per-user: private questions, per-user overrides of shared defaults,
per-user stars, and a shareable profile. All of that requires a stable user identity. Roles
additionally separate "admins who seed shared defaults" from "users who consume and customize them".

## Current functional requirements

### Registration

- **AUTH-R1** — A visitor can create an account at `/register` with name, email, password, confirm password.
- **AUTH-R2** — Registration posts to `POST /api/auth/register`. On success the API returns `201` with `{ message: "Account created successfully" }`.
- **AUTH-R3** — The password is hashed with bcrypt at cost factor **12** before storage. The plaintext is never persisted.
- **AUTH-R4** — If the email already exists, the API returns `409` with `{ error: "An account with this email already exists" }`, and the form displays that message.
- **AUTH-R5** — New accounts are created with `role = USER` (the Prisma default) and `activeDomainId = null`. Registration does not let the caller choose a role.
- **AUTH-R6** — Immediately after a successful registration the client calls `signIn("credentials", …)` with the same email/password and, on success, navigates to `/questions`. If that auto-sign-in fails, the user is sent to `/login` instead.
- **AUTH-R7** — There is **no email verification step**. The `User.emailVerified` column exists but registration never sets it and no code reads it.

### Credentials sign-in

- **AUTH-R8** — A user can sign in at `/login` with email + password.
- **AUTH-R9** — Sign-in is rejected (returns `null` from `authorize`) when: the payload fails the login schema, no user exists with that email, the user record has no `password` (i.e. an OAuth-only account), or bcrypt comparison fails.
- **AUTH-R10** — All sign-in failures surface to the user as the single generic message **"Invalid email or password"**. The UI does not distinguish "no such account" from "wrong password".
- **AUTH-R11** — On success the user is redirected to the `callbackUrl` query parameter if present, otherwise to `/questions`.

### Google OAuth

- **AUTH-R12** — Both `/login` and `/register` offer a "Continue with Google" button which starts the Google OAuth flow with `callbackUrl: "/questions"`.
- **AUTH-R13** — Google accounts are persisted through the NextAuth Prisma adapter into `User` + `Account`. A first-time Google user is therefore created with `role = USER` and `activeDomainId = null`.
- **AUTH-R14** — Google credentials come from `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` environment variables. **Unknown / needs confirmation:** behavior when those are unset — no code path guards against it.

### Session

- **AUTH-R15** — Sessions use the JWT strategy, not database sessions.
- **AUTH-R16** — The JWT carries `id`, `role`, and `activeDomainId`; the session object exposes them at `session.user.id`, `session.user.role`, `session.user.activeDomainId`.
- **AUTH-R17** — A client can update `activeDomainId` in the live session without re-authenticating, by calling NextAuth's `update({ activeDomainId })`. The `jwt` callback honours `trigger === "update"` **only** for `activeDomainId`.
- **AUTH-R18** — Signing out redirects to `/login`.

### Route protection

- **AUTH-R19** — Public routes are exactly `/`, `/login`, `/register`.
- **AUTH-R20** — An unauthenticated request to any non-public path is redirected to `/login?callbackUrl=<original path>`.
- **AUTH-R21** — An authenticated user who visits `/login` or `/register` is redirected to `/questions`.
- **AUTH-R22** — Requests under `/api/auth/*` bypass all middleware checks.
- **AUTH-R23** — An authenticated user whose token has no `activeDomainId` is redirected to `/domain-select`, except when already on `/domain-select`, on an `/api/*` route, or on a public route.
- **AUTH-R24** — The landing page `/` redirects signed-in users to `/questions`.
- **AUTH-R25** — Every page under `(main)` re-checks the session server-side and calls `redirect("/login")` if absent — the middleware check is not relied on alone.
- **AUTH-R26** — Every application API route handler begins with `await auth()` and returns `401 { error: "Unauthorized" }` when there is no session. The two exceptions are `POST /api/auth/register` and `GET /api/domains`, which perform no session check of their own.

### Roles

- **AUTH-R27** — Two roles exist: `USER` (default) and `ADMIN`.
- **AUTH-R28** — `/admin/*` pages are gated by `src/app/(main)/admin/layout.tsx`, which redirects non-admins to `/questions`.
- **AUTH-R29** — The "Admin" entry in the user dropdown menu is rendered only when `session.user.role === "ADMIN"`.
- **AUTH-R30** — There is **no UI or API for changing a user's role**. Admin status is granted only by the seed script (`prisma/seed.ts` upserts one admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`) or by direct database edit.

## User flows

### Register

1. Visitor opens `/register`.
2. Fills name, email, password, confirm password. Client-side Zod validation runs on submit.
3. `POST /api/auth/register` → 201.
4. Client auto-signs-in with credentials.
5. Redirect to `/questions`.
6. Middleware sees `activeDomainId === null` → redirects to `/domain-select`.

### Sign in

1. Visitor opens `/login` (possibly with `?callbackUrl=…` added by middleware).
2. Submits email + password.
3. `signIn("credentials", { redirect: false })`.
4. On error → inline banner "Invalid email or password", stays on page.
5. On success → `router.push(callbackUrl)` then `router.refresh()`.

### Google sign-in

1. Visitor clicks "Continue with Google" on `/login` or `/register`.
2. Redirected to Google, consents, returns to the NextAuth callback.
3. Prisma adapter creates or links `User` + `Account`.
4. Redirect to `/questions`; if no active domain, middleware sends them to `/domain-select`.

### Sign out

1. User opens the avatar dropdown → "Sign out".
2. `signOut({ callbackUrl: "/login" })`.

## Business rules

- **AUTH-B1** — Email is unique across users (`User.email @unique`).
- **AUTH-B2** — A user record may legitimately have `password = null`; that is the OAuth-only case, and such a user can never sign in via credentials.
- **AUTH-B3** — Role is never derived from the request; it is read from the database at sign-in and then carried in the JWT.
- **AUTH-B4** — `activeDomainId` in the JWT is the source of truth for the middleware's domain gate, while API routes re-read `activeDomainId` from the database. These two can disagree — see Edge cases.

## Validation rules

`src/lib/validations/auth.ts` (Zod v4), used both client-side via `zodResolver` and server-side:

| Field | Rule | Message |
|---|---|---|
| `email` (login & register) | must be a valid email | "Invalid email address" |
| `password` (login) | min length 1 | "Password is required" |
| `name` (register) | min length 2 | "Name must be at least 2 characters" |
| `password` (register) | min length 6 | "Password must be at least 6 characters" |
| `confirmPassword` (register) | must equal `password` | "Passwords do not match" |

- **AUTH-V1** — The register API returns only the **first** Zod issue: `parsed.error.issues[0].message`.
- **AUTH-V2** — There are no password complexity rules beyond the 6-character minimum. No maximum length, no character-class requirement.
- **AUTH-V3** — Email is not normalized (no lowercasing or trimming) before the uniqueness check or before storage.

## Permissions / access restrictions

| Resource | Anonymous | `USER` | `ADMIN` |
|---|---|---|---|
| `/`, `/login`, `/register` | ✅ | ✅ (redirected away from `/login`,`/register`) | same as USER |
| `/questions`, `/topics`, `/profile`, `/share/*`, `/interview/*` | ❌ → `/login` | ✅ | ✅ |
| `/domain-select` | ❌ → `/login` | ✅ | ✅ |
| `/admin/*` | ❌ → `/login` | ❌ → `/questions` | ✅ |
| `POST /api/auth/register` | ✅ | ✅ | ✅ |
| All other `/api/*` | ❌ (see Edge cases) | ✅ | ✅ |

## Error and failure behavior

- **AUTH-E1** — Register: malformed body → `400` with the first validation message. Duplicate email → `409`. Any thrown error (including database failure) is caught and returned as `500 { error: "Something went wrong" }`.
- **AUTH-E2** — Register form: a non-OK response sets an inline red banner with `body.error`, or "Something went wrong" if the body has no `error` field.
- **AUTH-E3** — Login form: a NextAuth error sets the banner to the fixed string "Invalid email or password" regardless of the underlying cause.
- **AUTH-E4** — The login button is disabled while `isSubmitting || isRedirecting`, so it stays disabled through the post-success navigation.
- **AUTH-E5** — API routes other than register return `401 { error: "Unauthorized" }` for a missing session. They do not distinguish "expired" from "never signed in".
- **AUTH-E6** — There is no rate limiting, lockout, or CAPTCHA on either registration or sign-in.

## Important edge cases

- **AUTH-X1 (confirmed behavior worth flagging)** — The middleware matcher `"/((?!_next/static|_next/image|favicon.ico|images/).*)"` **includes `/api/*`**. For an unauthenticated request to, say, `GET /api/questions`, the middleware's `!isPublicRoute && !isLoggedIn` branch fires *before* the route handler runs, so the caller receives a **302 redirect to `/login`**, not the `401` JSON the handler would produce. The `401` branches in the handlers are effectively a second line of defence reachable only if middleware is bypassed.
- **AUTH-X2** — `GET /api/domains` performs no `auth()` check of its own. It is protected only by AUTH-X1's middleware redirect.
- **AUTH-X3** — The profile page calls `updateSession({ name })` after a name change, but the `jwt` callback only handles `activeDomainId` on `trigger === "update"`. **Unknown / needs confirmation:** whether NextAuth's default token merge propagates `name` anyway. From this repo's code alone, the name in the JWT is not explicitly updated.
- **AUTH-X4** — A user signed in *before* an admin changes their role in the database keeps the old role until the JWT is reissued (i.e. until they sign out and back in). Same for a role granted by re-running the seed.
- **AUTH-X5** — If a user's `activeDomainId` is set directly in the database while they are signed in, the JWT still holds the old value, so the middleware gate and the API queries (which re-read from the DB) can disagree for the rest of that session.
- **AUTH-X6** — Registering with an email that differs only in case or surrounding whitespace from an existing account creates a **second** account, because the email is not normalized (AUTH-V3).
- **AUTH-X7** — A user who registered with credentials and later signs in with Google using the same email: **Unknown / needs confirmation.** No explicit account-linking logic exists in this repo; behavior is whatever the NextAuth Prisma adapter defaults to.
- **AUTH-X8** — `auth.config.ts` declares a stub `Credentials` provider whose `authorize` always returns `null`; `auth.ts` filters that stub out by `id` and substitutes the real one. The stub exists so the Edge-compatible middleware config knows the provider exists. If the filter ever failed to match, credentials sign-in would silently always fail.

## Non-goals / not supported

- Password reset or "forgot password" — no route, no email sending, no token model in use.
- Email verification — column exists, never populated or checked.
- Two-factor authentication.
- Account deletion or deactivation from the UI.
- Changing your own email or password from the UI (the profile page edits `name` only).
- Any OAuth provider other than Google.
- Role management UI.
- Session revocation / "sign out all devices" — JWT sessions are not tracked server-side.
- Rate limiting or brute-force protection.
- Linking multiple providers to one account from the UI.

## Acceptance criteria

- **AC-1** — Posting valid, unused registration details creates exactly one user with a bcrypt hash (never plaintext), `role = USER`, and returns `201`.
- **AC-2** — Posting a duplicate email returns `409` and creates no user.
- **AC-3** — Posting a password shorter than 6 characters, or a mismatched confirmation, returns `400` and creates no user.
- **AC-4** — Correct credentials produce a session whose `user.id`, `user.role`, and `user.activeDomainId` match the database row.
- **AC-5** — Wrong password, unknown email, and OAuth-only account all produce the same "Invalid email or password" message.
- **AC-6** — An anonymous browser request to `/questions` lands on `/login?callbackUrl=/questions`; after signing in, the user arrives at `/questions`.
- **AC-7** — A signed-in user navigating to `/login` ends up at `/questions`.
- **AC-8** — A `USER` navigating to `/admin/questions` ends up at `/questions`; an `ADMIN` sees the page.
- **AC-9** — A signed-in user with `activeDomainId = null` is redirected to `/domain-select` from any protected page, and is not redirected once a domain is chosen.
- **AC-10** — Signing out clears the session and lands on `/login`; the previously visited protected page is no longer reachable without signing in again.
</content>
