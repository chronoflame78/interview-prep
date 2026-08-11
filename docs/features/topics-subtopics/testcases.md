# Topics & Sub-Topics — Test Cases

> Verification plan for **current** behavior. Requirement IDs refer to
> [`requirements.md`](./requirements.md).

## Existing automated tests

**None.** No test runner is installed and no test files exist in the repository.

## Happy path

### TC-T01 — Create a private topic
- **Requirements:** T-R6, R7, R8, R10, R12 · AC-2 (partial)
- **Level:** Integration
- **Preconditions:** Signed in as `USER` with domain A active.
- **Steps:** `POST /api/topics` with `{ name: "GraphQL" }`.
- **Expected:** `201`; row has `isDefault = false`, `createdBy = <user>`, `domainId = A`, and an empty `subTopics` array in the response.

### TC-T02 — Admin creates a default topic
- **Requirements:** T-R9, R11 · AC-3
- **Level:** Integration
- **Steps:** As `ADMIN`, `POST /api/topics` with `{ name: "Kubernetes", isDefault: true }`.
- **Expected:** `201`; `isDefault = true` and **`createdBy = null`**. The topic is visible to other users in the same domain.

### TC-T03 — Create a sub-topic
- **Requirements:** T-R13, R14, R15, R16
- **Level:** Integration
- **Preconditions:** Topic T owned by the caller.
- **Steps:** `POST /api/subtopics` with `{ name: "Resolvers", topicId: T }`.
- **Expected:** `201`; `isDefault = false`, `createdBy = <user>`, `topicId = T`. The `SubTopic` row has **no domain column** — confirm the model carries none.

### TC-T04 — List topics with nested sub-topics
- **Requirements:** T-R1, R2, R3, R4 · AC-1
- **Level:** Integration
- **Preconditions:** In domain A — default topic D (with default sub-topic DS), user-A topic P (with sub-topic PS), user-B topic Q. Signed in as user A.
- **Steps:** `GET /api/topics`.
- **Expected:** D and P returned, Q absent; D contains DS, P contains PS; topics name-ascending and sub-topics name-ascending within each.

### TC-T05 — Rename a topic
- **Requirements:** T-R17, R19
- **Level:** Integration
- **Steps:** `PUT /api/topics/<own topic>` with `{ name: "Renamed" }`.
- **Expected:** `200`; `name` updated; `isDefault`, `createdBy`, and `domainId` unchanged.

### TC-T06 — Delete a topic
- **Requirements:** T-R21, R22 · AC-5
- **Level:** Integration
- **Preconditions:** Topic T with two sub-topics, linked to question Q.
- **Steps:** `DELETE /api/topics/<T>`.
- **Expected:** `200 { success: true }`; T and both sub-topics gone; the `QuestionTopic` and `QuestionSubTopic` rows gone; **question Q still exists**.

### TC-T07 — Create a topic and sub-topic through the UI
- **Requirements:** T-R6, R13, R16
- **Level:** E2E
- **Steps:** On `/topics`, click "Add Topic", type a name, press Enter. Then click the "+" on the new card, type a sub-topic name, click Create.
- **Expected:** Toasts "Topic created" / "Sub-topic created"; both appear without a page reload; the sidebar on `/questions` shows them too.

### TC-T08 — Filter questions from the sidebar
- **Requirements:** T-R28, R29 · AC-7
- **Level:** E2E
- **Steps:** On `/questions`, click a topic, then expand it and click a sub-topic.
- **Expected:** URLs `/questions?topicId=…` then `/questions?topicId=…&subTopicId=…`; the list narrows at each step; the clicked item is highlighted; "All Questions" loses its highlight.

## Validation cases

### TC-T09 — Empty topic name
- **Requirements:** T-V1 · AC-6
- **Level:** Integration
- **Steps:** `POST /api/topics` with `{ name: "" }` and with `{}`.
- **Expected:** `400 { error: "Name is required" }` in both cases.

