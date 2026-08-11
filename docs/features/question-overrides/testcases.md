# Question Overrides — Test Cases

> Verification plan for **current** behavior. Requirement IDs refer to
> [`requirements.md`](./requirements.md).

## Existing automated tests

**None.** No test runner is installed and no test files exist in the repository.

This feature is the most logic-dense in the codebase and has zero coverage. Its failure modes are
also the least visible — a broken merge shows the wrong text rather than throwing.

## Happy path

### TC-O01 — Create an override
- **Requirements:** OV-R1, OV-B1 · AC-1
- **Level:** Integration
- **Preconditions:** Default question D authored by an admin; signed in as user A.
- **Steps:** `PUT /api/questions/<D>/override` with `{ answer: "<p>My own answer</p>" }`.
- **Expected:** `200` with the override row. Exactly one `UserQuestionOverride` row exists for `(A, D)`. The `Question` row is **byte-identical** to before — compare every column including `updatedAt`.

### TC-O02 — Override is visible only to its owner
- **Requirements:** OV-B1, OV-B8 · AC-2
- **Level:** Integration
- **Preconditions:** TC-O01 applied.
- **Steps:** `GET /api/questions` as user A, then as user B.
- **Expected:** A sees the custom answer with `hasOverride: true`; B sees the admin's answer with `hasOverride: false`.

### TC-O03 — Update an existing override
- **Requirements:** OV-R1 (upsert)
- **Level:** Integration
- **Steps:** `PUT` the override twice with different answers.
- **Expected:** Still exactly one row for `(A, D)`; it holds the second answer. No unique-constraint error.

### TC-O04 — Reset restores the original
- **Requirements:** OV-R20, R21 · AC-4
- **Level:** Integration
- **Steps:** `DELETE /api/questions/<D>/override`, then `GET /api/questions`.
- **Expected:** `200 { success: true }`; no override row; the question reads exactly as the admin wrote it; `hasOverride` is `false`.

### TC-O05 — Reset is idempotent
- **Requirements:** OV-R21, OV-E4 · AC-4
- **Level:** Integration
- **Steps:** `DELETE /api/questions/<D>/override` on a question that has never been overridden; then call it twice more.
- **Expected:** `200 { success: true }` every time; no error, no `404`.

### TC-O06 — Override the difficulty only
- **Requirements:** OV-R3, OV-R12 · AC-5
- **Level:** Integration
- **Preconditions:** Default D with `difficulty = EASY` and all six text fields populated.
- **Steps:** `PUT` with `{ difficulty: "HARD" }` only.
- **Expected:** Effective difficulty is `HARD`; **all six text fields still resolve to the admin's originals**.

### TC-O07 — Customize through the UI
- **Requirements:** OV-R6, R7, R8, R9, R11
- **Level:** E2E
- **Steps:** As a non-admin, click the pencil on a default question.
- **Expected:** Heading "Customize Question", subtitle "Your changes will only be visible to you.", the editor pre-filled with effective content, and **no** topic / sub-topic / related-question / `isDefault` controls. Saving shows "Override saved" and returns to the list.

## Merge semantics — the core of the feature

### TC-O08 — Per-field merge after an admin edit
- **Requirements:** OV-B4, OV-X4 · AC-6
- **Level:** Integration
- **Preconditions:** Default D. User A overrides **only** `answer`.
- **Steps:** Admin edits D changing **both** `question` and `answer` via `PUT /api/questions/<D>`. Then `GET /api/questions` as A.
- **Expected:** A sees the admin's **new question** together with **A's own answer**. This is the single most important behavior in the feature.

### TC-O09 — Null falls back, empty string wins
- **Requirements:** OV-R12, OV-X1, OV-X2
- **Level:** Unit (of the merge) + Integration
- **Steps:** Store an override with `answerVn: null` and `question: ""`.
- **Expected:** `answerVn` resolves to the **admin's** Vietnamese answer (`null ?? original`); `question` resolves to `""` (`"" ?? original` → `""`). Pins the `??` semantics and the asymmetry described in `design.md`.

### TC-O10 — Clearing a translated field silently reverts it
- **Requirements:** OV-X1
- **Level:** E2E
- **Preconditions:** Default D has a Vietnamese answer; user A has overridden it.
- **Steps:** Open the override form, clear the Vietnamese answer editor, save. Reopen the form.
- **Expected:** The **admin's** Vietnamese answer is back, because the form sent `null`. Documents that "override to blank" is inexpressible.

