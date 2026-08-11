# Questions Management — Requirements (as built)

> Reverse-engineered from the current implementation. Items that could not be confirmed from code
> are marked **Unknown / needs confirmation**.
>
> The per-user customization of *default* questions is a distinct feature documented separately in
> [`../question-overrides/`](../question-overrides/). This document covers creation, editing,
> deletion, listing, filtering, starring, and export.

## Feature overview

Questions are the core content unit. Each question carries up to three language variants (English,
Vietnamese, Custom) for both the question and the answer, a difficulty level, links to topics and
sub-topics, and links to related questions. Questions are either **defaults** (created by an admin,
visible to everyone in the domain) or **private** (created by a user, visible only to them). Users
browse a filtered list, expand cards to read answers, star questions as important, and export the
current selection to Markdown.

## Purpose / user problem

Interview candidates need a personal, searchable bank of questions and model answers. The default
set gives them a curated starting point; private questions let them capture what they encounter
themselves; the multilingual variants support preparing in more than one language.

## Current functional requirements

### Visibility

- **Q-R1** — A user sees a question if it is a default (`isDefault = true`) **or** they created it (`createdBy = userId` and `isDefault = false`).
- **Q-R2** — Results are additionally scoped to the user's active domain (see [`../domains/`](../domains/)).
- **Q-R3** — A question hidden by the user's own override is excluded from the list entirely.
- **Q-R4** — The effective content of a default question is the original merged with the user's override, field by field.

### Creating

- **Q-R5** — Any signed-in user can create a question at `/questions/new` via `POST /api/questions`.
- **Q-R6** — Only the English question body is mandatory. All other content fields are optional.
- **Q-R7** — `difficulty` defaults to `MEDIUM`.
- **Q-R8** — The new question is stamped with `createdBy = current user` and `domainId = current user's active domain`.
- **Q-R9** — Only an `ADMIN` can set `isDefault = true`. For a non-admin the flag is forced to `false` regardless of the request body (`isDefault: isAdmin && parsed.data.isDefault`).
- **Q-R10** — The "Make this a default question" checkbox is rendered only for admins, and only when not in override mode.
- **Q-R11** — Topics, sub-topics, and related questions can be attached at creation time.
- **Q-R12** — When the user arrives from a filtered list, the form pre-fills the `topicId` and `subTopicId` from the query string.
- **Q-R13** — On success the API returns `201` with the created question including its topic, sub-topic, and related-question relations.
- **Q-R14** — After saving, the client navigates to the `returnTo` query parameter if it starts with `/`, otherwise to `/questions`.

### Editing

- **Q-R15** — `PUT /api/questions/[id]` updates a question in place.
- **Q-R16** — A user may edit a question directly if they created it, **or** if it is a default and they are an `ADMIN`. Otherwise `403`.
- **Q-R17** — The edit page routes to *override* mode instead of direct edit when the question is a default **and** the current user is not its creator. See [`../question-overrides/`](../question-overrides/).
- **Q-R18** — Only an `ADMIN` can change `isDefault` on update; for everyone else the flag is omitted from the update payload and retains its stored value.
- **Q-R19** — Updating replaces the topic, sub-topic, and related-question link sets wholesale (`deleteMany` then `create`).
- **Q-R20** — Self-references are stripped on update: any related id equal to the question's own id is filtered out.

### Deleting

- **Q-R21** — `DELETE /api/questions/[id]` permanently deletes the question.
- **Q-R22** — Permission is the same as for editing: creator, or admin on a default. Otherwise `403`.
- **Q-R23** — Deletion cascades to `QuestionTopic`, `QuestionSubTopic`, `QuestionRelation`, `UserQuestionOverride`, and `UserQuestionStar` rows via the schema's `onDelete: Cascade`.
- **Q-R24** — In the list UI, the delete button is shown only when the user is an admin, or the question is not a default, or the user has an override on it.
- **Q-R25** — Clicking delete on a default that the user has customized performs an **override reset** (`DELETE /api/questions/[id]/override`) rather than deleting the question, with the confirm text "Reset to default?".
- **Q-R26** — Otherwise the confirm text is "Delete this question?" and the question itself is deleted.

### Multilingual content

