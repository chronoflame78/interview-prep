# Study Plans — Test Cases

> Verification plan for **new** work. Requirement IDs refer to [`requirements.md`](./requirements.md);
> mechanisms referenced (layout endpoint, hidden placeholders) are described in
> [`design.md`](./design.md).

## Existing automated tests

**None.** No test runner is installed and no `*.test.*` / `*.spec.*` files exist. Every case below is
written so it can be executed manually today (browser + `curl`/REST client against a dev database).

The highest-value candidates for automation, if a harness is added, are marked **[auto]**:

- **Unit** — the stale-layout check and position assignment in `src/lib/plans.ts`, and the Zod
  schemas in `src/lib/validations/plan.ts`. Needs `vitest` (dev dependency) — no other setup.
- **Integration** — route handlers against a throwaway Postgres database. Needs `vitest`, a separate
  `DATABASE_URL` for tests (never the local `.env`, which points at production), `prisma migrate
  deploy` against it, and a way to stub `auth()` per test.
- **E2E** — drag and drop, picker, keyboard moves. Needs `@playwright/test` and a seeded test user.

None of these are installed by this feature unless separately requested.

Common preconditions unless stated otherwise: domain **D1** is active; user **A** (USER) and user
**B** (USER) exist; admin default questions **Q1–Q10** in D1; A's private question **PA** in D1;
B's private question **PB** in D1; default **QX** in domain **D2**.

## Happy path

### TC-P01 — Create a plan
- **Requirements:** SP-R1, SP-R2, SP-R4, SP-R37 · AC-1
- **Level:** Integration / E2E
- **Steps:** As A, on `/plans` click "New Plan", enter name "Frontend onsite", description "Week before", save.
- **Expected:** `POST /api/plans` → `201 { id }`. Browser lands on `/plans/<id>` showing the empty state (SP-X3). DB row has `userId = A`, `domainId = D1`.

### TC-P02 — Create several plans, list order and counts
- **Requirements:** SP-R1, SP-R7
- **Level:** Integration
- **Steps:** Create plans P1, P2, P3. Add 3 questions and 2 groups to P1. Load `/plans`.
- **Expected:** All three listed; P1 first (most recently updated), then P3, P2. P1 shows "3 questions · 2 groups". Description truncated when long.

### TC-P03 — Rename and edit description
- **Requirements:** SP-R5
- **Level:** Integration
- **Steps:** `PATCH /api/plans/<id>` `{ name: "Renamed" }`; then `{ description: "" }`.
- **Expected:** `200`. Name updated, description unchanged after the first call; after the second, description is `null`.

### TC-P04 — Delete a plan leaves questions untouched **[auto]**
- **Requirements:** SP-R6, SP-B1 · AC-8
- **Level:** Integration
- **Preconditions:** Plan with 2 groups and 5 items; A has an override on Q1 and a star on Q2.
- **Steps:** Delete the plan from the UI (confirm).
- **Expected:** Plan, its groups and items are gone. `Question`, `UserQuestionOverride`, `UserQuestionStar`, topic and relation rows are byte-identical to before. Redirected to `/plans`.

### TC-P05 — Add groups
- **Requirements:** SP-R8, SP-R11
- **Level:** Integration
- **Steps:** `POST /api/plans/<id>/groups` with "JS core", then "React".
- **Expected:** Two groups with positions 0 and 1, rendered after Ungrouped in that order.

### TC-P06 — Rename a group
- **Requirements:** SP-R11
- **Level:** E2E
- **Steps:** Rename "React" to "React + Next".
- **Expected:** New name shown after refresh; items and position unchanged.

### TC-P07 — Pick questions into a group
- **Requirements:** SP-R14, SP-R16, SP-R17 · AC-1
- **Level:** E2E
- **Preconditions:** The picker displays Q3, Q2, Q1 in that order.
- **Steps:** Open the picker, tick Q1, then Q3, then Q2 (click order differs from display order), target "JS core", click "Add 3 questions".
- **Expected:** `201 { added: [...], skipped: [] }`. Toast "Added 3 questions". Items appear at the end of "JS core" as [Q3, Q2, Q1] — **picker display order**, not click order.

### TC-P08 — Pick into Ungrouped
- **Requirements:** SP-R10, SP-R17
- **Level:** E2E
- **Steps:** Add Q4 with target "Ungrouped".
- **Expected:** Q4 appears in the Ungrouped section, which is rendered first.