### TC-T10 — Name over 100 characters
- **Requirements:** T-V1
- **Level:** Unit (schema) + Integration
- **Steps:** Validate names of length 100 and 101.
- **Expected:** 100 accepted, 101 rejected with `400`.

### TC-T11 — Sub-topic without `topicId`
- **Requirements:** T-V1
- **Level:** Integration
- **Steps:** `POST /api/subtopics` with `{ name: "Orphan" }`.
- **Expected:** `400 { error: "Topic is required" }`.

### TC-T12 — Whitespace-only name is accepted by the server
- **Requirements:** T-V3
- **Level:** Integration
- **Steps:** `POST /api/topics` with `{ name: "   " }`.
- **Expected:** **`201`** — `min(1)` passes and no trimming occurs. The client-side guard (`name.trim()`) prevents this through the UI only. Pins the divergence.

### TC-T13 — Names are not trimmed for uniqueness
- **Requirements:** T-V5
- **Level:** Integration
- **Steps:** Create `"React"`, then `"React "` (trailing space) as the same user in the same domain.
- **Expected:** **Both succeed** as distinct topics.

### TC-T14 — `isDefault` bypasses the schema
- **Requirements:** T-V2, T-X5
- **Level:** Integration
- **Steps:** As `ADMIN`, `POST /api/topics` with `{ name: "X", isDefault: "true" }` (string), then `{ isDefault: 1 }`, then `{ isDefault: true }`.
- **Expected:** Only the literal boolean `true` produces a default topic; the string and number are treated as false. Confirms the `=== true` guard makes the unvalidated field safe in practice.

## Permission cases

### TC-T15 — Non-admin cannot create a default
- **Requirements:** T-R8 · AC-2
- **Level:** Integration
- **Steps:** As `USER`, `POST /api/topics` with `{ name: "X", isDefault: true }`.
- **Expected:** `201` but the row has `isDefault = false` and `createdBy = <user>`.

### TC-T16 — Non-admin cannot edit or delete a default topic
- **Requirements:** T-R19, T-R21 · AC-4
- **Level:** Integration
- **Steps:** As `USER`, `PUT` and `DELETE` on a default topic.
- **Expected:** `403 { error: "Forbidden" }` from both; the row is unchanged.

### TC-T17 — Cannot touch another user's private topic
- **Requirements:** T-R19 · AC-4
- **Level:** Integration
- **Steps:** As user B, `PUT` and `DELETE` user A's private topic.
- **Expected:** `403` from both.

### TC-T18 — Same rules apply to sub-topics
- **Requirements:** T-R19
- **Level:** Integration
- **Steps:** Repeat TC-T16 and TC-T17 against `/api/subtopics/[id]`.
- **Expected:** Identical `403` results.

### TC-T19 — Admin may edit a default
- **Requirements:** T-R19
- **Level:** Integration
- **Steps:** As `ADMIN`, rename and then delete a default topic.
- **Expected:** Both succeed.

### TC-T20 — Edit/delete controls hidden for non-admins on defaults
- **Requirements:** T-R20
- **Level:** Unit (component)
- **Steps:** Render `TopicList` with `isAdmin: false` against a default topic and a private topic.
- **Expected:** Pencil and trash icons hidden on the default, shown on the private one. With `isAdmin: true`, shown on both. The "+" (add sub-topic) button is always shown.

### TC-T21 — `/admin/topics` is admin-only
- **Level:** E2E
- **Steps:** Visit `/admin/topics` as `USER`, then as `ADMIN`.
- **Expected:** Redirect to `/questions` for `USER`; renders for `ADMIN`.

### TC-T22 — Unauthenticated API access
- **Requirements:** T-E1
- **Level:** Integration (handlers called directly with `auth()` mocked to `null`)
- **Steps:** Invoke all eight handlers (`GET`/`POST` × 2 collections, `PUT`/`DELETE` × 2 items).
- **Expected:** `401 { error: "Unauthorized" }` from every one.

## Error cases

