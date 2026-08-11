# Profile Sharing — Test Cases

> Verification plan for **current** behavior. Requirement IDs refer to
> [`requirements.md`](./requirements.md).

## Existing automated tests

**None.** No test runner is installed and no test files exist in the repository.

## Happy path

### TC-P01 — Generate a share link
- **Requirements:** PS-R1, R2 · AC-1
- **Level:** Integration
- **Preconditions:** Signed in with `shareSlug = null`.
- **Steps:** `POST /api/profile/share`.
- **Expected:** `200` with `{ shareSlug }`; the slug is exactly 10 characters; `User.shareSlug` is set to that value.

### TC-P02 — Regenerate replaces the slug
- **Requirements:** PS-R3, R4 · AC-2
- **Level:** Integration
- **Steps:** `POST /api/profile/share` twice, recording both slugs.
- **Expected:** The two slugs differ; the stored value equals the second; `/share/<first slug>` now renders not-found.

### TC-P03 — Share card states
- **Requirements:** PS-R7, R8, R9, R11
- **Level:** Unit (component)
- **Steps:** Render `/profile` with `shareSlug: null`, then with a slug.
- **Expected:** First shows a "Generate Share Link" button only. Second shows a read-only monospace input containing `<origin>/share/<slug>`, plus copy and regenerate buttons. The explanatory text mentioning that viewers must be logged in is present in both.

### TC-P04 — Copy to clipboard
- **Requirements:** PS-R10
- **Level:** Unit (component)
- **Steps:** With a slug present, click the copy button (clipboard API stubbed).
- **Expected:** `navigator.clipboard.writeText` called with the full URL; toast "Link copied to clipboard".

### TC-P05 — View a shared collection
- **Requirements:** PS-R14, R16, R17 · AC-4
- **Level:** E2E
- **Preconditions:** Owner O (named "Le") has: default D, an override on D, private question P, and a hidden question H. Viewer V is signed in.
- **Steps:** V opens `/share/<O's slug>`.
- **Expected:** Heading "Le's Questions"; subheading "Viewing shared collection · N questions"; D shown with **O's overridden content**; P shown; **H absent**.

### TC-P06 — Update the profile name
- **Requirements:** PS-R12
- **Level:** Integration
- **Steps:** `PUT /api/profile` with `{ name: "New Name" }`.
- **Expected:** `200`; the response contains the new name; the database row is updated.

### TC-P07 — Profile GET shape
- **Requirements:** PS-R13
- **Level:** Integration
- **Steps:** `GET /api/profile`.
- **Expected:** Exactly `id`, `name`, `email`, `image`, `shareSlug`, `role`, `activeDomainId`, and a nested `activeDomain` with `id`, `name`, `slug`. No `password` field is present — assert this explicitly.

## Permission and authentication cases

### TC-P08 — Anonymous visitor is redirected
- **Requirements:** PS-R15 · AC-3
- **Level:** E2E
- **Steps:** Signed out, open `/share/<valid slug>`.
- **Expected:** Redirect to `/login?callbackUrl=/share/<slug>`; after signing in, the shared page renders.

### TC-P09 — Page-level auth guard independent of middleware
- **Requirements:** PS-R15
- **Level:** Integration (render the Server Component with `auth()` mocked to `null`)
- **Expected:** `redirect("/login")` is called — the page does not rely on the middleware alone.

### TC-P10 — Profile endpoints require a session
- **Requirements:** PS-E1
- **Level:** Integration (handlers called directly, `auth()` mocked to `null`)
- **Steps:** Invoke `GET /api/profile`, `PUT /api/profile`, `POST /api/profile/share`, `GET /api/users/[slug]/questions`.
- **Expected:** `401 { error: "Unauthorized" }` from all four.

### TC-P11 — Cannot read or write another user's profile
- **Requirements:** PS-P1
- **Level:** Integration
- **Steps:** As user B, attempt to pass a `userId` in the body to `PUT /api/profile`; then read `GET /api/profile`.
- **Expected:** The extra field is ignored; only B's own row is affected and returned. Confirms the scoping is structural.

### TC-P12 — Any signed-in user may view any slug
- **Requirements:** PS-P2, PS-X3
- **Level:** Integration
- **Steps:** As an unrelated user with no connection to the owner, open `/share/<slug>`.
- **Expected:** **Full read access.** Documents that slug knowledge is the only access control.