### TC-P09 — Reorder within a section persists **[auto]**
- **Requirements:** SP-R21, SP-R25, SP-R26 · AC-2
- **Level:** E2E
- **Steps:** In "JS core" [Q3, Q2, Q1], drag Q1 to the top. Reload in another browser.
- **Expected:** One `PUT /layout` → `200`. No Save button involved. Other browser shows [Q1, Q3, Q2].

### TC-P10 — Move across sections persists
- **Requirements:** SP-R22 · AC-2
- **Level:** E2E
- **Steps:** Drag Q3 from "JS core" into "React" between two existing items.
- **Expected:** Q3 lands at the dropped position in "React"; "JS core" closes the gap. Reload confirms.

### TC-P11 — Reorder groups persists
- **Requirements:** SP-R13 · AC-2
- **Level:** E2E
- **Steps:** Drag "React" above "JS core".
- **Expected:** Group order swapped after reload; each group keeps its items; Ungrouped stays first and has no drag handle.

### TC-P12 — Remove a question from the plan
- **Requirements:** SP-R24
- **Level:** Integration
- **Steps:** Item menu → "Remove from plan".
- **Expected:** `DELETE /items/<itemId>` → `200`. Item gone; the `Question` still exists and is still on `/questions`.

### TC-P13 — Study view numbering is continuous
- **Requirements:** SP-R27
- **Level:** E2E
- **Preconditions:** Ungrouped [Q4], "JS core" [Q1, Q2], "React" [Q5].
- **Expected:** Numbers 1 (Q4), 2 (Q1), 3 (Q2), 4 (Q5) — not restarting per group.

### TC-P14 — Cards behave as on `/questions`
- **Requirements:** SP-R28
- **Level:** E2E
- **Steps:** Expand a card; star it; click its pencil.
- **Expected:** Answer revealed; star persists (visible as starred on `/questions`); pencil opens the editor and saving returns to the plan URL. The card's own trash icon is **not** shown inside a plan.

### TC-P15 — Collapse groups
- **Requirements:** SP-R30
- **Level:** E2E
- **Steps:** Collapse "JS core"; reload.
- **Expected:** Collapsed while on the page; after reload all groups are expanded again (not persisted).

### TC-P16 — Read and edit on the same page
- **Requirements:** SP-R31
- **Level:** E2E
- **Expected:** `/plans/<id>` shows drag handles, item menus, "Add questions", "Add group" alongside readable cards; there is no separate edit route or toggle.

### TC-P17 — Header navigation
- **Requirements:** SP-R36, SP-R37
- **Level:** E2E
- **Expected:** "Study Plans" appears in the header on desktop, links to `/plans`, and is highlighted on `/plans` and `/plans/<id>`.

### TC-P18 — No "Add to plan" on `/questions`
- **Requirements:** SP-R38
- **Level:** E2E
- **Expected:** Question cards on `/questions` have no plan-related action.

## Language display

### TC-P19 — `lang` with per-field fallback
- **Requirements:** SP-R29 · AC-10
- **Level:** E2E
- **Preconditions:** Q1 has `questionVn` and `answerVn`; Q2 has `questionVn` but no `answerVn`; Q3 has no Vietnamese.
- **Steps:** Open `/plans/<id>?lang=vn`, expand all.
- **Expected:** Q1 fully Vietnamese; Q2 Vietnamese question + English answer; Q3 English. The language selector on the page shows Vietnamese.

### TC-P20 — Picker titles follow `lang`
- **Requirements:** SP-R29, SP-R14
- **Level:** E2E
- **Steps:** With `?lang=vn`, open the picker.
- **Expected:** Row titles use the Vietnamese question where present, English otherwise.

## Picker