### TC-T23 — Duplicate topic name returns 500, not 409
- **Requirements:** T-E7, T-X1
- **Level:** Integration
- **Steps:** As one user in one domain, `POST /api/topics` with `{ name: "React" }` twice.
- **Expected:** The second call **fails with an unhandled Prisma `P2002` → `500`**, not a friendly `409`. This is the most likely real-world error path and is currently unprotected.

### TC-T24 — Duplicate error surfaces poorly in the UI
- **Requirements:** T-E5, T-X1
- **Level:** Unit (component)
- **Steps:** Stub `POST /api/topics` to return a `500` with a non-JSON body; submit the dialog.
- **Expected:** Document what the user actually sees — `TopicList` calls `await res.json()` on the failure path, which throws on a non-JSON body, so **no toast may appear at all**. Pin this behavior.

### TC-T25 — Duplicate default names do not collide
- **Requirements:** T-B2
- **Level:** Integration
- **Steps:** As `ADMIN`, create two default topics both named `"React"` in the same domain.
- **Expected:** **Both succeed**, because `createdBy` is `null` for defaults and PostgreSQL treats `NULL`s as distinct in a unique index. Documents a real gap in the constraint.

### TC-T26 — Unknown id on item routes
- **Requirements:** T-E2
- **Level:** Integration
- **Steps:** `PUT` and `DELETE` `/api/topics/nonexistent` and `/api/subtopics/nonexistent`.
- **Expected:** `404 { error: "Not found" }` from all four.

### TC-T27 — Non-existent parent on sub-topic create
- **Requirements:** T-V4, T-X17
- **Level:** Integration
- **Steps:** `POST /api/subtopics` with `{ name: "X", topicId: "nope" }`.
- **Expected:** **Unhandled foreign-key error → `500`**, not a clean `400`.

### TC-T28 — Sub-topic under an invisible parent
- **Requirements:** T-V4, T-X17
- **Level:** Integration
- **Preconditions:** Topic T is user B's private topic.
- **Steps:** As user A, `POST /api/subtopics` with `{ name: "X", topicId: T }`.
- **Expected:** **`201`** — no visibility check is performed. The sub-topic is created under another user's topic. Documents the gap.

### TC-T29 — Delete failure toast
- **Requirements:** T-E6
- **Level:** Unit (component)
- **Steps:** Stub `DELETE` to return `500`; confirm the dialog.
- **Expected:** Toast "Failed to delete"; the item remains in the list.

## Domain-scoping cases

### TC-T30 — Topics are domain-scoped
- **Requirements:** T-R1 · AC-1
- **Level:** Integration
- **Preconditions:** Default topics in domains A and B.
- **Steps:** `GET /api/topics` with A active, then with B active.
- **Expected:** Only that domain's topics in each case.

### TC-T31 — Domain-less user sees no topics
- **Requirements:** T-X2
- **Level:** Integration
- **Preconditions:** User with `activeDomainId = null`; all topics have a non-null `domainId`.
- **Steps:** Call the `GET /api/topics` handler directly.
- **Expected:** **Empty array** — the filter becomes `domainId IS NULL`. Contrast with `/api/questions`, which returns everything for the same user. See [`../domains/testcases.md`](../domains/testcases.md) TC-D21.

### TC-T32 — `GET /api/subtopics?topicId=` ignores the domain
- **Requirements:** T-R5, T-X3
- **Level:** Integration
- **Preconditions:** Topic T (with default sub-topics) is in domain B; domain A is active.
- **Steps:** `GET /api/subtopics?topicId=<T>`.
- **Expected:** T's sub-topics **are returned** despite the domain mismatch. Also assert that the endpoint has no UI caller — this is currently dead code.

### TC-T33 — Moving a sub-topic across domains
- **Requirements:** T-R18, T-X4
- **Level:** Integration
- **Preconditions:** Sub-topic S under topic T1 (domain A); topic T2 in domain B, same owner.
- **Steps:** `PUT /api/subtopics/<S>` with `{ name: S.name, topicId: T2 }`.
- **Expected:** `200`; S is now under T2 and therefore effectively in domain B. No warning, no check.