### TC-P13 — Shared page is fully read-only
- **Requirements:** PS-R20, PS-B5 · AC-5, AC-10
- **Level:** Unit (component) + E2E
- **Steps:** Render `QuestionList` with `readOnly`; inspect the DOM on `/share/<slug>`.
- **Expected:** No star **button**, no edit link, no delete button on any card. No network request originating from the page can mutate the owner's data.

### TC-P14 — Admins get no special access
- **Requirements:** PS-P3
- **Level:** Integration
- **Steps:** As `ADMIN`, try to read another user's `shareSlug` through any endpoint.
- **Expected:** No endpoint exposes it.

## Data-scoping cases

### TC-P15 — Overrides are the owner's, not the viewer's
- **Requirements:** PS-R17 · AC-4
- **Level:** Integration
- **Preconditions:** Default D. Owner O overrode D's answer to "O's answer". Viewer V overrode the same D to "V's answer".
- **Steps:** V opens `/share/<O's slug>`.
- **Expected:** **"O's answer"** is displayed. This is the defining behavior of the feature — the read runs as the owner.

### TC-P16 — Stars are the owner's
- **Requirements:** PS-R21, PS-B6 · AC-6
- **Level:** Integration
- **Preconditions:** O starred question X; V starred question Y; both visible.
- **Steps:** V opens the shared page.
- **Expected:** X shows a filled star; Y shows none.

### TC-P17 — Hidden questions are excluded
- **Requirements:** PS-R17
- **Level:** Integration
- **Preconditions:** O has an override on D with `isHidden = true`.
- **Steps:** V opens the shared page.
- **Expected:** D is absent, even though V can see D on their own `/questions`.

### TC-P18 — Owner's domain wins
- **Requirements:** PS-R18 · AC-8
- **Level:** Integration
- **Preconditions:** O's active domain is A; V's is B; questions exist in both.
- **Steps:** V opens the shared page.
- **Expected:** Only domain-A questions appear.

### TC-P19 — Private questions are exposed
- **Requirements:** PS-B4, PS-X5
- **Level:** Integration
- **Preconditions:** O has private question P that V cannot otherwise see.
- **Steps:** V opens the shared page.
- **Expected:** P **is visible**. Documents the disclosure scope.

### TC-P20 — Domain-less owner shares across all domains
- **Requirements:** PS-X8
- **Level:** Integration
- **Preconditions:** O has `activeDomainId = null`; questions exist in several domains.
- **Steps:** V opens the shared page.
- **Expected:** Questions from **every** domain appear, because `getQuestionsForUser` skips the filter when the domain is falsy. Contrast with `/api/topics`, which returns nothing for the same input.

### TC-P21 — Live view, not a snapshot
- **Requirements:** PS-B3
- **Level:** E2E
- **Steps:** V loads the shared page. O then edits a question and adds a new one. V reloads.
- **Expected:** V sees the edit and the new question — no caching or snapshotting.

## Boundary and edge cases

### TC-P22 — Shared view is capped at 50
- **Requirements:** PS-R19, PS-X2
- **Level:** Integration
- **Preconditions:** O has 75 visible questions.
- **Steps:** V opens the shared page.
- **Expected:** **Exactly 50** rendered, the header reads "50 questions", and there is **no indication** that 25 were omitted. Pins the truncation.

### TC-P23 — Unknown slug
- **Requirements:** PS-E2 · AC-7
- **Level:** Integration
- **Steps:** Open `/share/doesnotexist`.
- **Expected:** The not-found page; no information about whether any user exists.

### TC-P24 — Empty slug segment
- **Requirements:** PS-V5
- **Level:** Integration
- **Steps:** Open `/share/` and `/share/%20`.
- **Expected:** `/share/` does not match the dynamic route; the whitespace slug resolves to no user and renders not-found. No crash.

### TC-P25 — Owner with no name
- **Requirements:** PS-R16
- **Level:** Integration
- **Preconditions:** O has `name = null`.
- **Steps:** V opens the shared page.
- **Expected:** Heading reads "User's Questions".

### TC-P26 — Owner with an empty collection
- **Requirements:** PS-R16
- **Level:** Integration
- **Preconditions:** O has no visible questions in their domain.
- **Steps:** V opens the shared page.
- **Expected:** Subheading "· 0 questions" (singular/plural handled) and the `QuestionList` empty state "No questions found".

### TC-P27 — Singular/plural in the count
- **Requirements:** PS-R16
- **Level:** Unit
- **Steps:** Render with 0, 1, and 2 questions.
- **Expected:** "0 questions", "1 question", "2 questions".

### TC-P28 — Owner switches domain after sharing
- **Requirements:** PS-X7
- **Level:** E2E
- **Steps:** V loads the shared page. O switches from domain A to B. V reloads.
- **Expected:** The collection silently changes to B's questions. Documents the surprise.

