# Authentication — Test Cases

> Verification plan for **current** behavior. Requirement IDs refer to
> [`requirements.md`](./requirements.md).

## Existing automated tests

**None.** There is no test runner in `package.json` (no `jest`, `vitest`, `playwright`, or `cypress`),
no `test` script, and no `*.test.*` / `*.spec.*` files anywhere in the repository. Every case below
describes a test that would need to be written.

## Happy path

### TC-A01 — Register a new account
- **Requirements:** AUTH-R1, R2, R3, R5, R6 · AC-1
- **Level:** Integration (API) + E2E (form)
- **Preconditions:** No user exists with `newuser@example.com`.
- **Steps:** `POST /api/auth/register` with `{ name: "New User", email: "newuser@example.com", password: "secret123", confirmPassword: "secret123" }`.
- **Expected:** `201` with `{ message: "Account created successfully" }`. Database has exactly one matching user, whose `password` is a bcrypt hash (starts `$2`, is not the plaintext), `role = "USER"`, `activeDomainId = null`.

### TC-A02 — Register then auto sign-in and land on domain select
- **Requirements:** AUTH-R6, R23 · AC-9
- **Level:** E2E
- **Preconditions:** Email unused; at least one `Domain` row seeded.
- **Steps:** Complete the `/register` form and submit.
- **Expected:** Browser ends on `/domain-select` (pushed to `/questions`, then redirected by the middleware because `activeDomainId` is null).

### TC-A03 — Sign in with correct credentials
- **Requirements:** AUTH-R8, R11, R16 · AC-4
- **Level:** E2E
- **Preconditions:** A credentials user exists with a known password and an assigned `activeDomainId`.
- **Steps:** Open `/login`, enter email + password, submit.
- **Expected:** Redirected to `/questions`. `session.user.id`, `.role`, `.activeDomainId` match the database row.

### TC-A04 — Sign in honours `callbackUrl`
- **Requirements:** AUTH-R11, R20 · AC-6
- **Level:** E2E
- **Preconditions:** Signed out; a valid user exists with a domain set.
- **Steps:** Navigate to `/questions` → observe redirect to `/login?callbackUrl=/questions` → sign in.
- **Expected:** After sign-in the browser is on `/questions`, not the default landing page.

### TC-A05 — Sign out
- **Requirements:** AUTH-R18 · AC-10
- **Level:** E2E
- **Preconditions:** Signed in.
- **Steps:** Open the avatar menu → "Sign out". Then navigate to `/questions`.
- **Expected:** Lands on `/login` after sign-out; the later `/questions` visit redirects back to `/login`.

### TC-A06 — Google sign-in creates a USER with no domain
- **Requirements:** AUTH-R12, R13
- **Level:** E2E (requires a Google test account or a mocked provider)
- **Preconditions:** `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` configured; the Google email has no existing account.
- **Steps:** Click "Continue with Google" and complete consent.
- **Expected:** `User` + `Account` rows created; `role = "USER"`, `activeDomainId = null`; browser ends on `/domain-select`.

## Validation cases

### TC-A07 — Registration field validation
- **Requirements:** AUTH-V1, V2 · AC-3
- **Level:** Unit (schema) + Integration (API)
- **Steps:** Submit each of these to `POST /api/auth/register`:

  | Body deviation | Expected message |
  |---|---|
  | `name: "A"` | "Name must be at least 2 characters" |
  | `email: "not-an-email"` | "Invalid email address" |
  | `password: "12345"` | "Password must be at least 6 characters" |
  | `confirmPassword` ≠ `password` | "Passwords do not match" |

- **Expected:** `400` in every case; no user created.

### TC-A08 — Only the first validation issue is returned
- **Requirements:** AUTH-V1
- **Level:** Integration
- **Steps:** `POST /api/auth/register` with `{ name: "A", email: "bad", password: "1", confirmPassword: "2" }`.
- **Expected:** `400` with exactly one message in `error` — the first Zod issue — not a list. This documents current behavior; it is listed as debt in `design.md`.