### TC-O11 — Blanking the English question is possible
- **Requirements:** OV-X2
- **Level:** E2E
- **Steps:** In override mode, clear the English question editor and save (bypassing the client guard by leaving whitespace, or by calling the API with `{ question: "" }`).
- **Expected:** Via the API, `200` and the card renders with an **empty title**. Documents the accidental asymmetry; a fix should make this test's expectation change deliberately.

### TC-O12 — Non-overridable fields are never affected
- **Requirements:** OV-R14
- **Level:** Integration
- **Steps:** Store an override for D, then read D through `getQuestionsForUser`.
- **Expected:** `isDefault`, `createdBy`, `createdAt`, `updatedAt`, `topics`, `subTopics`, and `relatedTo` all come from the original, regardless of override content.

### TC-O13 — Overridden values participate in filtering
- **Requirements:** OV-R15 · AC-8
- **Level:** Integration
- **Preconditions:** Default D is `EASY`; user A overrides it to `HARD`.
- **Steps:** `GET /api/questions?difficulty=HARD` as A and as B.
- **Expected:** D is returned for A and **not** for B. Confirms the merge runs before filtering.

### TC-O14 — Overridden text is searchable
- **Requirements:** OV-R15
- **Level:** Integration
- **Preconditions:** User A overrides D's question text to contain "hoisting"; the original does not.
- **Steps:** `GET /api/questions?search=hoisting` as A and as B.
- **Expected:** Returned for A only.

### TC-O15 — `hasOverride` reflects row existence, not difference
- **Requirements:** OV-R16, OV-X5
- **Level:** Integration
- **Steps:** `PUT /api/questions/<D>/override` with `{}` (empty body). Read the list.
- **Expected:** `200`; a row is created with all nulls; the question resolves **identically to the original** yet `hasOverride: true` and the card shows the "Customized" badge. Pins the false-positive badge.

### TC-O16 — Saving without editing anything creates an override
- **Requirements:** OV-X3
- **Level:** E2E
- **Steps:** Open the override form on an un-customized default and click Save immediately.
- **Expected:** An override row is created and the badge appears, even though nothing changed.

## Validation cases

### TC-O17 — Empty body is valid
- **Requirements:** OV-V1
- **Level:** Unit (schema) + Integration
- **Steps:** Parse `{}` with `overrideSchema`; `PUT` with `{}`.
- **Expected:** Parse succeeds with no keys; the API returns `200`.

### TC-O18 — Partial update leaves omitted fields alone
- **Requirements:** OV-R4
- **Level:** Integration
- **Steps:** `PUT` with `{ answer: "A1", difficulty: "HARD" }`. Then `PUT` with `{ difficulty: "EASY" }` only.
- **Expected:** After the second call the row still has `answer = "A1"` and now `difficulty = "EASY"`. Confirms the spread-into-`update` partial semantics.

### TC-O19 — Invalid difficulty rejected
- **Requirements:** OV-V3
- **Level:** Integration
- **Steps:** `PUT` with `{ difficulty: "IMPOSSIBLE" }`.
- **Expected:** `400` with the first Zod message; no row written.

### TC-O20 — Override schema allows an empty question body
- **Requirements:** OV-V2
- **Level:** Unit (schema)
- **Steps:** Parse `{ question: "" }` with `overrideSchema`, then with `questionSchema`.
- **Expected:** `overrideSchema` **accepts** it; `questionSchema` **rejects** it with "Question is required". Documents the divergence between the two schemas.

### TC-O21 — Client guard still applies in override mode
- **Requirements:** OV-V4
- **Level:** Unit (component)
- **Steps:** In override mode, clear the question editor to `"<p></p>"` and save.
- **Expected:** Toast "Question content is required"; no request issued.

## Permission and scoping cases

### TC-O22 — Cannot override a private question
- **Requirements:** OV-R2, OV-B3 · AC-3
- **Level:** Integration
- **Steps:** `PUT /api/questions/<own private question>/override`.
- **Expected:** `400 { error: "Can only override default questions" }`; no row created.

### TC-O23 — Unknown id returns 400, not 404
- **Requirements:** OV-E2
- **Level:** Integration
- **Steps:** `PUT /api/questions/does-not-exist/override`.
- **Expected:** **`400 { error: "Can only override default questions" }`** — the same response as a non-default question. Pins the conflation flagged in `design.md`.