### TC-P29 — No revoke path exists
- **Requirements:** PS-B7, PS-X4
- **Level:** Integration
- **Steps:** Look for a `DELETE /api/profile/share`; try to set `shareSlug` to `null` through any endpoint.
- **Expected:** No such capability. Guards against assuming revocation exists.

### TC-P30 — Shared-page layout has no app chrome
- **Requirements:** PS-R23
- **Level:** E2E
- **Steps:** Open `/share/<slug>` and inspect the DOM.
- **Expected:** No header, no domain badge, no user menu, no sidebar — the route sits outside the `(main)` group.

### TC-P31 — Viewer retains display controls
- **Requirements:** PS-R22, PS-X15
- **Level:** Unit (component)
- **Steps:** Render the shared list and use the width and font-size buttons; expand a card.
- **Expected:** All work in read-only mode.

### TC-P32 — Related-question links leave the shared view
- **Requirements:** PS-X16
- **Level:** E2E
- **Preconditions:** A shared question has a related link.
- **Steps:** Expand the card and click the related question.
- **Expected:** Navigation to **`/questions#q-<id>`** — the viewer's own list, not the shared collection — where the target is usually absent. Pins the broken navigation.

### TC-P33 — Share URL uses the current origin
- **Requirements:** PS-R9, PS-X13
- **Level:** Unit (component)
- **Steps:** Render `/profile` with `window.location.origin` stubbed to a preview host.
- **Expected:** The displayed URL uses that host. Documents that links carry whatever origin generated them.

### TC-P34 — Share URL is null before hydration
- **Requirements:** PS-R9
- **Level:** Unit
- **Steps:** Evaluate `shareUrl` with `window` undefined.
- **Expected:** `null` — the `typeof window !== "undefined"` guard prevents an SSR crash.

## Validation cases

### TC-P35 — Profile name has no server validation
- **Requirements:** PS-V2, PS-X10
- **Level:** Integration
- **Steps:** `PUT /api/profile` with `{ name: "" }`, then `{ name: "x".repeat(10000) }`, then `{ name: 12345 }`, then `{ name: null }`.
- **Expected:** Document the actual outcome of each. Empty and very long strings are **accepted**; a number and `null` are passed straight to Prisma. This is the only unvalidated mutating endpoint in the app and the test should pin exactly how far it can be pushed.

### TC-P36 — Omitting `name` is a no-op
- **Requirements:** PS-V3
- **Level:** Integration
- **Steps:** `PUT /api/profile` with `{}`.
- **Expected:** `200`; the stored name is **unchanged** (Prisma treats `undefined` as "do not update").

### TC-P37 — Client blocks an empty name
- **Requirements:** PS-V4
- **Level:** Unit (component)
- **Steps:** Clear the name field and click Save.
- **Expected:** No request is issued (`if (!name.trim()) return`).

### TC-P38 — Name input falls back to the stored value
- **Requirements:** PS-X12
- **Level:** Unit (component)
- **Steps:** With a stored name of "Le", clear the input.
- **Expected:** The input **redisplays "Le"** rather than staying empty, because of `value={name || profile?.name || ""}`. Pins the confusing behavior.

### TC-P39 — Share endpoint ignores any body
- **Requirements:** PS-V1
- **Level:** Integration
- **Steps:** `POST /api/profile/share` with `{ shareSlug: "chosen-slug" }`.
- **Expected:** The body is ignored; a random slug is generated. Confirms a caller cannot choose their own slug.

## JSON endpoint cases

### TC-P40 — Endpoint returns the same data as the page
- **Requirements:** PS-R24 · AC-9
- **Level:** Integration
- **Steps:** `GET /api/users/<slug>/questions` and compare with the page's rendered set.
- **Expected:** Identical question ids in the same order; the response also contains `user: { id, name, activeDomainId, activeDomain: { name } }`.

### TC-P41 — Endpoint 404s for an unknown slug
- **Requirements:** PS-R25, PS-E3
- **Level:** Integration
- **Steps:** `GET /api/users/nope/questions`.
- **Expected:** `404 { error: "User not found" }`.

### TC-P42 — Endpoint has no UI caller
- **Requirements:** PS-R26, PS-X9
- **Level:** Static check
- **Steps:** Search the codebase for `"/api/users/"`.
- **Expected:** Matches only the route definition itself. Also assert the response exposes the owner's internal `id` — a note for anyone who later wires it up.

## Loading and empty states