- **Q-R27** — Three variants exist for both question and answer: English (`question` / `answer`), Vietnamese (`questionVn` / `answerVn`), Custom (`questionCus` / `answerCus`).
- **Q-R28** — The editor exposes them as three tabs (English / Vietnamese / Custom), each containing a question editor and an answer editor.
- **Q-R29** — Empty Vietnamese, Custom, and answer fields are submitted as `null` rather than `""`.
- **Q-R30** — The list and card UI always display the **English** variant. There is no language switcher on the reading surface — the variants are reachable only through the editor and the export.

### Listing, filtering, sorting

- **Q-R31** — `/questions` and `GET /api/questions` accept: `difficulty`, `topicId`, `subTopicId`, `search`, `showOnly`, `important`, `sort`, `page`, `limit`.
- **Q-R32** — `showOnly` accepts `all` (default), `mine` (non-defaults only), `defaults` (defaults only).
- **Q-R33** — `important=1` restricts to starred questions.
- **Q-R34** — `sort` accepts `date:asc`, `date:desc`, `difficulty:asc`, `difficulty:desc`. The page defaults to `date:desc`.
- **Q-R35** — Difficulty sorting orders `EASY < MEDIUM < HARD`.
- **Q-R36** — Search matches a case-insensitive substring against `question`, `questionVn`, `answer`, and `answerVn`. It does **not** search the Custom variants.
- **Q-R37** — The search input is debounced by 300 ms before updating the URL.
- **Q-R38** — Changing any filter resets the `page` parameter.
- **Q-R39** — Filters are held in the URL query string, so the filtered view is shareable and survives a refresh.
- **Q-R40** — Default page size is 50 when called via the API without `limit`; the `/questions` page passes no `limit` and so also gets 50.

### Reading

- **Q-R41** — Each question renders as a collapsed card showing difficulty badge, a "Customized" badge if overridden, a "Private" badge if not a default, and the question body clamped to three lines.
- **Q-R42** — Expanding a card reveals the answer (if present) and the list of related questions.
- **Q-R43** — Clicking a related question navigates to `/questions#q-<id>` and dispatches a `question:focus` event; the target card expands and scrolls into view.
- **Q-R44** — A card also auto-expands and scrolls if the page loads with its anchor in the URL hash.
- **Q-R45** — The list has controls to cycle display width (100% → 900px → 700px) and font size (`text-sm` → `text-base` → `text-lg`). These are component state only and are not persisted.
- **Q-R46** — Code blocks inside question and answer HTML are syntax-highlighted at render time.

### Starring ("Important")

- **Q-R47** — A star button on each card toggles the question's important flag for the current user only.
- **Q-R48** — `POST /api/questions/[id]/star` sets it, `DELETE` clears it. Both are idempotent.
- **Q-R49** — The star is per-user: starring a shared default never affects another user's view.
- **Q-R50** — The UI updates optimistically and reverts with a "Failed to update" toast if the request fails.
- **Q-R51** — When the list is filtered to important-only, un-starring a card triggers a list refresh so it drops out.

### Export

- **Q-R52** — The export button offers six choices: Questions & answers, or Questions only, each in English / Vietnamese / Custom.
- **Q-R53** — `GET /api/questions/export` returns a Markdown file with `Content-Type: text/markdown; charset=utf-8` and a `Content-Disposition` attachment filename of the form `questions[-only]-<lang>-<YYYY-MM-DD>.md`.
- **Q-R54** — The export applies the **current filters** from the URL but ignores pagination — it exports everything matching, not just the visible page.
- **Q-R55** — When the requested variant is empty for a question, the export falls back to the English text.
- **Q-R56** — Stored HTML is converted to Markdown, including GFM tables. Multi-line table cells are flattened to a single line with `<br>`, and `|` characters inside cells are escaped.
- **Q-R57** — With answers included, each question is followed by its difficulty and its topics/sub-topics, then an `### Answer` section, then a `---` separator.
- **Q-R58** — A full-screen "Preparing export…" overlay covers the page while the request is in flight.

## User flows

### Create a question
1. From `/questions`, click "Add Question" (the link carries `returnTo` plus any active topic filters).
2. Fill the English question, optionally other variants, answer, difficulty, topics, sub-topics, related questions.
3. Click "Create Question" → `POST /api/questions` → toast "Question created" → back to `returnTo`.

### Edit your own question
1. Click the pencil icon on a card → `/questions/[id]/edit?returnTo=<current url>`.
2. Because the question is not a default, the form is in direct-edit mode with all fields.
3. Save → `PUT /api/questions/[id]` → toast "Question updated" → back to `returnTo`.