### TC-O24 — Unauthenticated access
- **Requirements:** OV-E1
- **Level:** Integration (handler called directly with `auth()` mocked to `null`)
- **Steps:** Invoke `PUT` and `DELETE`.
- **Expected:** `401 { error: "Unauthorized" }` from both.

### TC-O25 — Overrides are scoped to the caller
- **Requirements:** OV-P1 · AC-10
- **Level:** Integration
- **Preconditions:** Users A and B both have overrides on default D with different text.
- **Steps:** Read the list and the export as each user; try to find any endpoint that accepts a `userId`.
- **Expected:** Each sees only their own version. No endpoint exposes another user's override — the scoping is structural (`session.user.id` is never taken from the body).

### TC-O26 — Deleting one user's override does not touch another's
- **Requirements:** OV-B2, OV-P1
- **Level:** Integration
- **Steps:** With A and B both overriding D, `DELETE` as A.
- **Expected:** A's row is gone; B's is intact and still applied.

### TC-O27 — Override on a default outside the caller's domain
- **Requirements:** OV-P2
- **Level:** Integration
- **Preconditions:** Domain A active; default D belongs to domain B.
- **Steps:** `PUT /api/questions/<D>/override`.
- **Expected:** **`200`** — the endpoint checks only `isDefault`, not visibility. The override is created but never surfaces in the caller's list. Documents the gap.

## Hidden-question cases

### TC-O28 — Hidden question disappears from the list
- **Requirements:** OV-R17 · AC-7
- **Level:** Integration
- **Steps:** `PUT /api/questions/<D>/override` with `{ isHidden: true }`. Then `GET /api/questions` as that user and as another.
- **Expected:** Absent for the owner; present for everyone else.

### TC-O29 — Hidden question is excluded from the export
- **Requirements:** OV-R17 · AC-7
- **Level:** Integration
- **Steps:** With D hidden, `GET /api/questions/export`.
- **Expected:** D does not appear in the Markdown.

### TC-O30 — Hidden question is excluded from the shared profile
- **Requirements:** OV-R17, OV-B8 · AC-7
- **Level:** Integration
- **Steps:** Owner hides D, then a viewer opens `/share/<owner slug>`.
- **Expected:** D is absent from the shared collection.

### TC-O31 — Hidden question is still reachable by id
- **Requirements:** OV-R18, OV-X7
- **Level:** Integration
- **Steps:** With D hidden, call `GET /api/questions/<D>` and open `/questions/<D>/edit`.
- **Expected:** **Both succeed** — `getQuestionForUser` does not check `isHidden`. Pins the list/detail inconsistency.

### TC-O32 — No UI writes `isHidden`
- **Requirements:** OV-R19, OV-X6
- **Level:** Unit (component)
- **Steps:** Exercise every save path in `QuestionForm` and `QuestionList`; capture the request bodies.
- **Expected:** `isHidden` never appears in any payload. This is a guard: if hide UI is added later, this test should be replaced rather than silently passing.

### TC-O33 — Hidden questions can still be asked in an interview
- **Requirements:** OV-X11
- **Level:** Integration
- **Preconditions:** D is hidden by user A.
- **Steps:** As A, create a random-mode interview session whose filters match D.
- **Expected:** D **is eligible** — `resolveRandomQuestionIds` does not consider `isHidden`. Documents the cross-feature gap.

## Reset dispatch cases

### TC-O34 — Trash icon on a customized default resets
- **Requirements:** OV-R22, R23, R24
- **Level:** Unit (component) + Integration
- **Preconditions:** Default D with an override; `confirm` stubbed to `true`.
- **Steps:** Click the trash icon on D's card.
- **Expected:** Confirm text is "Reset to default?"; the request is `DELETE /api/questions/<D>/override`; toast "Override removed"; **the question still exists**.

### TC-O35 — Trash icon on a private question deletes
- **Requirements:** OV-R22
- **Level:** Unit (component)
- **Steps:** Click the trash icon on the user's own private question.
- **Expected:** Confirm text "Delete this question?"; the request is `DELETE /api/questions/<id>`; toast "Question deleted".

### TC-O36 — Reset button visibility in the form
- **Requirements:** OV-R22
- **Level:** Unit (component)
- **Steps:** Render `QuestionForm` with `isOverride` and `hasOverride: true`, then with `hasOverride: false`.
- **Expected:** "Reset to Default" is present only in the first case.

