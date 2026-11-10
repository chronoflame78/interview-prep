# Study Plans — Requirements (proposed)

> Specification for **new** work. Describes intended behavior, not current behavior. Once shipped,
> this document is amended to describe what the system does. All open questions from the first
> draft were resolved in favor of the proposed option (approved 2026-11-10).

## Feature overview

A **study plan** is a user's own, named, ordered list of existing questions, organized into
**groups**. The user builds a plan by picking questions they can already see (defaults in their
domain plus their own private questions), arranges them into named groups (e.g. "Week 1 — JS
basics", "Day before interview"), and reorders both the groups and the questions inside them by
drag and drop. The user then works through the plan in that order, reading each question and
expanding it to see the answer, exactly as on `/questions`.

A plan references questions; it never copies them. What a plan shows for a question is always that
question's current effective content for the viewing user (original merged with their override).

## Purpose / user problem

`/questions` is a filtered bank sorted by date or difficulty. It cannot express "study these 30
questions, in this order, in these chunks". Manual ordering is an explicit non-goal of
[`../questions-management/`](../questions-management/), and topics are a classification, not a
sequence. Users preparing for a specific interview need a curated, sequenced subset they can return
to — without forking or mutating the question bank.

## Functional requirements

### Plans

- **SP-R1** — A signed-in user can create any number of study plans. There is no cap on the number of plans.
- **SP-R2** — A plan has a `name` (required) and an optional plain-text `description`.
- **SP-R3** — A plan belongs to exactly one user (its owner) and is visible and editable only by that owner.
- **SP-R4** — A plan belongs to the domain that was the owner's active domain when the plan was created. The plans list shows only plans of the user's **current** active domain (consistent with [`../domains/`](../domains/)).
- **SP-R5** — The user can rename a plan and edit its description.
- **SP-R6** — The user can delete a plan after a confirmation. Deleting a plan deletes its groups and items; it never deletes or alters any question.
- **SP-R7** — The plans list shows, per plan: name, description (truncated), number of questions, number of groups, and last-updated date, ordered by last updated, newest first.

### Groups

- **SP-R8** — A plan contains zero or more **groups**. A group has a `name` (required) and a position within the plan.
- **SP-R9** — Groups are one level deep. A group cannot contain another group.
- **SP-R10** — Every plan also has a built-in **Ungrouped** section, rendered first, which holds questions not placed in any named group. It cannot be renamed, deleted, or moved, and it is hidden in read mode when empty.
- **SP-R11** — The user can add a group (appended at the end), rename a group, and delete a group.
- **SP-R12** — Deleting a group that still contains questions asks the user to choose: move its questions to Ungrouped, or remove them from the plan. Deleting an empty group needs no confirmation.
- **SP-R13** — The user can reorder groups by drag and drop. A keyboard-accessible alternative (move up / move down) is also provided.

### Picking questions

- **SP-R14** — From a plan, the user opens a **question picker** to add questions. The picker lists the same set of questions the user sees on `/questions`: defaults in the active domain plus their own private questions, minus questions they have hidden via an override, with override-merged content.
- **SP-R15** — The picker supports text search and filtering by topic, sub-topic, and difficulty, reusing the semantics of the `/questions` filters.
- **SP-R16** — The picker allows selecting multiple questions at once and adding them in one action.
- **SP-R17** — The user chooses the target section (Ungrouped or a named group) when adding. Added questions are appended to the end of that section, in the order they appear in the picker.
- **SP-R18** — A question can appear **at most once per plan**. Questions already in the plan are shown in the picker as already added (disabled, with the name of the group they are in) and cannot be selected again.
- **SP-R19** — The same question may appear in different plans independently.
- **SP-R20** — The server rejects adding a question the user cannot see (another user's private question, a question from another domain, or a non-existent id).

### Arranging questions

- **SP-R21** — The user can reorder questions within a section by drag and drop.
- **SP-R22** — The user can move a question from one section to another by drag and drop, landing at the dropped position.
- **SP-R23** — A keyboard-accessible alternative is provided for every drag action: move up, move down, and "Move to group…".
- **SP-R24** — The user can remove a question from the plan. This removes only the plan item; the question itself is untouched.
- **SP-R25** — Order and grouping changes are saved to the database automatically, without a separate Save button. The UI updates optimistically and reverts with a toast if saving fails.
- **SP-R26** — Ordering is persisted server-side, per plan, so it is the same on every device and browser. (Contrast with topic ordering, which is per-browser `localStorage`.)

### Studying a plan (read mode)

- **SP-R27** — Opening a plan shows its sections in order, each with its questions in order, numbered continuously across the whole plan (1, 2, 3 … not restarting per group).
- **SP-R28** — Each question renders with the same card as `/questions`: difficulty badge, "Customized" / "Private" badges, question body collapsed, answer revealed on expand.
- **SP-R29** — The plan page honors the `lang` display parameter (`en` | `vn` | `cus`) with the same per-field English fallback as `/questions` (questions-management Q-R59–Q-R65).
- **SP-R30** — Each group can be collapsed or expanded in the view. This is view state only and is not persisted.
- **SP-R31** — Editing actions (add, remove, reorder, group management) are available on the same page; read mode and edit mode are not separate pages.

### Consistency with the question bank

- **SP-R32** — A plan always shows the question's current effective content. Editing the question, or customizing/resetting an override on it, is reflected in every plan that contains it.
- **SP-R33** — When a question is deleted, it disappears from every plan containing it. Remaining items keep their relative order.
- **SP-R34** — When the owner hides a default question via an override (`isHidden`), it is **not shown** in their plans, but the plan item is kept, so un-hiding brings it back in its original position. Hiding has no UI today (question-overrides OV-R19), so this only matters for API-level hides.
- **SP-R35** — If an admin changes a default question to non-default, or a question otherwise becomes invisible to the owner, it is not shown in the plan (same rule as SP-R34).

### Navigation

- **SP-R36** — A "Study Plans" entry is added to the header navigation, linking to `/plans`.
- **SP-R37** — `/plans` shows the plans list with a "New Plan" action. `/plans/[id]` shows one plan.
- **SP-R38** — Question cards on `/questions` get no "Add to plan…" action in v1. Adding happens only from the plan's picker.

## User flows

### Create a plan and fill it
1. User clicks "Study Plans" in the header → `/plans`.
2. Clicks "New Plan", enters name "Frontend onsite" and an optional description → lands on `/plans/<id>`, empty.
3. Clicks "Add group" twice: "JavaScript core", "React".
4. Clicks "Add questions", filters by topic "JavaScript", ticks 8 questions, chooses target "JavaScript core", confirms.
5. The 8 questions appear at the end of that group, numbered 1–8.

### Reorder and regroup
1. On `/plans/<id>`, user drags question #5 above #2 — order saves automatically.
2. Drags a question from "JavaScript core" into "React" — it moves and numbering updates.
3. Drags the "React" group above "JavaScript core" — numbering updates across the plan.

### Study
1. User opens `/plans/<id>?lang=vn`.
2. Reads question 1 in Vietnamese, expands to see the answer, continues down the list, collapsing finished groups.

### Delete a non-empty group
1. User deletes "React" (4 questions).
2. Prompt: "Move 4 questions to Ungrouped" / "Remove them from the plan" / Cancel.
3. Chooses move → the 4 questions are appended to Ungrouped in their existing order; the group is gone.

## Business rules

- **SP-B1** — A plan references questions; it never copies or mutates question content, overrides, stars, topics, or relations.
- **SP-B2** — A plan is strictly private to its owner. No other user, including an admin, can read or change it through any endpoint or page.
- **SP-B3** — A question appears at most once per plan (enforced in the database, not only in the UI).
- **SP-B4** — Order is explicit and total: within a plan, groups have a unique order, and within a section items have a unique order.
- **SP-B5** — A plan's domain is fixed at creation and never changes.
- **SP-B6** — Deleting a user deletes their plans. Deleting a question deletes its plan items. Deleting a domain does not delete plans: the plan's domain becomes null and the plan is no longer listed, matching how `Topic`/`Question` use `SetNull`.

## Validation rules

| Field | Rule |
|---|---|
| Plan `name` | string, trimmed, 1–100 characters — "Name is required" |
| Plan `description` | optional, nullable string, max 500 characters |
| Group `name` | string, trimmed, 1–100 characters — "Group name is required" |
| Questions added in one request | 1–200 ids, no duplicates |
| Questions per plan | max 500 |
| Groups per plan | max 50 |

- **SP-V1** — Validation errors return `400 { error: <first message> }`, matching existing API conventions.
- **SP-V2** — Plan names need not be unique.
- **SP-V3** — Group names need not be unique within a plan.
- **SP-V4** — A reorder request must describe exactly the plan's current set of groups / items. A request referencing ids not in the plan, or omitting ids that are, is rejected with `409 Conflict` (protects against stale clients overwriting a newer state). A malformed reorder body is still a `400` (SP-V1).

## Permissions / access restrictions

| Action | Anonymous | `USER` | `ADMIN` |
|---|---|---|---|
| List / view own plans | redirect to login | ✅ | ✅ |
| Create / edit / delete own plan | `401` | ✅ | ✅ |
| View or edit another user's plan | – | `404` | `404` |
| Add a question the user cannot see | – | `400` | `400` |

- **SP-P1** — Every plan endpoint scopes by `session.user.id`. A plan owned by someone else is answered with `404`, not `403`, so plan ids are not discoverable.
- **SP-P2** — Admins have no special access to plans.

## Error and failure behavior

- **SP-E1** — No session → `401 { error: "Unauthorized" }` (pages redirect to login via middleware).
- **SP-E2** — Unknown plan / group / item, or one not owned by the caller → `404 { error: "Not found" }`.
- **SP-E3** — Adding a question already in the plan → silently skipped; the response reports which ids were skipped. The picker prevents this in normal use (SP-R18).
- **SP-E4** — Adding an invisible or non-existent question → `400`; nothing from that request is added (all-or-nothing).
- **SP-E5** — Exceeding a limit → `400` with a message naming the limit.
- **SP-E6** — Failed reorder / move / remove → the UI reverts to the last saved state and shows toast "Failed to save order".
- **SP-E7** — Failed create / rename / delete → toast with the server's `error`, falling back to "Something went wrong"; dialogs stay open.
- **SP-E8** — Opening `/plans/<id>` for a missing or foreign plan renders the not-found page.

## Important edge cases

- **SP-X1** — **Concurrent edits in two tabs.** A reorder based on stale state is rejected (SP-V4); the client then refetches and shows the current state with the toast from SP-E6.
- **SP-X2** — **Domain switch.** After switching active domain, plans from the previous domain disappear from `/plans`. A direct link to such a plan still opens, showing a notice that it belongs to another domain, since its questions are scoped to that domain. On such a plan, reading, reordering, regrouping, and removing still work, but **adding questions is disabled** until the user switches back to the plan's domain, because the picker lists only the active domain's questions (SP-R14).
- **SP-X3** — **Empty plan.** Shows an empty state with "Add questions" and "Add group" actions.
- **SP-X4** — **Empty group.** Remains visible in the plan as a drop target with a "No questions yet" hint.
- **SP-X5** — **All questions of a plan deleted.** The plan survives with its groups and shows the empty state per group.
- **SP-X6** — **Hidden item count.** Counts in the plans list (SP-R7) include only questions currently shown (SP-R34/35), so the number matches what the user sees.
- **SP-X7** — **Large picker result set.** The picker must be able to reach any visible question, not just the first 50 (contrast questions-management Q-X3). Search and filters are the primary way to narrow it.
- **SP-X8** — **Dragging on touch devices.** Drag and drop must work with touch; the keyboard / button alternatives (SP-R13, SP-R23) also serve as a fallback.

## Non-goals (v1)

- Progress tracking: marking a question as done/learned, completion percentages, streaks. This is the most likely next request; the data model should not preclude it.
- Scheduling: dates, deadlines, reminders, spaced repetition.
- Sharing plans with other users, publishing on the shared profile (`/share/[slug]`), or copying another user's plan.
- Admin-authored default plans visible to everyone.
- Nested groups.
- Per-plan notes on an individual question.
- Exporting a plan to Markdown. (Possible follow-up reusing the existing export.)
- Using a plan as the question source for the Mock Interview.
- Creating a new question from inside a plan.
- Adding to a plan from `/questions` (see SP-R38).

## Acceptance criteria

- **AC-1** — A user can create a plan, add two groups, add questions to each through the picker, and on reload sees the same groups and order.
- **AC-2** — Dragging a question within a group, across groups, and dragging a group all persist; reloading in another browser shows the new order.
- **AC-3** — The picker never offers another user's private question or a question from another domain, and `POST`ing such an id directly returns `400` and adds nothing.
- **AC-4** — Adding a question already in the plan does not create a second item.
- **AC-5** — User B receives `404` for every read and write on user A's plan id.
- **AC-6** — Overriding a default question's answer changes what that question shows inside the user's plan; resetting the override restores it.
- **AC-7** — Deleting a question removes it from every plan; the remaining items keep their relative order.
- **AC-8** — Deleting a plan removes the plan, its groups and items, and leaves every `Question`, override, and star row untouched.
- **AC-9** — Deleting a non-empty group with "Move to Ungrouped" keeps all its questions in the plan, appended to Ungrouped in their previous order.
- **AC-10** — `/plans/<id>?lang=vn` shows Vietnamese text where present and English otherwise, per field.
- **AC-11** — Every reorder/move achievable by drag and drop is also achievable with keyboard or buttons only.
- **AC-12** — `/plans` lists only plans of the current active domain.
