# Domains — Test Cases

> Verification plan for **current** behavior. Requirement IDs refer to
> [`requirements.md`](./requirements.md).

## Existing automated tests

**None.** No test runner is installed and no test files exist in the repository.

## Happy path

### TC-D01 — List domains
- **Requirements:** DOM-R3, DOM-R4 · AC-1
- **Level:** Integration
- **Preconditions:** Seed has run.
- **Steps:** `GET /api/domains` as a signed-in user.
- **Expected:** `200` with three objects — Finance, Journalism, Software Engineering — in that (name-ascending) order. Each has exactly `id`, `name`, `slug`; no `createdAt`/`updatedAt`.

### TC-D02 — First-run domain selection
- **Requirements:** DOM-R5, R6, R8 · AC-2, AC-3
- **Level:** E2E
- **Preconditions:** Signed in with `activeDomainId = null`.
- **Steps:** Navigate to `/questions`; observe the redirect; click the "Software Engineering" card.
- **Expected:** Redirected to `/domain-select`; after the click, `User.activeDomainId` is set in the database and the browser lands on `/questions` without bouncing back.

### TC-D03 — Switch domain from the profile
- **Requirements:** DOM-R10, R11 · AC-5
- **Level:** E2E
- **Preconditions:** Signed in with Software Engineering active; questions exist in both SE and Finance.
- **Steps:** Open `/profile`, change the dropdown to "Finance". Then navigate to `/questions`.
- **Expected:** "Domain switched" toast; header badge reads "Finance"; the sidebar topic list refetches immediately; `/questions` shows only Finance questions.

### TC-D04 — Header badge reflects the active domain
- **Requirements:** DOM-R14 · AC-7
- **Level:** Unit (component)
- **Steps:** Render `DomainBadge` with a session whose `activeDomainId` matches a domain in the mocked `/api/domains` response.
- **Expected:** A badge with that domain's name. With an id absent from the list, the component renders `null`.

### TC-D05 — Questions are stamped with the active domain on create
- **Requirements:** DOM-R18 · AC-6
- **Level:** Integration
- **Preconditions:** Signed in with domain A active.
- **Steps:** `POST /api/questions` with a minimal valid body.
- **Expected:** The created row has `domainId = A`.

### TC-D06 — Topics are stamped with the active domain on create
- **Requirements:** DOM-R19
- **Level:** Integration
- **Steps:** With domain A active, `POST /api/topics` with `{ name: "New Topic" }`.
- **Expected:** Created row has `domainId = A`.

## Validation cases

### TC-D07 — Missing `domainId`
- **Requirements:** DOM-E1 · AC-4
- **Level:** Integration
- **Steps:** `PUT /api/domains/active` with `{}`, then with `{ domainId: null }`, then with `{ domainId: 123 }`.
- **Expected:** `400 { error: "domainId is required" }` in all three cases; the user's stored `activeDomainId` is unchanged.

### TC-D08 — Unknown `domainId`
- **Requirements:** DOM-E2 · AC-4
- **Level:** Integration
- **Steps:** `PUT /api/domains/active` with `{ domainId: "does-not-exist" }`.
- **Expected:** `404 { error: "Domain not found" }`; stored value unchanged.

### TC-D09 — Successful response shape
- **Requirements:** DOM-R8
- **Level:** Integration
- **Steps:** `PUT /api/domains/active` with a valid id.
- **Expected:** `200` with `{ domainId, domainName }` matching the target domain.

## Permission / authentication cases

### TC-D10 — Unauthenticated switch attempt
- **Requirements:** DOM-B2 (auth requirement)
- **Level:** Integration (handler invoked directly, `auth()` mocked to `null`)
- **Steps:** Call the `PUT` handler of `api/domains/active`.
- **Expected:** `401 { error: "Unauthorized" }`.

### TC-D11 — Any user may activate any domain
- **Requirements:** DOM-B2
- **Level:** Integration
- **Steps:** As a plain `USER`, switch to each of the three domains in turn.
- **Expected:** All succeed. Documents that there is no entitlement model.

### TC-D12 — `GET /api/domains` has no handler-level auth
- **Requirements:** DOM-R3 (and `authentication` AUTH-X2)
- **Level:** Integration (handler invoked directly, bypassing middleware)
- **Steps:** Call the exported `GET` with no session.
- **Expected:** **`200` with the domain list** — the handler does not check the session. This pins current behavior; protection today comes only from the middleware redirect. If a handler-level guard is later added, update this test to expect `401`.

### TC-D13 — Domain CRUD is absent
- **Requirements:** DOM-R1
- **Level:** Integration
- **Steps:** `POST /api/domains`, `PUT /api/domains/<id>`, `DELETE /api/domains/<id>`.
- **Expected:** `405` / `404` — no such handlers are exported. Guards against someone assuming CRUD exists.

## Scoping behavior

### TC-D14 — Question list is domain-scoped
- **Requirements:** DOM-R15 · AC-5
- **Level:** Integration
- **Preconditions:** Default questions exist in domain A and domain B.
- **Steps:** With A active, `GET /api/questions`. Switch to B, repeat.
- **Expected:** Each response contains only that domain's questions; no overlap.

