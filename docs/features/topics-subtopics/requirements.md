# Topics & Sub-Topics — Requirements (as built)

> Reverse-engineered from the current implementation. Items that could not be confirmed from code
> are marked **Unknown / needs confirmation**.

## Feature overview

Topics are a two-level taxonomy (`Topic` → `SubTopic`) used to organize questions. Like questions,
they are either **defaults** (admin-authored, shared with everyone in the domain) or **private**
(user-authored, visible only to their creator). Users manage them on `/topics`, filter the question
list by them from the left sidebar, and attach them to questions in the question form. Each viewer
can additionally drag topics and sub-topics into a personal order, which is stored in the browser
rather than the database.

## Purpose / user problem

A flat list of questions becomes unusable past a few dozen entries. Topics give the collection
structure, drive the sidebar navigation, and provide the primary filter on the question list. The
default/private split mirrors questions: admins curate a shared taxonomy, users extend it privately.

## Current functional requirements

### Visibility

- **T-R1** — `GET /api/topics` returns topics that are in the caller's active domain **and** are either a default (`isDefault = true`) or created by the caller.
- **T-R2** — Sub-topics returned inside each topic are filtered by the same default-or-mine rule.
- **T-R3** — Topics are returned ordered by `name` ascending; sub-topics likewise.
- **T-R4** — Each topic includes its `subTopics` array.
- **T-R5** — `GET /api/subtopics` returns sub-topics filtered by the default-or-mine rule. With a `topicId` query parameter it returns that topic's sub-topics; without one it scopes to sub-topics whose parent topic is in the caller's active domain.

### Creating topics

- **T-R6** — `POST /api/topics` creates a topic with a `name`.
- **T-R7** — Any signed-in user may create a topic.
- **T-R8** — For a non-admin, or for an admin who does not tick the default box, the topic is created with `isDefault = false` and `createdBy = <caller>`.
- **T-R9** — For an admin who ticks the default box, the topic is created with `isDefault = true` and `createdBy = null` — default topics are ownerless.
- **T-R10** — New topics are stamped with the creator's active domain.
- **T-R11** — The "Default topic (visible to all users)" checkbox is rendered only for admins.
- **T-R12** — On success the API returns `201` with the topic and its (empty) `subTopics` array.

### Creating sub-topics

- **T-R13** — `POST /api/subtopics` creates a sub-topic with a `name` and a `topicId`.
- **T-R14** — The same default rule applies: admin + `isDefault: true` → `isDefault = true, createdBy = null`; otherwise `isDefault = false, createdBy = <caller>`.
- **T-R15** — Sub-topics are **not** stamped with a domain; they inherit it from their parent topic.
- **T-R16** — A sub-topic is created from the parent topic's "+" button, which pre-selects the parent.

### Editing

- **T-R17** — `PUT /api/topics/[id]` updates a topic's `name` only. `isDefault` and `domainId` cannot be changed.
- **T-R18** — `PUT /api/subtopics/[id]` updates a sub-topic's `name` **and** `topicId`, so a sub-topic can be moved to a different parent.
- **T-R19** — A user may edit a topic or sub-topic if they created it, or if it is a default and they are an `ADMIN`. Otherwise `403`.
- **T-R20** — Edit and delete controls are shown in the UI only when the item is not a default, or the viewer is an admin.

### Deleting

- **T-R21** — `DELETE /api/topics/[id]` deletes the topic. Permission is the same as for editing.
- **T-R22** — Deleting a topic cascades to its sub-topics and to the `QuestionTopic` join rows. Questions themselves are not deleted.
- **T-R23** — Deleting a sub-topic cascades to its `QuestionSubTopic` join rows.
- **T-R24** — The topic delete confirms with "Delete this topic and all its sub-topics?"; the sub-topic delete confirms with "Delete this sub-topic?".

### Sidebar navigation