## Ordering cases

### TC-T34 — `applyOrder` respects the saved order
- **Requirements:** T-R35, T-R38 · AC-9
- **Level:** Unit (pure function)
- **Steps:** `applyOrder([{id:"a"},{id:"b"},{id:"c"}], ["c","a"])`.
- **Expected:** `[c, a, b]` — ordered ids first, unknown ids appended in their original relative order (stable sort with `Infinity`).

### TC-T35 — `applyOrder` with an empty order
- **Requirements:** T-R38
- **Level:** Unit
- **Steps:** `applyOrder(items, [])`.
- **Expected:** The original array reference is returned unchanged (early return).

### TC-T36 — `applyOrder` is stable for multiple unknowns
- **Requirements:** T-R38 · AC-9
- **Level:** Unit
- **Steps:** `applyOrder([{id:"a"},{id:"b"},{id:"c"},{id:"d"}], ["d"])`.
- **Expected:** `[d, a, b, c]` — a, b, c keep their server order.

### TC-T37 — Reorder persists and syncs to the sidebar
- **Requirements:** T-R36, T-R39 · AC-8
- **Level:** E2E
- **Steps:** On `/topics`, drag the third topic to first. Navigate to `/questions`.
- **Expected:** `localStorage["interview-prep:topic-order:topics"]` holds the new id array; the sidebar shows the same order; the order survives a reload.

### TC-T38 — Same-tab notification
- **Requirements:** T-R39
- **Level:** Unit
- **Steps:** Mount two components using `useTopicOrder()`. Call `saveOrder` from one.
- **Expected:** Both re-render with the new state, driven by the `interview-prep:topic-order-change` CustomEvent (the native `storage` event does not fire in the originating tab).

### TC-T39 — Cross-tab sync
- **Requirements:** T-R39
- **Level:** Unit
- **Steps:** Dispatch a synthetic `storage` event after changing the stored value.
- **Expected:** Subscribed components re-render with the new order.

### TC-T40 — Snapshot reference stability
- **Requirements:** implementation constraint of `useSyncExternalStore`
- **Level:** Unit
- **Steps:** Call `useTopicOrder()`'s snapshot getter repeatedly without changing `localStorage`.
- **Expected:** The **same object reference** each time. If this regresses, React enters an infinite render loop — this is a high-value guard test.

### TC-T41 — Corrupt `localStorage`
- **Requirements:** T-E9
- **Level:** Unit
- **Steps:** Set the key to `"{not json"`, then to `'{"topics":"nope","subs":null}'`.
- **Expected:** `EMPTY` (`{ topics: [], subs: {} }`) in both cases; no throw; the list renders in server order.

### TC-T42 — `localStorage` write failure is swallowed
- **Requirements:** T-E8
- **Level:** Unit
- **Steps:** Stub `setItem` to throw a quota error; perform a reorder.
- **Expected:** No exception escapes; the UI does not crash; the order simply is not persisted.

### TC-T43 — SSR safety
- **Level:** Unit
- **Steps:** Call `loadOrder` / the server snapshot with `window` undefined.
- **Expected:** `EMPTY` returned; no `ReferenceError`.

### TC-T44 — Ordering key is shared across users and domains
- **Requirements:** T-X10
- **Level:** E2E
- **Steps:** Reorder topics as user A, sign out, sign in as user B in the same browser.
- **Expected:** B's topics are ordered using A's saved id list. Since B's ids mostly do not match, the effect is a partially arbitrary order. Pins the missing scoping.

### TC-T45 — Stale sub-order after moving a sub-topic
- **Requirements:** T-X11
- **Level:** Unit
- **Steps:** Record a sub-order for topic T1, then move sub-topic S to T2 via the API and re-read the order state.
- **Expected:** `order.subs[T1]` still contains S's id. Harmless in effect, but the record grows stale.