### TC-D15 — Topic list is domain-scoped
- **Requirements:** DOM-R16
- **Level:** Integration
- **Steps:** With A active, `GET /api/topics`; then with B active.
- **Expected:** Only topics whose `domainId` matches, and which are default or created by the caller.

### TC-D16 — Sub-topic scoping differs with and without `topicId`
- **Requirements:** DOM-R17
- **Level:** Integration
- **Preconditions:** Topic T is in domain B; domain A is active.
- **Steps:** (a) `GET /api/subtopics` (no params). (b) `GET /api/subtopics?topicId=<T>`.
- **Expected:** (a) returns only sub-topics under domain-A topics. (b) returns T's sub-topics **even though T is in another domain** — the domain filter is skipped when `topicId` is supplied. Documents current behavior.

### TC-D17 — Editing does not re-stamp the domain
- **Requirements:** DOM-R21, DOM-X7 · AC-6
- **Level:** Integration
- **Preconditions:** Question Q created in domain A.
- **Steps:** Switch to domain B. `PUT /api/questions/<Q>` with a changed title.
- **Expected:** The update succeeds and `Q.domainId` is still `A`. Consequently Q does **not** appear in `/questions` while B is active — verify that too.

### TC-D18 — Switching domains preserves all content
- **Requirements:** DOM-R13 · AC-8
- **Level:** Integration
- **Steps:** Record counts of questions, topics, and `UserQuestionOverride` rows. Switch domain. Re-count.
- **Expected:** All counts unchanged; no rows mutated other than `User.activeDomainId`.

### TC-D19 — Shared profile uses the owner's domain
- **Requirements:** DOM-R24
- **Level:** Integration
- **Preconditions:** Owner O has domain A active; viewer V has domain B active; O has questions in A.
- **Steps:** As V, open `/share/<O.shareSlug>`.
- **Expected:** O's domain-A questions are listed, not filtered by V's domain B.

### TC-D20 — Interview session records the domain
- **Requirements:** DOM-R23
- **Level:** Integration
- **Steps:** With domain A active, create an interview session in random mode.
- **Expected:** `InterviewSession.domainId = A`, and every selected question belongs to A.

## Edge cases

### TC-D21 — Domain-less user: topics vs. questions diverge
- **Requirements:** DOM-X1
- **Level:** Integration
- **Preconditions:** A user with `activeDomainId = null`; all seeded topics and questions have a non-null `domainId`.
- **Steps:** Call the `GET` handlers of `/api/topics` and `/api/questions` directly (bypassing the middleware redirect that would normally intervene).
- **Expected:** `/api/topics` returns **an empty array** (the filter becomes `domainId IS NULL`), while `/api/questions` returns **questions from every domain** (the filter is skipped). This asymmetry is the highest-value bug-shaped behavior to pin down.

### TC-D22 — JWT and database disagree after an out-of-band change
- **Requirements:** DOM-X2
- **Level:** Integration
- **Steps:** Sign in with `activeDomainId = null`. Set it to A directly in the database. Without calling `update()`, request `/questions` in the browser, then `GET /api/questions`.
- **Expected:** The page redirects to `/domain-select` (JWT still null) while the API scopes to A (database read). Documents the staleness contract.

### TC-D23 — `/domain-select` reachable with a domain already set
- **Requirements:** DOM-X3
- **Level:** E2E
- **Steps:** With a domain active, navigate directly to `/domain-select` and pick a different one.
- **Expected:** The page renders (no redirect away) and the switch works — an undocumented second switch path.

### TC-D24 — Moving a sub-topic across domains
- **Requirements:** DOM-X4
- **Level:** Integration
- **Preconditions:** Sub-topic S under topic T1 (domain A); topic T2 in domain B, created by the same user.
- **Steps:** `PUT /api/subtopics/<S>` with `{ name: S.name, topicId: T2 }`.
- **Expected:** Succeeds with no warning; S is now effectively in domain B. Documents current behavior.

### TC-D25 — Cross-domain topic linking on question create
- **Requirements:** DOM-X5
- **Level:** Integration
- **Preconditions:** Domain A active; topic T belongs to domain B.
- **Steps:** `POST /api/questions` with `topicIds: [T]`.
- **Expected:** `201` — the link is created with no validation error. The question is in A but tagged with a B topic.

### TC-D26 — Questions cache is not revalidated on switch
- **Requirements:** DOM-X6
- **Level:** E2E
- **Steps:** Open `/questions`, then switch domain from `/profile` in the same session, then navigate back to `/questions` **using the browser back button**.
- **Expected:** Document what the user sees. Only `/api/topics` is explicitly revalidated, so the sidebar updates while the question list may show stale content until a hard navigation or refresh.

### TC-D27 — Admin questions page with no active domain
- **Requirements:** DOM-R22, DOM-X8
- **Level:** Integration
- **Preconditions:** An `ADMIN` with `activeDomainId = null`; default questions in multiple domains.
- **Steps:** Render `/admin/questions`.
- **Expected:** **All** default questions across every domain are listed — a third scoping rule, different from both TC-D21 behaviors.