### TC-A09 — Login form client-side validation
- **Requirements:** AUTH-V1
- **Level:** Unit (component)
- **Steps:** Submit `/login` with an empty password, then with a malformed email.
- **Expected:** Inline field errors "Password is required" / "Invalid email address"; no network request is made.

## Error cases

### TC-A10 — Duplicate email
- **Requirements:** AUTH-R4 · AC-2
- **Level:** Integration
- **Preconditions:** `taken@example.com` already registered.
- **Steps:** `POST /api/auth/register` with that email.
- **Expected:** `409` with `{ error: "An account with this email already exists" }`; user count unchanged.

### TC-A11 — Wrong password
- **Requirements:** AUTH-R9, R10 · AC-5
- **Level:** E2E
- **Steps:** Sign in with a valid email and an incorrect password.
- **Expected:** Stays on `/login`; red banner reads exactly "Invalid email or password".

### TC-A12 — Unknown email produces the same message
- **Requirements:** AUTH-R10 · AC-5
- **Level:** E2E
- **Steps:** Sign in with an email that has no account.
- **Expected:** Identical banner text and identical response timing characteristics to TC-A11 (no account enumeration through the sign-in path).

### TC-A13 — OAuth-only account cannot use credentials
- **Requirements:** AUTH-R9, AUTH-B2 · AC-5
- **Level:** Integration
- **Preconditions:** A user row exists with `password = null` (created via Google).
- **Steps:** Attempt credentials sign-in with that email and any password.
- **Expected:** Rejected with the generic message; no crash from passing `null` to `bcrypt.compare`.

### TC-A14 — Database failure during registration
- **Requirements:** AUTH-E1
- **Level:** Integration (with the Prisma client stubbed to throw)
- **Steps:** Force `prisma.user.create` to reject; `POST /api/auth/register` with a valid body.
- **Expected:** `500` with `{ error: "Something went wrong" }` — the raw error is not leaked.

### TC-A15 — Malformed JSON body
- **Requirements:** AUTH-E1
- **Level:** Integration
- **Steps:** `POST /api/auth/register` with body `"{not json"` and `Content-Type: application/json`.
- **Expected:** `500 { error: "Something went wrong" }` (the `req.json()` throw is caught by the outer try/catch).

## Permission / authorization cases

### TC-A16 — Anonymous access to a protected page
- **Requirements:** AUTH-R19, R20 · AC-6
- **Level:** E2E
- **Steps:** Signed out, request `/questions`, `/topics`, `/profile`, `/interview` in turn.
- **Expected:** Each redirects to `/login?callbackUrl=<path>`.

### TC-A17 — Public routes stay public
- **Requirements:** AUTH-R19
- **Level:** E2E
- **Steps:** Signed out, request `/`, `/login`, `/register`.
- **Expected:** All render normally, no redirect.

### TC-A18 — Signed-in user bounced off auth routes
- **Requirements:** AUTH-R21 · AC-7
- **Level:** E2E
- **Steps:** While signed in, navigate to `/login`, then `/register`.
- **Expected:** Both redirect to `/questions`.

### TC-A19 — USER blocked from admin pages
- **Requirements:** AUTH-R28 · AC-8
- **Level:** E2E
- **Preconditions:** Signed in as `role = USER`.
- **Steps:** Navigate to `/admin/questions` and `/admin/topics`.
- **Expected:** Both redirect to `/questions`.

### TC-A20 — ADMIN reaches admin pages and sees the menu entry
- **Requirements:** AUTH-R28, R29 · AC-8
- **Level:** E2E
- **Preconditions:** Signed in as `role = ADMIN`.
- **Steps:** Open the avatar dropdown; click "Admin".
- **Expected:** The "Admin" item is present (it is absent for `USER`) and `/admin/questions` renders.

### TC-A21 — Landing page redirects authenticated users
- **Requirements:** AUTH-R24
- **Level:** E2E
- **Steps:** While signed in, navigate to `/`.
- **Expected:** Redirect to `/questions`.