### Filter and export
1. Set difficulty / topic / search / important on `/questions`.
2. Click Export → choose language and whether answers are included.
3. The browser downloads a `.md` file containing every question matching those filters.

### Star a question
1. Click the star icon on a card.
2. The icon fills immediately; `POST /api/questions/[id]/star` persists it.
3. On failure the icon reverts and a toast appears.

## Business rules

- **Q-B1** — `isDefault` is admin-controlled at every write path; the flag is never trusted from a non-admin request body.
- **Q-B2** — Default questions are shared rows; user-specific state (customizations, stars) lives in side tables so it never mutates the shared row.
- **Q-B3** — Question ownership is immutable — `createdBy` is set on create and never updated.
- **Q-B4** — `domainId` is set on create and never updated (see [`../domains/`](../domains/) DOM-R21).
- **Q-B5** — Related questions are stored as directed edges (`QuestionRelation.fromQuestionId → toQuestionId`). Only outgoing edges (`relatedTo`) are ever read or displayed, so relationships are effectively one-way in the UI.
- **Q-B6** — Deleting a user sets `createdBy` to `null` (`onDelete: SetNull`) rather than deleting their questions.

## Validation rules

`questionSchema` in `src/lib/validations/question.ts`:

| Field | Rule |
|---|---|
| `question` | string, min length 1 — "Question is required" |
| `questionVn`, `questionCus`, `answer`, `answerVn`, `answerCus` | optional, nullable string |
| `difficulty` | enum `EASY` \| `MEDIUM` \| `HARD`, default `MEDIUM` |
| `topicIds`, `subTopicIds`, `relatedQuestionIds` | array of string, default `[]` |
| `isDefault` | boolean, default `false` |

- **Q-V1** — The API returns only the first Zod issue on failure, as `400 { error: <message> }`.
- **Q-V2** — Client-side, the form additionally rejects a question body that is empty after trimming **or** exactly `"<p></p>"`, showing the toast "Question content is required".
- **Q-V3** — The server does **not** apply the `"<p></p>"` check, so an empty editor state passes server validation if posted directly.
- **Q-V4** — There is no maximum length on any field.
- **Q-V5** — Referenced `topicIds`, `subTopicIds`, and `relatedQuestionIds` are not validated for existence, ownership, or domain membership.

## Permissions / access restrictions

| Action | Anonymous | `USER` | `ADMIN` |
|---|---|---|---|
| List / read questions | `401` (via redirect) | Own + defaults, domain-scoped | Same |
| Create private question | ❌ | ✅ | ✅ |
| Create default question | ❌ | ❌ (flag forced false) | ✅ |
| Edit own question | ❌ | ✅ | ✅ |
| Edit a default | ❌ | ❌ → override mode | ✅ direct edit |
| Delete own question | ❌ | ✅ | ✅ |
| Delete a default | ❌ | `403` | ✅ |
| Star / un-star | ❌ | ✅ on visible questions | ✅ |
| Export | ❌ | ✅ own view | ✅ |
| `/admin/questions` | ❌ | ❌ → `/questions` | ✅ |

## Error and failure behavior

- **Q-E1** — Unauthenticated API calls return `401 { error: "Unauthorized" }` (in practice the middleware redirects first — see `authentication` AUTH-X1).
- **Q-E2** — `GET`, `PUT`, `DELETE` on a non-existent id return `404 { error: "Not found" }`.
- **Q-E3** — Insufficient permission on `PUT` / `DELETE` returns `403 { error: "Forbidden" }`.
- **Q-E4** — Validation failure returns `400` with the first message.
- **Q-E5** — The question form surfaces API errors as a toast with the server's `error` string, falling back to "Failed to save".
- **Q-E6** — List deletion failures show a generic "Something went wrong" toast.
- **Q-E7** — Export failures show an "Export failed" toast and clear the overlay.
- **Q-E8** — Star failures revert the optimistic state and show "Failed to update".
- **Q-E9** — There is no error boundary on `/questions`; a server-side throw in `getQuestionsForUser` surfaces as the Next.js error page.

## Important edge cases