### TC-P43 — Profile page before data arrives
- **Level:** Unit (component)
- **Steps:** Render `/profile` with both SWR keys pending.
- **Expected:** Email and name inputs render empty rather than crashing; the domain select is disabled; the share card shows the Generate button (since `shareSlug` is undefined).

### TC-P44 — Saving state on the name form
- **Level:** Unit (component)
- **Steps:** Save with a slow fetch stub.
- **Expected:** The Save button is disabled during the request.

## API / network failure scenarios

### TC-P45 — Generate failure
- **Requirements:** PS-E4
- **Level:** Unit (component)
- **Steps:** Stub `POST /api/profile/share` to return `500`.
- **Expected:** Toast "Failed to generate link"; the card still shows the Generate button; no slug appears.

### TC-P46 — Name update failure
- **Requirements:** PS-E5
- **Level:** Unit (component)
- **Steps:** Stub `PUT /api/profile` to return `500`.
- **Expected:** Toast "Failed to update"; the SWR cache is not mutated; `updateSession` is not called.

### TC-P47 — Clipboard failure still reports success
- **Requirements:** PS-E7
- **Level:** Unit (component)
- **Steps:** Stub `navigator.clipboard.writeText` to reject.
- **Expected:** The success toast **still appears** and the rejection is unhandled. Pins the bug flagged in `design.md`.

### TC-P48 — Slug collision
- **Requirements:** PS-E6
- **Level:** Integration
- **Steps:** Force `nanoid` to return an already-used slug; call the endpoint.
- **Expected:** **Unhandled `P2002` → `500`** with no retry. Documents the missing collision handling.

### TC-P49 — Name update does not refresh the header
- **Requirements:** PS-X11
- **Level:** E2E
- **Steps:** Change the name on `/profile` and observe the user menu.
- **Expected:** Document whether the displayed name updates. The `jwt` callback handles only `activeDomainId` on `trigger === "update"`, so the JWT name is not explicitly refreshed. See [`../authentication/testcases.md`](../authentication/testcases.md) TC-A03.

## Regression-sensitive behavior

| Area | Why it is fragile | Guard test |
|---|---|---|
| `getQuestionsForUser(targetUser.id, …)` | Passing `session.user.id` instead would show the **viewer's** collection under the owner's name — a silent, serious data-exposure inversion | TC-P15, TC-P16 |
| `targetUser.activeDomainId` | Substituting the viewer's domain changes the shared set | TC-P18 |
| `readOnly` prop threading | Losing it would render edit/delete controls on someone else's collection | TC-P13 |
| Anonymous redirect on `/share/[slug]` | Removing it makes every shared collection publicly readable | TC-P08, TC-P09 |
| Route placement outside `(main)` | Moving it inside would wrap a shared page in the viewer's app chrome | TC-P30 |
| `shareSlug` uniqueness | Dropping `@unique` would let two users collide and make lookups non-deterministic | TC-P48 |
| Default `limit` in `getQuestionsForUser` | Changing it silently changes how much of a collection is shared | TC-P22 |
| Profile `select` lists | Adding `password` to any `select` would leak the hash | TC-P07 |

## Recommended missing coverage

Ordered by value:

1. **TC-P15 / TC-P16 (owner-perspective reads)** — the correctness of the entire feature rests on
   passing the *owner's* id into `getQuestionsForUser`. An accidental swap to `session.user.id` would
   show each viewer their own questions under someone else's name, and nothing would catch it.
2. **TC-P13 + TC-P08/TC-P09 (read-only and auth guards)** — the security boundary of the feature.
3. **TC-P07 (profile response shape)** — an explicit assertion that `password` is never selected.
   Cheap insurance on a `select` list that someone will eventually widen.
4. **TC-P35 (unvalidated name)** — this endpoint accepts anything; a test recording exactly what gets
   through is the prerequisite for adding validation safely.
5. **TC-P22 (50-question cap)** — silent truncation of shared content is the most likely user-visible
   complaint.
6. **Pin the known-odd behaviors** so they change deliberately: TC-P12 (slug is the only control),
   TC-P19 (private questions exposed), TC-P20 (domain-less owner shares everything),
   TC-P32 (related links escape the shared view), TC-P47 (false copy success).
7. **TC-P42 (dead endpoint)** — record that `/api/users/[slug]/questions` has no caller before someone
   assumes it is load-bearing.
8. **No coverage exists for the interaction between sharing and overrides.** A combined test that
   sets up owner and viewer overrides on the same question (TC-P15) is the clearest way to document
   how the two features compose.
</content>