### TC-O37 — Cancelling the reset confirm
- **Requirements:** OV-R23
- **Level:** Unit (component)
- **Steps:** Stub `confirm` to return `false`; click reset from both entry points.
- **Expected:** No request; the override survives.

### TC-O38 — Customized badge rendering
- **Requirements:** OV-R25
- **Level:** Unit (component)
- **Steps:** Render `QuestionCard` with `hasOverride: true` and `false`.
- **Expected:** The pencil "Customized" badge appears only when `true`.

### TC-O39 — Non-admin sees the trash icon on a customized default
- **Requirements:** OV-R26
- **Level:** Unit (component)
- **Steps:** Render `QuestionCard` as a non-admin with `isDefault: true, hasOverride: true`, then with `hasOverride: false`.
- **Expected:** Icon shown in the first case (it resets), hidden in the second.

## Mode-selection cases

### TC-O40 — Mode matrix on the edit page
- **Requirements:** OV-R6, OV-X8
- **Level:** Integration (server component)
- **Steps:** Render `/questions/[id]/edit` for each row of the matrix in `design.md`.
- **Expected:**

  | Question | Viewer | Heading | Endpoint used on save |
  |---|---|---|---|
  | own private | owner | "Edit Question" | `PUT /api/questions/[id]` |
  | default, authored by this admin | that admin | "Edit Question" | `PUT /api/questions/[id]` |
  | default, authored by another admin | admin | **"Customize Question"** | override |
  | default | plain user | "Customize Question" | override |

### TC-O41 — Edit page 404s for a missing question
- **Requirements:** OV-R6
- **Level:** Integration
- **Steps:** Open `/questions/nonexistent/edit`.
- **Expected:** Next.js `notFound()` — the raw lookup guards before the merged one.

### TC-O42 — Override form pre-fills with merged content
- **Requirements:** OV-R9
- **Level:** Integration
- **Preconditions:** D has an override changing only the answer.
- **Steps:** Open the override form.
- **Expected:** The question editor shows the **admin's** question; the answer editor shows the **user's** answer.

### TC-O43 — Admin questions page ignores overrides
- **Requirements:** OV-X9
- **Level:** Integration
- **Preconditions:** An admin has an override on default D.
- **Steps:** Render `/admin/questions` and `/questions` as that admin.
- **Expected:** `/admin/questions` shows the **original** with `hasOverride: false`; `/questions` shows the **customized** version with the badge. Pins the inconsistency.

## Boundary and edge cases

### TC-O44 — Deleting the question cascades the override
- **Requirements:** OV-B5
- **Level:** Integration
- **Steps:** With overrides from users A and B on default D, an admin deletes D.
- **Expected:** Both override rows are gone; no foreign-key error.

### TC-O45 — Deleting the user cascades their overrides
- **Requirements:** OV-B6
- **Level:** Integration
- **Steps:** Delete user A who has several overrides.
- **Expected:** All of A's override rows are removed; the underlying questions are untouched.

### TC-O46 — Unique constraint holds under concurrency
- **Requirements:** OV-B2
- **Level:** Integration
- **Steps:** Fire two simultaneous `PUT` requests for the same `(user, question)`.
- **Expected:** Exactly one row exists afterwards; neither request returns a `500` unique-violation. **Unknown / needs confirmation:** current behavior under a genuine race is untested — Prisma's `upsert` may surface `P2002`.

### TC-O47 — Flipping `isDefault` off orphans the override
- **Requirements:** OV-X13
- **Level:** Integration
- **Preconditions:** User A has an override on default D.
- **Steps:** Admin sets `isDefault = false` on D via `PUT /api/questions/<D>` .
- **Expected:** The override row survives and **is still applied on read** for A (if D remains visible to A), but `PUT .../override` now returns `400`. Documents the inconsistent state.

### TC-O48 — Very large override content
- **Level:** Integration
- **Steps:** `PUT` an override with a ~1 MB answer.
- **Expected:** Accepted (columns are `@db.Text`, and no length validation exists). Record the effect on list-render time, since every override is fetched on every list request.