### TC-A22 — API handlers reject a missing session
- **Requirements:** AUTH-R26, AUTH-E5
- **Level:** Integration (call the route handler directly, bypassing middleware)
- **Steps:** Invoke the exported `GET` of `src/app/api/questions/route.ts` with `auth()` mocked to return `null`.
- **Expected:** `401` with `{ error: "Unauthorized" }`.

### TC-A23 — Regression: unauthenticated `fetch` to an API route is redirected, not 401'd
- **Requirements:** AUTH-X1, AUTH-X2
- **Level:** Integration (through the running server, so middleware applies)
- **Steps:** Signed out, `fetch("/api/questions", { redirect: "manual" })` and `fetch("/api/domains", { redirect: "manual" })`.
- **Expected:** **`302` to `/login`**, not `401` JSON. This pins the current documented behavior; if the middleware matcher is later changed to exclude `/api`, this test should be updated to expect `401` for `/api/questions` — and `/api/domains` would then become genuinely public, which is the risk noted in `design.md`.

## Boundary and edge cases

### TC-A24 — Email case/whitespace is not normalized
- **Requirements:** AUTH-V3, AUTH-X6
- **Level:** Integration
- **Steps:** Register `user@example.com`, then register `User@Example.com`.
- **Expected:** **Both succeed** — two separate accounts. Documents current behavior; flagged as debt.

### TC-A25 — Minimum-length password boundary
- **Requirements:** AUTH-V2
- **Level:** Unit (schema)
- **Steps:** Validate passwords of length 5 and length 6.
- **Expected:** 5 rejected, 6 accepted.

### TC-A26 — Very long password
- **Requirements:** AUTH-V2
- **Level:** Integration
- **Steps:** Register with a 200-character password, then sign in with it; then sign in with only its first 72 bytes.
- **Expected:** Registration and sign-in both succeed. Record whether the 72-byte prefix also authenticates (bcrypt truncation) — this is untested behavior today and is listed as debt.

### TC-A27 — Role change does not affect a live session
- **Requirements:** AUTH-X4
- **Level:** Integration + E2E
- **Steps:** Sign in as `USER`. Update the row to `ADMIN` directly in the database. Without signing out, visit `/admin/questions`.
- **Expected:** Still redirected to `/questions`. After signing out and back in, the page renders. Documents the JWT staleness contract.

### TC-A28 — Domain set out-of-band is not reflected in the token
- **Requirements:** AUTH-X5, AUTH-B4
- **Level:** Integration
- **Steps:** Sign in with `activeDomainId = null` (so the user sits on `/domain-select`). Set `activeDomainId` directly in the database. Navigate to `/questions` without calling `update()`.
- **Expected:** Still redirected to `/domain-select`, because the middleware reads the JWT. Meanwhile `GET /api/questions` (which re-reads the DB) would scope to the new domain.

### TC-A29 — `callbackUrl` with a query string
- **Requirements:** AUTH-R20
- **Level:** E2E
- **Steps:** Signed out, request `/questions?topicId=abc&difficulty=HARD`.
- **Expected:** Redirect sets `callbackUrl` to the **pathname only** (`/questions`) — `req.nextUrl.pathname` is used, not the full URL — so the filters are lost after sign-in. Documents current behavior.

### TC-A30 — Static assets are not gated
- **Requirements:** AUTH-R19 (matcher)
- **Level:** Integration
- **Steps:** Signed out, request a file under `/_next/static/…` and under `/images/…`.
- **Expected:** Served directly, no redirect.

## Loading and empty states

### TC-A31 — Login button disabled through submission and redirect
- **Requirements:** AUTH-E4
- **Level:** Unit (component)
- **Steps:** Submit valid credentials with a slow `signIn` stub.
- **Expected:** Button text becomes "Signing in..." and stays disabled from submit until navigation completes (`isSubmitting || isRedirecting`).

### TC-A32 — Register button disabled while submitting
- **Requirements:** AUTH-E2
- **Level:** Unit (component)
- **Steps:** Submit the register form with a slow fetch stub.
- **Expected:** Button reads "Creating account..." and is disabled.