- **T-R25** — The left sidebar lists the caller's visible topics, each expandable to reveal its sub-topics.
- **T-R26** — The sidebar is rendered only on `/questions` and its sub-paths. It is hidden everywhere else.
- **T-R27** — On screens below `md` the sidebar is available through a hamburger sheet, which is likewise only offered on `/questions` paths.
- **T-R28** — Clicking a topic navigates to `/questions?topicId=<id>`; clicking a sub-topic navigates to `/questions?topicId=<id>&subTopicId=<id>`.
- **T-R29** — The topic matching the current `topicId` (with no `subTopicId`) is highlighted, as is the active sub-topic.
- **T-R30** — The topic named in `?topicId=` is auto-expanded on first render.
- **T-R31** — Topics that are not defaults are marked with a small "mine" chip.
- **T-R32** — An "All Questions" link at the top clears the topic filter, and is highlighted when no `topicId` is active.
- **T-R33** — Each topic shows an icon looked up by **exact name match** against a hard-coded map covering the seeded topics of all three domains. Any name not in the map falls back to a generic folder icon. Brand icons additionally carry an official brand color.
- **T-R34** — A "+" link next to the "Topics" heading navigates to `/topics`.

### Personal ordering

- **T-R35** — On `/topics`, topics can be reordered by dragging a grip handle, and sub-topics can be reordered within their topic.
- **T-R36** — The order is stored in `localStorage` under a single key shared by the topics page and the sidebar, so a reorder on one is reflected in the other.
- **T-R37** — The order is **per browser**, not per account. It does not sync across devices and is not stored in the database.
- **T-R38** — Items missing from the saved order (newly created ones) keep their server-provided relative position and appear after the explicitly ordered items.
- **T-R39** — Reordering updates every subscribed component in the current tab immediately, and other tabs via the browser `storage` event.
- **T-R40** — Drag activates only after a 5-pixel pointer movement, so clicks on the handle do not start a drag. Keyboard-based reordering is also supported.

### Question form integration

- **T-R41** — The question form offers a multi-select topic picker and a multi-select sub-topic picker, both backed by `/api/topics`.
- **T-R42** — The sub-topic picker's options are restricted to sub-topics of the currently selected topics. When no topic is selected, it offers all of them.
- **T-R43** — Already-selected sub-topics continue to render their names as badges even if their parent topic is later deselected.
- **T-R44** — Selected items appear as removable badges below each picker.

### Admin surface

- **T-R45** — `/admin/topics` renders the same `TopicList` component with `isAdmin` forced true. For an `ADMIN` it is functionally identical to `/topics`; the only differences are the page heading and description.

## User flows

### Create a topic and a sub-topic
1. User opens `/topics` (from the header nav, the user menu, or the sidebar "+").
2. Clicks "Add Topic", types a name, presses Enter or clicks Create.
3. `POST /api/topics` → SWR revalidates → the topic card appears.
4. Clicks the "+" on that card, types a sub-topic name, creates it.
5. `POST /api/subtopics` → the sub-topic badge appears on the card.

### Filter questions by topic
1. On `/questions`, the user clicks a topic in the sidebar.
2. Navigates to `/questions?topicId=<id>`; the list is filtered and the topic is highlighted.
3. The user expands the topic and clicks a sub-topic to narrow further.
4. "Add Question" from this view pre-fills the topic and sub-topic on the new-question form.

### Reorder topics
1. On `/topics`, the user drags a topic card by its grip handle to a new position.
2. The new order is written to `localStorage` and a custom event fires.
3. The sidebar re-renders in the new order immediately.

## Business rules

- **T-B1** — Default topics and sub-topics have `createdBy = null`; private ones have `createdBy = <user>`.
- **T-B2** — `Topic` is unique on `(name, createdBy, domainId)`. Two users may each have a private topic called "React" in the same domain, and a default "React" may coexist with both.
- **T-B3** — `SubTopic` is unique on `(name, topicId, createdBy)`.
- **T-B4** — Deleting a user sets `createdBy` to `null` on their topics and sub-topics (`onDelete: SetNull`) — which silently converts them into ownerless rows.
- **T-B5** — Deleting a domain sets `Topic.domainId` to `null` (`onDelete: SetNull`).
- **T-B6** — Topic ordering is presentation-only and never affects API responses.
- **T-B7** — A question may be linked to any number of topics and sub-topics, and the link is not required to be consistent (a sub-topic may be attached without its parent topic).