### TC-D28 — Unknown slug falls back to the default icon
- **Requirements:** DOM-R7
- **Level:** Unit (component)
- **Steps:** Render `/domain-select` with a mocked domain whose slug is `"marketing"`.
- **Expected:** The card renders with the `BookOpen` icon rather than crashing or showing an empty slot.

## Loading and empty states

### TC-D29 — Domain-select loading skeleton
- **Requirements:** DOM-R6
- **Level:** Unit (component)
- **Steps:** Render `/domain-select` with SWR in the loading state.
- **Expected:** Three `Skeleton` blocks in a responsive grid; no cards, no error text.

### TC-D30 — Empty domain list
- **Requirements:** DOM-E5
- **Level:** Unit (component)
- **Steps:** Render `/domain-select` with `/api/domains` returning `[]`.
- **Expected:** Heading and description render with an empty grid below — there is no dedicated empty state. A user in this position is stuck, since middleware will keep redirecting them here. Worth pinning.

### TC-D31 — Selection in flight disables further clicks
- **Requirements:** DOM-R9
- **Level:** Unit (component)
- **Steps:** Click a card with a slow `fetch` stub, then immediately click a different card.
- **Expected:** The first card is dimmed (`opacity-70 border-primary`); the second click issues no request.

### TC-D32 — Profile dropdown disabled while loading or switching
- **Requirements:** DOM-R12
- **Level:** Unit (component)
- **Steps:** Render the profile page with `/api/domains` pending; then with a slow switch in flight.
- **Expected:** The `Select` is disabled in both states.

## API / network failure scenarios

### TC-D33 — Silent failure on `/domain-select`
- **Requirements:** DOM-E3
- **Level:** Unit (component)
- **Steps:** Stub `PUT /api/domains/active` to return `500`. Click a card.
- **Expected:** No toast, no inline error, no navigation — the card simply un-dims. Documents current behavior; flagged as debt in `design.md`.

### TC-D34 — Failed switch on the profile page
- **Requirements:** DOM-E4
- **Level:** Unit (component)
- **Steps:** Stub the endpoint to return `404`. Change the dropdown.
- **Expected:** "Failed to switch domain" toast; the dropdown shows the previous domain; the session is not updated.

### TC-D35 — `/api/domains` unavailable
- **Requirements:** DOM-E5
- **Level:** Unit (component)
- **Steps:** Make the endpoint reject on `/domain-select`, `/profile`, and in the header.
- **Expected:** Domain-select shows an empty grid, the profile dropdown stays disabled, and the header badge is hidden. No error is surfaced anywhere — SWR's `error` is never read.

## Regression-sensitive behavior

| Area | Why it is fragile | Guard test |
|---|---|---|
| The two null-domain patterns | `{ domainId: null }` vs. `...(domainId ? {} : {})` behave oppositely and are easy to "unify" incorrectly | TC-D21 |
| Six duplicated active-domain lookups | A rule change applied to only some routes produces partial scoping | TC-D14, TC-D15, TC-D20 |
| `update({ activeDomainId })` after the PUT | Dropping it leaves the JWT stale and re-triggers the `/domain-select` redirect loop | TC-D02 |
| `isApiRoute` exclusion in the middleware gate | Removing it makes `/domain-select`'s own fetches redirect, deadlocking first-run setup | TC-D02 |
| `globalMutate("/api/topics")` on switch | Dropping it leaves the sidebar showing the previous domain's topics | TC-D03 |
| Domain stamping on create | Silently dropping `domainId` from `question.create` makes new questions invisible (they'd land in the null bucket) | TC-D05, TC-D06 |
| Slug values | The icon map and the seed's backfill both hard-code slugs | TC-D28 |

## Recommended missing coverage

1. **TC-D21 first.** The divergent null-domain handling is the single most surprising behavior in this
   feature and currently has no protection at all.
2. **Integration tests for `PUT /api/domains/active`** covering all four responses (401/400/404/200) —
   cheap, and this is the only mutating endpoint in the feature.
3. **A scoping test matrix**: for each of `/api/questions`, `/api/topics`, `/api/subtopics`,
   `/api/questions/export`, and interview random-selection, assert domain isolation with two domains
   populated. These five paths each re-implement scoping independently.
4. **A test asserting `Question.domainId` is unchanged by `PUT`** (TC-D17) — the "edited a question
   and it vanished from my list" failure mode is invisible without it.
5. **Component tests for the three failure/empty states** (TC-D30, TC-D33, TC-D35), since all three
   currently fail silently and would be easy to regress further.
6. **No coverage exists for cross-domain referential integrity** (TC-D25, TC-D24). If validation is
   ever added, these tests should flip from "documents permissiveness" to "asserts rejection".
7. **A seed idempotency test** — running `prisma/seed.ts` twice should not duplicate domains or
   re-backfill already-assigned content.
</content>