### TC-A33 — User menu renders nothing without a session
- **Level:** Unit (component)
- **Steps:** Render `UserMenu` with `useSession()` returning no session.
- **Expected:** Renders `null`, no avatar, no crash.

### TC-A34 — Avatar initials fallback
- **Level:** Unit (component)
- **Steps:** Render `UserMenu` for names `"Le Nguyen"`, `"Cher"`, and `null`.
- **Expected:** `"LN"`, `"C"`, and `"U"` respectively.

## API / network failure scenarios

### TC-A35 — Registration succeeds but auto sign-in fails
- **Requirements:** AUTH-R6
- **Level:** Integration (stub `signIn` to return an error)
- **Steps:** Complete registration with `signIn` forced to fail.
- **Expected:** Account exists in the database; browser is redirected to `/login` rather than `/questions`; no error toast.

### TC-A36 — Register endpoint returns a non-JSON error
- **Requirements:** AUTH-E2
- **Level:** Unit (component, fetch stubbed)
- **Steps:** Make `fetch` resolve with `ok: false` and a body that fails `res.json()`.
- **Expected:** Documents current behavior — `register-form.tsx` calls `await res.json()` unguarded, so this **throws inside `onSubmit`** and no banner appears. Worth pinning as a regression test.

### TC-A37 — Speech/AI-unrelated network outage during sign-in
- **Requirements:** AUTH-E3
- **Level:** E2E
- **Steps:** Sign in with the network offline.
- **Expected:** The form does not hang permanently in the disabled state without feedback. **Unknown / needs confirmation:** current behavior is not explicitly handled — `signIn` rejection is not caught in `onSubmit`.

## Regression-sensitive behavior

These are the places most likely to break silently:

| Area | Why it is fragile | Guard test |
|---|---|---|
| Credentials stub filtering in `auth.ts` | Removes the Edge stub by matching provider `id === "credentials"`; a NextAuth rename would reinstate the always-`null` stub | TC-A03 |
| `jwt` callback `trigger === "update"` branch | Only `activeDomainId` is honoured; adding fields elsewhere will not propagate | TC-A28, and see `domains/testcases.md` |
| Middleware ordering | The four branches are order-dependent; e.g. moving the domain gate above the sign-in gate would loop | TC-A16, TC-A18, TC-A23 |
| Middleware matcher | Controls whether `/api/*` is redirect-guarded; changing it changes TC-A23 and exposes `/api/domains` | TC-A23, TC-A30 |
| `next-auth.d.ts` augmentation | If the module augmentation stops applying, `session.user.role` becomes `any`/undefined and admin gates silently pass or fail | TC-A19, TC-A20 |
| bcrypt cost factor | Changing 12 invalidates nothing but affects latency; existing hashes still verify | TC-A01 |

## Recommended missing coverage

Highest value first, given that nothing is currently tested:

1. **Set up a test runner at all.** Vitest fits this stack (Next 16 + React 19 + TS). Without it, none of the above can be automated.
2. **Unit tests for `loginSchema` / `registerSchema`** — cheapest possible coverage of TC-A07, TC-A25; no database or server needed.
3. **Integration tests for `POST /api/auth/register`** with a test database or a mocked `prisma` — covers TC-A01, TC-A10, TC-A14, TC-A15.
4. **A middleware unit test** exercising the four branches with synthetic `req.auth` values — covers TC-A16 through TC-A23 without a browser and protects the most fragile logic in the feature.
5. **Unit test for `authorize()`** with `prisma.user.findUnique` and `bcrypt.compare` mocked — covers TC-A11, TC-A13 including the `password === null` path.
6. **E2E smoke test** (Playwright) for register → domain select → questions, and sign-in → sign-out. This is the only way to catch the middleware/page/API layering acting together.
7. **A regression test for TC-A23** specifically, because the current API-redirect behavior is surprising and undocumented outside these notes.
8. **No coverage exists for the Google path.** At minimum, a test that asserts a Google-created user gets `role = USER` and `activeDomainId = null` would protect the domain gate.
</content>