## Validation rules

`src/lib/validations/topic.ts`:

| Schema | Field | Rule |
|---|---|---|
| `topicSchema` | `name` | string, min 1 ("Name is required"), max 100 |
| `subTopicSchema` | `name` | string, min 1 ("Name is required"), max 100 |
| `subTopicSchema` | `topicId` | string, min 1 ("Topic is required") |

- **T-V1** — Validation failure returns `400` with the first Zod issue message.
- **T-V2** — `isDefault` is **not part of either schema**. Both `POST` handlers read it from the raw `body` object, bypassing validation entirely.
- **T-V3** — The client disables saving when the name is empty or whitespace-only, but the server's `min(1)` accepts a whitespace-only name.
- **T-V4** — `POST /api/subtopics` does not verify that `topicId` refers to a topic the caller can see, or that it exists at all.
- **T-V5** — Names are not trimmed or normalized before the uniqueness check.

## Permissions / access restrictions

| Action | Anonymous | `USER` | `ADMIN` |
|---|---|---|---|
| List topics / sub-topics | `401` | Defaults + own, domain-scoped | Same |
| Create private topic / sub-topic | ❌ | ✅ | ✅ |
| Create **default** topic / sub-topic | ❌ | ❌ (flag ignored) | ✅ |
| Edit / delete own | ❌ | ✅ | ✅ |
| Edit / delete a default | ❌ | `403` | ✅ |
| Edit / delete another user's private | ❌ | `403` | `403` |
| `/admin/topics` | ❌ | ❌ → `/questions` | ✅ |

## Error and failure behavior

- **T-E1** — No session → `401 { error: "Unauthorized" }`.
- **T-E2** — Unknown id on `PUT` / `DELETE` → `404 { error: "Not found" }`.
- **T-E3** — Insufficient permission → `403 { error: "Forbidden" }`.
- **T-E4** — Validation failure → `400` with the first message.
- **T-E5** — Save failures show a toast built from `data.error`, falling back to "Failed to save topic" / "Failed to save sub-topic".
- **T-E6** — Delete failures show "Failed to delete".
- **T-E7** — A duplicate name violating a unique constraint raises an **unhandled Prisma error**, producing a `500` rather than a friendly `409`.
- **T-E8** — `localStorage` write failures during reordering are swallowed silently; the ordering is treated as best-effort.
- **T-E9** — Corrupt `localStorage` content is caught and treated as an empty order.

## Important edge cases