### TC-P21 — Picker lists exactly the visible set **[auto]**
- **Requirements:** SP-R14 · AC-3
- **Level:** Integration
- **Expected:** As A, picker includes Q1–Q10 and PA; excludes PB (B's private), QX (other domain), and any default A has hidden via override. Overridden defaults show A's effective title.

### TC-P22 — Picker filters
- **Requirements:** SP-R15
- **Level:** E2E
- **Steps:** Filter by topic, then sub-topic, then difficulty HARD, then search "closure".
- **Expected:** Each narrows the list with the same results `/questions` gives for the same filters.

### TC-P23 — Already-added questions are disabled
- **Requirements:** SP-R18
- **Level:** E2E
- **Preconditions:** Q1 is in "JS core".
- **Expected:** Q1's checkbox is disabled and the row reads "In: JS core". Q1 cannot be selected.

### TC-P24 — Same question in two plans
- **Requirements:** SP-R19
- **Level:** Integration
- **Steps:** Add Q1 to plan P1 and plan P2.
- **Expected:** Both succeed; each plan has its own item.

### TC-P25 — More than 200 results
- **Requirements:** SP-X7
- **Level:** E2E
- **Preconditions:** 250 visible questions in D1.
- **Steps:** Open the picker with no filters; then search for a term matching the 250th question only.
- **Expected:** 200 rows plus "Showing first 200 — refine your search". After searching, the 250th question is listed and can be added.

## Validation cases

### TC-P26 — Plan name rules **[auto]**
- **Requirements:** SP-R2, SP-V1, SP-V2
- **Level:** Unit / Integration
- **Steps:** `POST /api/plans` with `name: ""`, `"   "`, 101 chars, 100 chars; then two plans with the same name.
- **Expected:** `""` and whitespace-only → `400 { error: "Name is required" }`; 101 chars → `400`; 100 chars → `201`. Duplicate names allowed. Stored names are trimmed.

### TC-P27 — Description length
- **Requirements:** SP-V1
- **Level:** Unit
- **Expected:** 500 chars accepted; 501 → `400 "Description must be at most 500 characters"`; omitted or `null` accepted.

### TC-P28 — Group name rules
- **Requirements:** SP-R8, SP-V3
- **Level:** Unit / Integration
- **Expected:** Empty → `400 "Group name is required"`; 101 chars → `400`; two groups named "Review" in one plan → both created.

### TC-P29 — Add-items body rules **[auto]**
- **Requirements:** SP-V1, validation table
- **Level:** Unit
- **Expected:** `questionIds: []` → `400`; 201 ids → `400`; duplicate ids in one request → `400 "Duplicate question ids"`; 200 unique ids → accepted by the schema.

### TC-P30 — Plan question cap
- **Requirements:** SP-E5, validation table
- **Level:** Integration
- **Preconditions:** Plan holds 499 items.
- **Steps:** Add 2 questions; then add 1.
- **Expected:** First → `400 "A plan can hold at most 500 questions"`, nothing added. Second → `201`, plan has 500.

### TC-P31 — Group cap
- **Requirements:** SP-E5, validation table
- **Level:** Integration
- **Preconditions:** Plan has 50 groups.
- **Expected:** Adding a 51st → `400` naming the limit.

### TC-P32 — Malformed layout body
- **Requirements:** SP-V1, SP-V4
- **Level:** Integration
- **Steps:** `PUT /layout` with `{ groups: "x" }`, and with no `ungrouped`.
- **Expected:** `400`, not `409`. Nothing changes.

## Ordering integrity

### TC-P33 — Stale layout rejected (missing / extra ids) **[auto]**
- **Requirements:** SP-V4, SP-X1
- **Level:** Unit / Integration
- **Steps:** Send a layout that (a) omits one item id, (b) includes an item id from another plan, (c) lists one item twice, (d) omits a group, (e) includes an unknown group id.
- **Expected:** Each → `409 { error: "Plan changed, reloading" }`; DB positions unchanged.

### TC-P34 — Positions are dense after save **[auto]**
- **Requirements:** SP-B4
- **Level:** Unit / Integration
- **Steps:** Any successful layout save.
- **Expected:** Group positions are exactly `0..g-1`; within each section item positions are exactly `0..n-1`.

### TC-P35 — Two tabs
- **Requirements:** SP-X1, SP-E6
- **Level:** E2E
- **Steps:** Open the plan in tabs T1 and T2. In T1 add a question. In T2 (not refreshed) drag an item.
- **Expected:** T2's save → `409`; T2 reverts, shows "Failed to save order", then refreshes and shows the new question and T1's state.

### TC-P36 — Rapid consecutive drags
- **Requirements:** SP-R25
- **Level:** E2E
- **Steps:** Perform five drags in under two seconds.
- **Expected:** Saves are sent one after another; no `409`; final reload matches the final on-screen order.

### TC-P37 — Duplicate add is skipped
- **Requirements:** SP-R18, SP-B3, SP-E3 · AC-4
- **Level:** Integration
- **Steps:** `POST /items` `{ questionIds: [Q1, Q6] }` when Q1 is already in the plan.
- **Expected:** `201 { added: [Q6], skipped: [Q1] }`. Exactly one item for Q1. UI toast also mentions "1 already in plan".

### TC-P38 — Unique constraint holds under concurrency
- **Requirements:** SP-B3
- **Level:** Integration
- **Steps:** Fire two simultaneous `POST /items` with Q7.
- **Expected:** Both return 201 without a 500; exactly one Q7 item exists.

## Group deletion

### TC-P39 — Delete an empty group
- **Requirements:** SP-R12, SP-X4
- **Level:** E2E
- **Expected:** No choice dialog; the group disappears; remaining groups' positions re-densify.

### TC-P40 — Delete a non-empty group, move to Ungrouped
- **Requirements:** SP-R12 · AC-9
- **Level:** Integration / E2E
- **Preconditions:** Ungrouped [Q4]; "React" [Q5, Q6, Q7].
- **Steps:** Delete "React" → choose "Move 3 questions to Ungrouped".
- **Expected:** Ungrouped is [Q4, Q5, Q6, Q7]; "React" gone; no question removed from the plan.

### TC-P41 — Delete a non-empty group, remove its questions
- **Requirements:** SP-R12, SP-B1
- **Level:** Integration
- **Expected:** Group and its items gone; the questions themselves still exist.

### TC-P42 — Cancel group deletion
- **Requirements:** SP-R12
- **Level:** E2E
- **Expected:** Cancel in the choice dialog changes nothing and sends no request.

### TC-P43 — Ungrouped is fixed
- **Requirements:** SP-R10
- **Level:** E2E / Integration
- **Expected:** Ungrouped has no rename, delete, or drag handle. A layout body that tries to list `null`/"ungrouped" as a group id → `409` (unknown group).

## Keyboard and accessibility

### TC-P44 — Every move without a mouse
- **Requirements:** SP-R13, SP-R23 · AC-11
- **Level:** E2E
- **Steps:** Using only the keyboard: move an item up and down within a group; "Move to group…" into another group; move a group up and down.
- **Expected:** Each action persists exactly like its drag equivalent (TC-P09–TC-P11).

### TC-P45 — Move-up/down at the ends
- **Requirements:** SP-R23
- **Level:** E2E
- **Expected:** "Move up" is disabled on the first item of a section and on the first group; "Move down" on the last.

### TC-P46 — Touch dragging
- **Requirements:** SP-X8
- **Level:** E2E (mobile viewport / touch emulation)
- **Expected:** Press-and-hold starts a drag; a normal swipe still scrolls the page; menu-based moves also work.

## Consistency with the question bank

### TC-P47 — Override reflected in plan **[auto]**
- **Requirements:** SP-R32 · AC-6
- **Level:** Integration
- **Steps:** A overrides Q1's answer; view the plan; reset the override; view again.
- **Expected:** Plan shows A's answer and the "Customized" badge, then the admin's answer without the badge.

### TC-P48 — Question edits reflected
- **Requirements:** SP-R32
- **Level:** Integration
- **Steps:** A edits PA's text.
- **Expected:** The plan shows the new text without any plan change.

### TC-P49 — Deleted question disappears, order kept **[auto]**
- **Requirements:** SP-R33 · AC-7
- **Level:** Integration
- **Preconditions:** "JS core" [Q1, Q2, Q3]; Q2 also in plan P2.
- **Steps:** Admin deletes Q2.
- **Expected:** Both plans drop Q2; "JS core" shows [Q1, Q3]; a subsequent drag saves successfully (the gap left by the cascade does not cause a `409`).

### TC-P50 — Hidden question keeps its slot **[auto]**
- **Requirements:** SP-R34, SP-X6
- **Level:** Integration / E2E
- **Preconditions:** "JS core" [Q1, Q2, Q3].
- **Steps:** Set `isHidden = true` on A's override of Q2 via the API. View the plan; drag Q3 above Q1. Then set `isHidden = false`.
- **Expected:** While hidden: shows [Q1, Q3] numbered continuously; plans list counts 2; the drag saves `200`. After un-hiding: Q2 is back, positioned relative to its neighbours (here [Q3, Q1, Q2] — it stayed after Q1).

### TC-P51 — Question becomes invisible
- **Requirements:** SP-R35
- **Level:** Integration
- **Steps:** Admin flips Q5 (in A's plan) from default to non-default.
- **Expected:** Q5 is no longer shown in A's plan and not counted; the item row still exists.

## Domain cases

### TC-P52 — List scoped to active domain
- **Requirements:** SP-R4 · AC-12
- **Level:** Integration
- **Steps:** Create plan P1 in D1; switch to D2; create P2; open `/plans`.
- **Expected:** Only P2 listed. Switching back to D1 lists only P1.

### TC-P53 — Opening a plan from another domain
- **Requirements:** SP-X2, SP-B5
- **Level:** E2E / Integration
- **Steps:** With D2 active, open `/plans/<P1>` directly.
- **Expected:** Plan renders with a notice that it belongs to another domain, showing its D1 questions. Reorder and remove work. "Add questions" is disabled; `POST /items` directly → `400 "This plan belongs to another domain"`. `P1.domainId` is still D1.

### TC-P54 — Domain deleted
- **Requirements:** SP-B6
- **Level:** Integration
- **Steps:** Delete D1 at the database level.
- **Expected:** P1 survives with `domainId = null`, is not listed on `/plans`; opening it directly shows the domain notice and no questions.

## Permission and scoping cases

### TC-P55 — Another user's plan is 404 everywhere **[auto]**
- **Requirements:** SP-R3, SP-B2, SP-P1 · AC-5
- **Level:** Integration
- **Steps:** As B, call every endpoint (`GET/PATCH/DELETE /plans/<A's>`, `/groups`, `/groups/<g>`, `/items`, `/items/<i>`, `/layout`) and open `/plans/<A's id>`.
- **Expected:** Every API → `404 { error: "Not found" }`; page → not-found page. A's plan unchanged. B's `/plans` does not list it.

### TC-P56 — Admin has no special access
- **Requirements:** SP-P2
- **Level:** Integration
- **Expected:** An admin gets the same `404`s as TC-P55 on A's plan.

### TC-P57 — Unauthenticated
- **Requirements:** SP-E1
- **Level:** Integration
- **Expected:** All `/api/plans*` endpoints → `401 { error: "Unauthorized" }`; `/plans` redirects to `/login?callbackUrl=/plans`.

### TC-P58 — Adding invisible questions is all-or-nothing **[auto]**
- **Requirements:** SP-R20, SP-E4 · AC-3
- **Level:** Integration
- **Steps:** `POST /items` with `[Q1, PB]`; with `[Q1, QX]`; with `[Q1, "nonexistent"]`; with a question A has hidden.
- **Expected:** Each → `400 "Some questions are not available"`; Q1 is **not** added in any case.

### TC-P59 — Sub-resources must belong to the plan
- **Requirements:** SP-E2, SP-P1
- **Level:** Integration
- **Steps:** As A, using A's plans P1 and P2: `PATCH /plans/P1/groups/<group of P2>`; `DELETE /plans/P1/items/<item of P2>`; `POST /plans/P1/items` with `groupId` from P2.
- **Expected:** Each → `404`; P2 unchanged.

## Cascades

### TC-P60 — Deleting a user deletes their plans
- **Requirements:** SP-B6
- **Level:** Integration
- **Expected:** All of A's plans, groups, and items are removed; B's plans untouched; shared questions untouched.

## Loading and empty states

### TC-P61 — Empty plan
- **Requirements:** SP-X3
- **Level:** E2E
- **Expected:** New plan shows an empty state with "Add questions" and "Add group".

### TC-P62 — Empty group as drop target
- **Requirements:** SP-X4
- **Level:** E2E
- **Expected:** An empty group shows "No questions yet" and accepts a dropped item.

### TC-P63 — Every question deleted
- **Requirements:** SP-X5
- **Level:** Integration
- **Expected:** Plan and its groups survive; each group shows its empty hint.

### TC-P64 — No plans yet
- **Requirements:** SP-R37
- **Level:** E2E
- **Expected:** `/plans` shows an empty state with "New Plan".

### TC-P65 — Picker loading and no results
- **Requirements:** SP-R14, SP-R15
- **Level:** E2E
- **Expected:** Skeleton rows while fetching; "No questions found" when filters match nothing; the add button is disabled with nothing selected.

## API / network failure scenarios

### TC-P66 — Layout save fails
- **Requirements:** SP-R25, SP-E6
- **Level:** E2E
- **Steps:** Block `PUT /layout` (devtools offline or a 500), then drag.
- **Expected:** Item jumps back to its last saved position; toast "Failed to save order"; subsequent drags work once the network returns.

### TC-P67 — Create / rename / delete fails
- **Requirements:** SP-E7
- **Level:** E2E
- **Expected:** Toast with the server's `error` or "Something went wrong"; the dialog stays open with input preserved.

### TC-P68 — Missing plan page
- **Requirements:** SP-E8
- **Level:** E2E
- **Expected:** `/plans/does-not-exist` renders the app's not-found page.

## Regression-sensitive behavior

### TC-P69 — `/questions` and the question APIs are unaffected
- **Requirements:** SP-B1
- **Level:** E2E / Integration
- **Expected:** After the migration, `/questions` filters, sort, star, export, override, and delete behave exactly as before; `GET /api/questions` responses have the same shape (no plan fields added).

### TC-P70 — Migration is additive
- **Requirements:** SP-B1, design *Migration*
- **Level:** Integration
- **Steps:** Apply the migration with `prisma migrate deploy` against a copy of the schema.
- **Expected:** Three new tables only; no existing table altered; existing data intact.

### TC-P71 — Topic ordering untouched
- **Requirements:** SP-R26 (contrast)
- **Level:** E2E
- **Expected:** `/topics` drag ordering still uses `localStorage` and still syncs to the sidebar.

## Coverage map

| Requirement | Test cases |
|---|---|
| SP-R1 | P01, P02 |
| SP-R2 | P01, P26 |
| SP-R3 | P55 |
| SP-R4 | P01, P52 |
| SP-R5 | P03 |
| SP-R6 | P04 |
| SP-R7 | P02 |
| SP-R8 | P05, P28 |
| SP-R9 | P43 (one level; no nested group UI or API field) |
| SP-R10 | P08, P43 |
| SP-R11 | P05, P06 |
| SP-R12 | P39, P40, P41, P42 |
| SP-R13 | P11, P44 |
| SP-R14 | P21, P65 |
| SP-R15 | P22 |
| SP-R16 | P07 |
| SP-R17 | P07, P08 |
| SP-R18 | P23, P37 |
| SP-R19 | P24 |
| SP-R20 | P58 |
| SP-R21 | P09 |
| SP-R22 | P10 |
| SP-R23 | P44, P45 |
| SP-R24 | P12 |
| SP-R25 | P09, P36, P66 |
| SP-R26 | P09, P71 |
| SP-R27 | P13 |
| SP-R28 | P14 |
| SP-R29 | P19, P20 |
| SP-R30 | P15 |
| SP-R31 | P16 |
| SP-R32 | P47, P48 |
| SP-R33 | P49 |
| SP-R34 | P50 |
| SP-R35 | P51 |
| SP-R36 | P17 |
| SP-R37 | P17, P64 |
| SP-R38 | P18 |
| SP-B1 | P04, P41, P69, P70 |
| SP-B2 | P55 |
| SP-B3 | P37, P38 |
| SP-B4 | P34 |
| SP-B5 | P53 |
| SP-B6 | P54, P60 |
| SP-V1 | P26–P29, P32 |
| SP-V2 | P26 |
| SP-V3 | P28 |
| SP-V4 | P32, P33 |
| SP-P1 | P55, P59 |
| SP-P2 | P56 |
| SP-E1 | P57 |
| SP-E2 | P59 |
| SP-E3 | P37 |
| SP-E4 | P58 |
| SP-E5 | P30, P31 |
| SP-E6 | P35, P66 |
| SP-E7 | P67 |
| SP-E8 | P68 |
| SP-X1 | P33, P35 |
| SP-X2 | P53 |
| SP-X3 | P61 |
| SP-X4 | P39, P62 |
| SP-X5 | P63 |
| SP-X6 | P50 |
| SP-X7 | P25 |
| SP-X8 | P46 |
| AC-1 … AC-12 | AC-1: P01, P07 · AC-2: P09–P11 · AC-3: P21, P58 · AC-4: P37 · AC-5: P55 · AC-6: P47 · AC-7: P49 · AC-8: P04 · AC-9: P40 · AC-10: P19 · AC-11: P44 · AC-12: P52 |