### TC-T46 — Drag activation threshold
- **Requirements:** T-R40
- **Level:** Unit (component)
- **Steps:** Press and move the grip handle by 3 px, then release. Repeat with 10 px.
- **Expected:** No reorder at 3 px; a reorder at 10 px. Confirms the 5 px `activationConstraint`.

### TC-T47 — Keyboard reordering
- **Requirements:** T-R40
- **Level:** Unit (component)
- **Steps:** Focus a grip handle, press Space, arrow down, Space.
- **Expected:** The item moves; the handle exposes `aria-label="Reorder <name>"`.

## Sidebar cases

### TC-T48 — Sidebar visibility by route
- **Requirements:** T-R26, T-R27
- **Level:** Unit (component)
- **Steps:** Render `ConditionalSidebar` at `/questions`, `/questions/new`, `/questions/abc/edit`, `/topics`, `/profile`, `/interview`.
- **Expected:** Rendered for the first three, `null` for the rest. The mobile hamburger trigger follows the same rule.

### TC-T49 — Auto-expand the active topic
- **Requirements:** T-R30
- **Level:** Unit (component)
- **Steps:** Render the sidebar at `/questions?topicId=<T>`.
- **Expected:** T is expanded on first render, showing its sub-topics.

### TC-T50 — Expansion does not resync on navigation
- **Requirements:** T-X12
- **Level:** E2E
- **Steps:** From `/questions?topicId=T1`, click topic T2 in the sidebar.
- **Expected:** T2 becomes highlighted but **does not auto-expand**, because the expansion `Set` is only initialized once. Pins the current behavior.

### TC-T51 — "mine" chip on private topics
- **Requirements:** T-R31
- **Level:** Unit (component)
- **Steps:** Render the sidebar with one default and one private topic.
- **Expected:** The chip appears only on the private one.

### TC-T52 — Topics without sub-topics
- **Requirements:** T-R25
- **Level:** Unit (component)
- **Steps:** Render a topic whose `subTopics` is empty.
- **Expected:** No chevron button — a spacer is rendered instead — and the row is not expandable.

### TC-T53 — "All Questions" highlight
- **Requirements:** T-R32
- **Level:** Unit (component)
- **Steps:** Render at `/questions` with no `topicId`, then with one.
- **Expected:** Highlighted only in the first case.

### TC-T54 — Icon lookup
- **Requirements:** T-R33, T-X13
- **Level:** Unit (component)
- **Steps:** Render `TopicIcon` for `"React"`, `"Next.js"`, `"Corporate Finance"`, and `"My Custom Topic"`.
- **Expected:** Brand/lucide icons for the first three (React and Next.js from the exact-name map, React carrying its brand color); the generic `FolderOpen` fallback for the fourth.

## Question-form integration

### TC-T55 — Sub-topic options restricted to selected topics
- **Requirements:** T-R42 · AC-10
- **Level:** Unit (component)
- **Steps:** Render `TopicSelector` with `type="subtopic"` and `topicIds: [T1]`, given topics T1 and T2 each with sub-topics.
- **Expected:** Only T1's sub-topics are offered. With `topicIds: []`, **all** sub-topics are offered.

### TC-T56 — Selected sub-topic keeps its label after the parent is deselected
- **Requirements:** T-R43, T-X14
- **Level:** Unit (component)
- **Steps:** Select sub-topic S under T1, then deselect T1.
- **Expected:** S's badge **still renders its name** (resolved from the unfiltered `allItems` list) and **remains selected**, so it will be saved with the question. Pins both the intended behavior and the un-pruned selection.

### TC-T57 — Removing a selection via its badge
- **Requirements:** T-R44
- **Level:** Unit (component)
- **Steps:** Click the X on a selected topic badge.
- **Expected:** `onChange` is called without that id; the badge disappears.

### TC-T58 — Topic pre-fill from the question list
- **Requirements:** see [`../questions-management/`](../questions-management/) Q-R12
- **Level:** E2E
- **Steps:** Filter `/questions` by a topic and sub-topic, click "Add Question".
- **Expected:** The new-question form opens with both pre-selected.