- **T-X1** — **Duplicate names crash rather than warn.** Creating a second private topic with the same name in the same domain violates `@@unique([name, createdBy, domainId])`. The handler does not catch `P2002`, so the response is a `500`. The client then calls `res.json()` on that response, and the toast shows either an unhelpful message or nothing at all.
- **T-X2** — **A user with no active domain sees no topics.** `GET /api/topics` builds `where: { domainId: user?.activeDomainId, … }`; when that is `null`, Prisma filters for `domainId IS NULL` rather than skipping the filter. See [`../domains/`](../domains/) DOM-X1.
- **T-X3** — `GET /api/subtopics?topicId=<id>` **skips the domain filter entirely**, so sub-topics of a topic in another domain are returned as long as they are defaults or the caller's own.
- **T-X4** — `PUT /api/subtopics/[id]` accepts a `topicId`, so a sub-topic can be moved to a topic in a different domain — silently changing its effective domain. There is no UI for this, but the API allows it, and the UI always sends the current parent's id.
- **T-X5** — `isDefault` is read from the unvalidated `body` rather than `parsed.data` (T-V2). A non-boolean value is compared with `=== true`, so only a literal `true` has an effect — the behavior is safe, but it bypasses the schema.
- **T-X6** — **A topic's `isDefault` cannot be changed after creation.** `PUT /api/topics/[id]` updates only `name`, so an admin who forgets the checkbox must delete and recreate.
- **T-X7** — The topics page's edit dialog does not repopulate the `isDefault` checkbox from the item being edited; it always resets to `false`. Since `isDefault` is ignored on update, this is cosmetic — but it misleads the admin.
- **T-X8** — **Deleting a topic deletes its sub-topics and unlinks its questions, but the confirm text does not mention the questions.** Questions survive; only the `QuestionTopic` rows are removed.
- **T-X9** — Personal ordering is per browser (T-R37). Signing in on another device, or clearing site data, silently returns everything to alphabetical order with no indication that a custom order existed.
- **T-X10** — The ordering key is global (`interview-prep:topic-order:topics`), **not scoped by domain or user**. Switching domains, or signing in as a different user in the same browser, reuses the same stored order. Ids that do not match simply fall to the end, so the effect is a partially-arbitrary order rather than an error.
- **T-X11** — Sub-topic ordering is keyed by parent topic id inside the same record, so moving a sub-topic between topics leaves a stale entry in the old topic's order array.
- **T-X12** — The sidebar's expanded-topic state is initialized once from the URL and is not resynchronized when `topicId` changes through client-side navigation.
- **T-X13** — Topic icons are keyed on the **exact** topic name, so any user-created topic — and any renamed or re-worded default — silently falls back to the generic folder icon. There is no way to choose an icon, and the map has to be edited in code to cover a new topic.
- **T-X14** — The question form's sub-topic picker filters options by selected topics, but **deselecting a topic does not remove its already-selected sub-topics** from the form state — they remain attached and are saved.
- **T-X15** — There is no UI to see or manage which questions use a topic before deleting it. The count is not shown anywhere.
- **T-X16** — `/admin/topics` is indistinguishable from `/topics` for an admin (T-R45) — it renders the same component with the same capabilities.
- **T-X17** — A sub-topic can be created under a topic the caller cannot see, because `POST /api/subtopics` does not validate the parent (T-V4).

## Non-goals / not supported

- More than two levels of nesting.
- Moving a sub-topic between topics from the UI (the API supports it; no UI exposes it).
- Changing `isDefault` after creation.
- Merging or splitting topics.
- Renaming a topic across all users (a default rename by an admin does affect everyone, but there is no bulk or scoped rename).
- Showing question counts per topic.
- Server-persisted or cross-device ordering.
- Per-domain or per-user ordering keys.
- Colors, descriptions, or custom icons per topic.
- Archiving a topic without deleting it.
- Bulk create, bulk delete, or import of a taxonomy.

## Acceptance criteria

- **AC-1** — `GET /api/topics` returns only topics in the caller's active domain that are defaults or created by the caller, name-ascending, each with its filtered sub-topics.
- **AC-2** — A non-admin posting `isDefault: true` creates a topic with `isDefault = false` and `createdBy = <caller>`.
- **AC-3** — An admin posting `isDefault: true` creates a topic with `isDefault = true` and `createdBy = null`.
- **AC-4** — A non-admin receives `403` from `PUT` and `DELETE` on a default topic and on another user's private topic.
- **AC-5** — Deleting a topic removes its sub-topics and its `QuestionTopic` rows, and leaves the questions themselves intact.
- **AC-6** — `POST /api/topics` with an empty name returns `400 { error: "Name is required" }`.
- **AC-7** — Clicking a sidebar sub-topic navigates to `/questions?topicId=…&subTopicId=…` and the question list is filtered accordingly.
- **AC-8** — Dragging a topic on `/topics` changes its position, persists across a reload, and is reflected in the sidebar without a refresh.
- **AC-9** — A newly created topic appears in the list even though it is absent from the saved order, positioned after the explicitly ordered items.
- **AC-10** — The sub-topic picker in the question form offers only sub-topics belonging to the selected topics.
</content>