- **Q-X1** — **Filtering, sorting, and pagination all happen in memory.** `getQuestionsForUser` fetches every visible question for the domain, merges overrides, then filters, sorts, and slices in JavaScript. Cost grows with the whole collection, not with the page size.
- **Q-X2** — **The result count is misleading.** `/questions` renders `{questions.length} questions found`, but `questions` is the post-pagination slice — so the count caps at 50 and does not reflect the true number of matches.
- **Q-X3** — **There is no pagination UI.** No page controls exist anywhere, and every filter change deletes the `page` parameter. In practice the app shows at most the first 50 matching questions with no way to reach the rest.
- **Q-X4** — **`PAGE_SIZE = 20` in `src/lib/constants.ts` is never used.** The effective default is 50, set inside `getQuestionsForUser`.
- **Q-X5** — **Search runs against raw HTML.** Because the stored content includes markup, a search for `p`, `div`, `strong`, or `class` matches nearly every question. Search is also blind to the Custom variants.
- **Q-X6** — **`POST /api/questions` returns a different shape than `GET`.** The create response is the raw Prisma row, lacking the `hasOverride` and `isImportant` fields present on every read path.
- **Q-X7** — A question created by an admin with `isDefault = true` is matched by the `isDefault` branch of the visibility rule, so the admin's own defaults appear for everyone including themselves.
- **Q-X8** — An **admin editing a default they did not create** gets override mode (`original.createdBy !== session.user.id`), not direct edit — even though the API would permit a direct edit. Direct editing of another admin's default is therefore only reachable via the API.
- **Q-X9** — `relatedQuestionIds` self-references are filtered on `PUT` but not on `POST`. On create this is harmless because the id does not yet exist.
- **Q-X10** — Related questions are not filtered by visibility. If a default question links to a question that a user cannot see, the link still renders in their card, and following it lands on a `/questions` page where the target is absent.
- **Q-X11** — `QuestionRelation` is directional but the selector offers no indication of that, so "related" links appear on only one of the two questions.
- **Q-X12** — Passing a non-existent `topicId` to `POST /api/questions` raises a foreign-key error that is not caught, producing an unhandled `500`.
- **Q-X13** — The `important` query flag is computed as `searchParams.get("important") === "1"`, so it is always a boolean; a value of `false` simply skips the filter.
- **Q-X14** — Width and font-size preferences reset on every navigation — they live in `useState`, unlike the topic ordering which is persisted to `localStorage`.
- **Q-X15** — The export's `limit` is `Number.MAX_SAFE_INTEGER`, so a very large collection is fully materialized in memory and converted to Markdown in a single request. No streaming, no cap.
- **Q-X16** — `/admin/questions` bypasses `getQuestionsForUser` entirely, querying Prisma directly and hard-coding `hasOverride: false`. An admin's own overrides on default questions are therefore invisible on that page.
- **Q-X17** — The card's delete button is hidden for a non-admin viewing an un-customized default, but the underlying `DELETE` endpoint would return `403` if called directly — the UI and API agree, but only because the button is hidden.

## Non-goals / not supported

- Pagination controls, infinite scroll, or a total-match count.
- Full-text or fuzzy search; search is a plain case-insensitive substring test on raw HTML.
- Bulk operations (bulk delete, bulk tag, bulk difficulty change).
- Import of questions (export is one-way).
- A language switcher on the reading surface.
- Question version history, drafts, or soft delete.
- Attachments or images beyond what is pasted into the rich-text HTML.
- Reordering questions manually.
- Duplicating a question.
- Bidirectional related-question links.
- Sharing or transferring ownership of a private question.

## Acceptance criteria

- **AC-1** — A signed-in user sees exactly the union of (all defaults in their domain) and (their own private questions in their domain), minus anything they have hidden.
- **AC-2** — `POST /api/questions` with an empty `question` returns `400 { error: "Question is required" }` and creates nothing.
- **AC-3** — A non-admin posting `isDefault: true` creates a question with `isDefault = false`.
- **AC-4** — A user who is neither the creator nor an admin receives `403` from `PUT` and `DELETE` on a default question.
- **AC-5** — Deleting a question removes its topic, sub-topic, relation, override, and star rows.
- **AC-6** — Setting `difficulty=HARD&sort=difficulty:asc&showOnly=mine` returns only the user's own HARD questions.
- **AC-7** — Starring a default as user A leaves user B's `isImportant` for that question `false`.
- **AC-8** — Export with `lang=vn` produces Markdown using Vietnamese text where present and English where the Vietnamese variant is empty.
- **AC-9** — Export respects the active filters and is not truncated to the displayed page.
- **AC-10** — Editing a question replaces its topic set: a question saved with `topicIds: []` ends up with no topics.
</content>