### TC-O49 — Many overrides for one user
- **Requirements:** performance characteristic of the bulk fetch
- **Level:** Integration
- **Preconditions:** One user with 500+ override rows.
- **Steps:** `GET /api/questions?limit=10`.
- **Expected:** Correct results. Note that **all 500 overrides are fetched** regardless of page size — measure and record, since this is the known scaling characteristic of the design.

## Loading and empty states

### TC-O50 — Override form before the editor loads
- **Level:** Unit (component)
- **Steps:** Render the override form with the dynamic TipTap import pending.
- **Expected:** Pulsing placeholders; no crash; the difficulty select and buttons still render.

### TC-O51 — Saving state
- **Level:** Unit (component)
- **Steps:** Save with a slow fetch stub.
- **Expected:** Button reads "Saving..."; Save, Cancel, and "Reset to Default" are all disabled.

## API / network failure scenarios

### TC-O52 — Save failure keeps the form open
- **Requirements:** OV-E5
- **Level:** Unit (component)
- **Steps:** Stub `PUT .../override` to return `400 { error: "Can only override default questions" }`.
- **Expected:** Toast shows that message; the form retains the user's edits; no navigation.

### TC-O53 — Reset failure from the form
- **Requirements:** OV-E6
- **Level:** Unit (component)
- **Steps:** Stub `DELETE` to return `500`.
- **Expected:** Toast "Failed to reset"; no navigation; the override is untouched.

### TC-O54 — Reset failure from the list
- **Requirements:** OV-E7
- **Level:** Unit (component)
- **Steps:** Stub `DELETE .../override` to return `500`; click the trash icon on a customized default.
- **Expected:** Toast "Something went wrong"; no refresh; the card still shows the customized content.

## Regression-sensitive behavior

| Area | Why it is fragile | Guard test |
|---|---|---|
| `??` vs `\|\|` in the merge | Switching to `\|\|` would make empty-string overrides fall back, changing behavior for every user with a blanked field | TC-O09 |
| Merge runs before filter/sort | Moving it after would break difficulty filtering and search on overridden content | TC-O13, TC-O14 |
| `isHidden` check placement | It returns `null` before the field merge; moving or dropping it changes list membership | TC-O28 |
| Delete-vs-reset condition in `QuestionList` | Inverting `question.isDefault && question.hasOverride` **destroys shared content** | TC-O34, TC-O35 |
| `isOverride` derivation on the edit page | Uses the **raw** row's `createdBy`; switching to the merged object would break the admin cases | TC-O40 |
| Payload asymmetry (`question` not `\|\| null`) | "Fixing" it silently changes TC-O11's outcome | TC-O11 |
| Spread of `parsed.data` into `upsert.update` | Replacing it with an explicit field list would turn partial updates into full overwrites | TC-O18 |
| Three separate merge implementations | Fixing one leaves the others stale — especially the interview copy | TC-O08, TC-O33 |
| `deleteMany` in reset | Changing to `delete` would make idempotent resets throw | TC-O05 |

## Recommended missing coverage

Ordered by value:

1. **A pure unit test of the merge**, ideally after extracting a `mergeOverride(question, override)`
   function. Today the logic is inlined four times; a shared function plus one table-driven test
   would cover TC-O06, TC-O08, TC-O09, TC-O12 at once and eliminate the drift risk.
2. **TC-O08 (per-field merge after an admin edit)** — the defining behavior of the feature and the
   one users would most notice breaking.
3. **TC-O34 / TC-O35 (delete-vs-reset dispatch)** — the only destructive failure mode here. A wrong
   branch deletes a question shared by every user in the domain.
4. **Integration tests for the four `PUT` responses** (200 / 400 not-default / 400 invalid / 401) and
   the idempotent `DELETE`.
5. **Cross-user isolation tests** (TC-O02, TC-O25, TC-O26) — cheap and directly security-relevant.
6. **Pin the known-odd behaviors** so they change deliberately: TC-O09/TC-O10/TC-O11 (empty-value
   semantics), TC-O15/TC-O16 (no-op overrides producing badges), TC-O23 (400 instead of 404),
   TC-O31 (hidden but reachable), TC-O43 (admin page ignores overrides).
7. **Decide and then test `isHidden`** (TC-O32). Right now the feature half-exists; a test either
   locks in "no UI writes it" or accompanies the UI that should.
8. **A consistency test across the three merge sites** — assert that
   `getQuestionsForUser`, `getQuestionForUser`, and the interview resolution return the same values
   for the same `(user, question)` on the fields they share.
</content>