## Loading and empty states

### TC-T59 — Empty topic list
- **Requirements:** T-R25
- **Level:** Unit (component)
- **Steps:** Render `TopicList` with `/api/topics` returning `[]`.
- **Expected:** "No topics yet. Create your first topic to organize your questions."

### TC-T60 — Sidebar loading skeleton
- **Level:** Unit (component)
- **Steps:** Render the sidebar with SWR loading.
- **Expected:** Five `Skeleton` rows; also verify the outer `Suspense` fallback renders the same shape.

### TC-T61 — `TopicList` before data arrives
- **Level:** Unit (component)
- **Steps:** Render with SWR pending (`topics === undefined`).
- **Expected:** Neither the topic list nor the empty-state message renders — `orderedTopics && length > 0` and `topics?.length === 0` are both false. Confirms no flash of the empty state.

### TC-T62 — Selector before data arrives
- **Level:** Unit (component)
- **Steps:** Render `TopicSelector` with SWR pending.
- **Expected:** "No results found." inside the command list; no crash on `undefined`.

## Regression-sensitive behavior

| Area | Why it is fragile | Guard test |
|---|---|---|
| `getSnapshot` reference caching | Returning a fresh object causes an infinite render loop | TC-T40 |
| Custom-event dispatch in `saveOrder` | Without it, same-tab subscribers never update and the sidebar desyncs | TC-T38 |
| Stable sort in `applyOrder` | Switching to an unstable comparator scrambles unordered items | TC-T34, TC-T36 |
| `isDefault` / `createdBy` ternary | Inverting it would give default topics an owner, breaking the visibility rule | TC-T02, TC-T15 |
| `domainId: activeDomainId` idiom | "Fixing" it to a conditional spread changes TC-T31's outcome | TC-T31 |
| `topicId` branch in `/api/subtopics` | Restoring the domain filter changes TC-T32 | TC-T32 |
| `showSidebarFor` | Widening it renders the sidebar on unrelated pages | TC-T48 |
| Shared `name` state in `TopicList` | Reset is spread across five handlers; a missed reset leaks a value between dialogs | TC-T07 |
| Nested `DndContext`s | Collapsing them into one makes sub-topics drag across topic boundaries | TC-T37, TC-T46 |
| Cascade on `SubTopic.topicId` | Changing it to `SetNull` would orphan sub-topics on topic deletion | TC-T06 |

## Recommended missing coverage

Ordered by value:

1. **Unit tests for `src/lib/topic-order.ts`** — it is pure, dependency-free logic and the single
   highest-value target in this feature. `applyOrder`, `parse`, the snapshot cache, and the
   event wiring are all trivially testable and currently unprotected. TC-T40 in particular guards
   against an infinite render loop.
2. **TC-T23 / TC-T24 (duplicate name handling)** — the most likely error a real user hits, and it
   currently produces a `500` plus a possibly-silent client failure.
3. **Integration tests for the permission matrix** (TC-T15 → TC-T19) across both resources.
4. **TC-T31 (domain-less user sees no topics)** — pairs with `domains` TC-D21 to pin the
   inconsistency between the two scoping idioms.
5. **Referential-integrity tests** (TC-T27, TC-T28) documenting that sub-topic creation validates
   nothing about its parent.
6. **TC-T25 (duplicate defaults do not collide)** — a genuine gap in the unique constraint that no
   one is likely to notice otherwise.
7. **Component tests for the selector's filtering behavior** (TC-T55, TC-T56), since the
   `items` / `allItems` split is subtle and easy to "simplify" incorrectly.
8. **Cascade-behavior tests** (TC-T06) — deletion semantics are schema-level and would break silently
   if a relation's `onDelete` were changed.
9. **No coverage exists for `/api/subtopics` at all**, which is unused dead code today. A test would
   at least record that fact before someone wires it up.
</content>
