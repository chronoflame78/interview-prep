# Questions Management — Test Cases

> Verification plan for **current** behavior. Requirement IDs refer to
> [`requirements.md`](./requirements.md).

## Existing automated tests

**None.** No test runner is installed and no test files exist in the repository.

## Happy path

### TC-Q01 — Create a private question
- **Requirements:** Q-R5, R6, R7, R8, R13 · AC-2 (inverse)
- **Level:** Integration
- **Preconditions:** Signed in as `USER` with domain A active.
- **Steps:** `POST /api/questions` with `{ question: "<p>What is a closure?</p>" }`.
- **Expected:** `201`. Row has `createdBy = userId`, `domainId = A`, `isDefault = false`, `difficulty = "MEDIUM"`, all optional variants `null`.

### TC-Q02 — Create with all fields populated
- **Requirements:** Q-R11, R27, R29
- **Level:** Integration
- **Preconditions:** Topic T, sub-topic S, and question R exist.
- **Steps:** `POST /api/questions` with all three question variants, all three answer variants, `difficulty: "HARD"`, `topicIds: [T]`, `subTopicIds: [S]`, `relatedQuestionIds: [R]`.
- **Expected:** `201` with the relations included in the response; join rows exist for T, S, and R.

### TC-Q03 — Admin creates a default question
- **Requirements:** Q-R9, Q-B1 · AC-3 (inverse)
- **Level:** Integration
- **Preconditions:** Signed in as `ADMIN`.
- **Steps:** `POST /api/questions` with `{ question: "...", isDefault: true }`.
- **Expected:** `201` with `isDefault = true`; the question is visible to other users in the same domain.

### TC-Q04 — Edit own question
- **Requirements:** Q-R15, R16, R19
- **Level:** Integration
- **Preconditions:** Question Q created by the caller with topics `[T1]`.
- **Steps:** `PUT /api/questions/<Q>` with a changed body and `topicIds: [T2]`.
- **Expected:** `200`; body updated; the T1 join row is gone and a T2 row exists.

### TC-Q05 — Delete own question
- **Requirements:** Q-R21, R22, R23 · AC-5
- **Level:** Integration
- **Preconditions:** Question Q owned by the caller, with topic/sub-topic/relation/star/override rows.
- **Steps:** `DELETE /api/questions/<Q>`.
- **Expected:** `200 { success: true }`; the question row and every dependent row (`QuestionTopic`, `QuestionSubTopic`, `QuestionRelation` in both directions, `UserQuestionOverride`, `UserQuestionStar`) are gone.

### TC-Q06 — List shows defaults plus own questions
- **Requirements:** Q-R1, R2 · AC-1
- **Level:** Integration
- **Preconditions:** In domain A: default D1, user-A-private P1, user-B-private P2. Signed in as user A.
- **Steps:** `GET /api/questions`.
- **Expected:** D1 and P1 present; P2 absent.

### TC-Q07 — Expand a card to read the answer
- **Requirements:** Q-R41, R42, R64
- **Level:** E2E
- **Steps:** On `/questions`, click "More" on a question that has an answer.
- **Expected:** The answer block appears under an "ANSWER" label, in the language the selector currently shows; the question body is no longer line-clamped; the button reads "Less".

### TC-Q08 — Star a question
- **Requirements:** Q-R47, R48, R49 · AC-7
- **Level:** Integration + E2E
- **Steps:** As user A, `POST /api/questions/<default>/star`. Then read the list as user A and as user B.
- **Expected:** `{ isImportant: true }`; user A sees `isImportant: true`, user B sees `false`.

### TC-Q09 — Export questions and answers in English
- **Requirements:** Q-R52, R53, R57
- **Level:** Integration
- **Steps:** `GET /api/questions/export?lang=en`.
- **Expected:** `200`, `Content-Type: text/markdown; charset=utf-8`, `Content-Disposition` filename matching `questions-en-YYYY-MM-DD.md`. Body starts with `# Interview Questions (N)`, contains `## Question 1.`, a `**Difficulty:**` meta line, an `### Answer` section, and `---` separators.

## Validation cases

### TC-Q10 — Missing question body
- **Requirements:** Q-V1 · AC-2
- **Level:** Integration
- **Steps:** `POST /api/questions` with `{ question: "" }`, then with `{}`.
- **Expected:** `400 { error: "Question is required" }` in both cases; nothing created.

### TC-Q11 — Invalid difficulty
- **Requirements:** Q-V1
- **Level:** Integration
- **Steps:** `POST /api/questions` with `{ question: "x", difficulty: "EXTREME" }`.
- **Expected:** `400` with the first Zod issue message; nothing created.

### TC-Q12 — Client-side empty-editor guard
- **Requirements:** Q-V2
- **Level:** Unit (component)
- **Steps:** Render `QuestionForm` in create mode, leave the editor at its default `"<p></p>"`, click "Create Question".
- **Expected:** Toast "Question content is required"; **no** network request is made.

### TC-Q13 — Server accepts `"<p></p>"` that the client rejects
- **Requirements:** Q-V3
- **Level:** Integration
- **Steps:** `POST /api/questions` with `{ question: "<p></p>" }` directly.
- **Expected:** **`201`** — the server has no empty-HTML check. Documents the client/server divergence flagged in `design.md`.

### TC-Q14 — Defaults applied for omitted fields
- **Requirements:** Q-R7, Q-V1
- **Level:** Unit (schema)
- **Steps:** Parse `{ question: "x" }` with `questionSchema`.
- **Expected:** `difficulty: "MEDIUM"`, `topicIds: []`, `subTopicIds: []`, `relatedQuestionIds: []`, `isDefault: false`.

## Permission cases

### TC-Q15 — Non-admin cannot create a default
- **Requirements:** Q-R9, Q-B1 · AC-3
- **Level:** Integration
- **Steps:** As `USER`, `POST /api/questions` with `isDefault: true`.
- **Expected:** `201` but the stored row has `isDefault = false`.

### TC-Q16 — Non-admin cannot edit a default
- **Requirements:** Q-R16 · AC-4
- **Level:** Integration
- **Steps:** As `USER`, `PUT /api/questions/<default>` .
- **Expected:** `403 { error: "Forbidden" }`; the row is unchanged.

### TC-Q17 — Non-admin cannot delete a default
- **Requirements:** Q-R22 · AC-4
- **Level:** Integration
- **Steps:** As `USER`, `DELETE /api/questions/<default>`.
- **Expected:** `403`; the row still exists.

### TC-Q18 — Cannot edit or delete another user's private question
- **Requirements:** Q-R16, R22
- **Level:** Integration
- **Steps:** As user B, `PUT` and `DELETE` user A's private question.
- **Expected:** `403` for both.

### TC-Q19 — Non-admin cannot flip `isDefault` on their own question
- **Requirements:** Q-R18
- **Level:** Integration
- **Preconditions:** Question Q owned by a `USER`, `isDefault = false`.
- **Steps:** `PUT /api/questions/<Q>` with `isDefault: true`.
- **Expected:** `200`, but the stored `isDefault` is still `false`.

### TC-Q20 — Star endpoint rejects invisible questions
- **Requirements:** Q-R47
- **Level:** Integration
- **Steps:** As user B, `POST /api/questions/<A's private question>/star`.
- **Expected:** `403 { error: "Forbidden" }`; no star row created.

### TC-Q21 — Admin default-questions page is admin-only
- **Requirements:** Q-R... (permissions table) · see `authentication` AUTH-R28
- **Level:** E2E
- **Steps:** Visit `/admin/questions` as `USER`, then as `ADMIN`.
- **Expected:** Redirect to `/questions` for `USER`; the page renders for `ADMIN`.

## Filtering, sorting, search

### TC-Q22 — Difficulty filter
- **Requirements:** Q-R31 · AC-6
- **Level:** Integration
- **Steps:** `GET /api/questions?difficulty=HARD`.
- **Expected:** Only HARD questions, using **effective** difficulty (an override that changes difficulty must be respected).

### TC-Q23 — `showOnly` variants
- **Requirements:** Q-R32
- **Level:** Integration
- **Steps:** `GET /api/questions` with `showOnly=mine`, then `showOnly=defaults`, then omitted.
- **Expected:** `mine` returns only `isDefault = false`; `defaults` only `isDefault = true`; omitted returns both.

### TC-Q24 — Topic and sub-topic filters
- **Requirements:** Q-R31
- **Level:** Integration
- **Steps:** `GET /api/questions?topicId=<T>`, then `&subTopicId=<S>`.
- **Expected:** Only questions joined to T (respectively S).

### TC-Q25 — Difficulty sort order
- **Requirements:** Q-R34, R35 · AC-6
- **Level:** Unit (of the sort comparator) + Integration
- **Steps:** `GET /api/questions?sort=difficulty:asc` then `difficulty:desc`.
- **Expected:** EASY → MEDIUM → HARD ascending, reversed descending — not alphabetical.

### TC-Q26 — Date sort order
- **Requirements:** Q-R34
- **Level:** Integration
- **Steps:** `sort=date:desc` (default) then `date:asc`.
- **Expected:** Newest-first, then oldest-first, by `createdAt`.

### TC-Q27 — Search matches across question and answer, EN and VN
- **Requirements:** Q-R36
- **Level:** Integration
- **Preconditions:** Four questions where the term appears in only `question`, only `questionVn`, only `answer`, only `answerVn` respectively — plus one where it appears only in `questionCus`.
- **Expected:** The first four match; **the `questionCus` one does not**. Documents the Custom-variant gap.

### TC-Q28 — Search is case-insensitive
- **Requirements:** Q-R36
- **Level:** Integration
- **Steps:** Search `CLOSURE`, `closure`, `Closure` against a question containing "closure".
- **Expected:** All three match.

### TC-Q29 — Search matches HTML markup
- **Requirements:** Q-X5
- **Level:** Integration
- **Steps:** `GET /api/questions?search=p`.
- **Expected:** **Nearly every question matches**, because the stored content is HTML containing `<p>` tags. Pins the current (undesirable) behavior so a future fix is a deliberate, visible change.

### TC-Q30 — Filters compose
- **Requirements:** Q-R31 · AC-6
- **Level:** Integration
- **Steps:** `GET /api/questions?difficulty=HARD&showOnly=mine&important=1&search=react`.
- **Expected:** Only the caller's own, HARD, starred questions whose text contains "react".

### TC-Q31 — Filter changes reset the page parameter
- **Requirements:** Q-R38
- **Level:** Unit (component)
- **Steps:** With `?page=2` in the URL, change the difficulty select.
- **Expected:** The pushed URL contains the new difficulty and **no** `page` parameter.

### TC-Q32 — Filters survive a refresh
- **Requirements:** Q-R39
- **Level:** E2E
- **Steps:** Apply several filters, copy the URL, open it in a new tab.
- **Expected:** The same filtered result set and the same control states.

## Boundary and edge cases

### TC-Q33 — Result cap and misleading count
- **Requirements:** Q-X2, Q-X3, Q-X4
- **Level:** Integration
- **Preconditions:** 60 visible questions in the domain.
- **Steps:** `GET /api/questions` with no `limit`; render `/questions`.
- **Expected:** **Exactly 50** returned, and the page header reads "50 questions found" despite 60 matching. Pins the current pagination gap.

### TC-Q34 — Explicit `limit` and `page`
- **Requirements:** Q-R40
- **Level:** Integration
- **Steps:** `GET /api/questions?limit=10&page=2` against 25 visible questions.
- **Expected:** Items 11–20 of the sorted, filtered set. Confirms the API supports paging even though no UI drives it.

### TC-Q35 — Hidden questions are excluded
- **Requirements:** Q-R3
- **Level:** Integration
- **Preconditions:** The caller has an override with `isHidden = true` on default D.
- **Steps:** `GET /api/questions`; also `GET /api/questions/export`.
- **Expected:** D absent from both.

### TC-Q36 — Self-reference stripped on update
- **Requirements:** Q-R20, Q-X9
- **Level:** Integration
- **Steps:** `PUT /api/questions/<Q>` with `relatedQuestionIds: [Q, R]`.
- **Expected:** Only the edge to R is created; no self-edge exists.

### TC-Q37 — Empty strings become null
- **Requirements:** Q-R29
- **Level:** Unit (component) + Integration
- **Steps:** Submit the form with the Vietnamese and Custom editors left empty.
- **Expected:** The request body carries `null` (not `""`) for `questionVn`, `questionCus`, `answer`, `answerVn`, `answerCus`.

### TC-Q38 — Clearing all topics
- **Requirements:** Q-R19 · AC-10
- **Level:** Integration
- **Steps:** `PUT` a question that has two topics with `topicIds: []`.
- **Expected:** Both join rows removed; the question has no topics.

### TC-Q39 — Non-existent topic id on create
- **Requirements:** Q-V5, Q-X12
- **Level:** Integration
- **Steps:** `POST /api/questions` with `topicIds: ["nope"]`.
- **Expected:** **Unhandled foreign-key error → `500`**, not a clean `400`. Documents current behavior.

### TC-Q40 — Admin editing another admin's default gets override mode
- **Requirements:** Q-X8
- **Level:** E2E
- **Preconditions:** Default D created by admin 1; signed in as admin 2.
- **Steps:** Open `/questions/<D>/edit`.
- **Expected:** Heading reads "Customize Question" and the topics/related controls are hidden — even though `PUT /api/questions/<D>` would be permitted for admin 2. Pins the UI/API asymmetry.

### TC-Q41 — Related link to an invisible question
- **Requirements:** Q-X10
- **Level:** Integration + E2E
- **Preconditions:** Default D links to user A's private question P. Signed in as user B.
- **Steps:** Expand D's card as user B.
- **Expected:** The related link **is rendered**; following it goes to `/questions#q-<P>` where no such card exists. Documents the visibility gap.

### TC-Q42 — Related links are one-way
- **Requirements:** Q-B5, Q-X11
- **Level:** Integration
- **Steps:** Create a relation A → B. Read both A and B.
- **Expected:** A's `relatedTo` contains B; B's `relatedTo` is empty.

### TC-Q43 — Delete button visibility matrix
- **Requirements:** Q-R24
- **Level:** Unit (component)
- **Steps:** Render `QuestionCard` for each combination of `isAdmin`, `isDefault`, `hasOverride`.
- **Expected:** The trash icon appears when `isAdmin || !isDefault || hasOverride`, and is hidden for a non-admin viewing an un-customized default.

### TC-Q44 — Delete on a customized default resets instead of deleting
- **Requirements:** Q-R25, R26
- **Level:** Unit (component) + Integration
- **Steps:** With `confirm` stubbed to return `true`, click delete on a default that has an override.
- **Expected:** The confirm text is "Reset to default?"; the request goes to `DELETE /api/questions/<id>/override`, **not** `/api/questions/<id>`; toast reads "Override removed"; the question still exists.

### TC-Q45 — Cancelling the confirm dialog
- **Requirements:** Q-R25, R26
- **Level:** Unit (component)
- **Steps:** Stub `confirm` to return `false`; click delete.
- **Expected:** No request is made and nothing changes.

### TC-Q46 — `returnTo` is validated
- **Requirements:** Q-R14
- **Level:** Unit (component)
- **Steps:** Render `QuestionForm` with `?returnTo=https://evil.example.com`, then with `?returnTo=/questions?topicId=x`, then with no parameter. Save each time.
- **Expected:** The external URL is rejected and navigation goes to `/questions`; the relative path is honoured; the missing parameter falls back to `/questions`. This is an open-redirect guard — treat it as security-relevant.

### TC-Q47 — Topic pre-fill on create
- **Requirements:** Q-R12
- **Level:** Unit (component)
- **Steps:** Render `QuestionForm` in create mode with `?topicId=T&subTopicId=S`.
- **Expected:** T and S are pre-selected. In **edit** mode the same query parameters are ignored.

## Reading and navigation

### TC-Q48 — Anchor focus on load
- **Requirements:** Q-R44
- **Level:** E2E
- **Steps:** Navigate to `/questions#q-<id>` for a question in the list.
- **Expected:** That card auto-expands and scrolls into view.

### TC-Q49 — Related-question click focuses the target card
- **Requirements:** Q-R43
- **Level:** E2E
- **Preconditions:** A and B both visible in the same list; A links to B.
- **Steps:** Expand A, click the related link to B.
- **Expected:** B expands and scrolls into view (driven by the `question:focus` CustomEvent), without a full page reload.

### TC-Q50 — Width and font controls
- **Requirements:** Q-R45
- **Level:** Unit (component)
- **Steps:** Click "narrow" twice and "increase font" twice, then check the disabled states at both ends.
- **Expected:** Max width cycles 100% → 900px → 700px; font cycles `text-sm` → `text-base` → `text-lg`; the buttons disable at the ends of each range.

### TC-Q51 — Display preferences reset on navigation
- **Requirements:** Q-X14
- **Level:** E2E
- **Steps:** Set width, font, **and** language to non-defaults; navigate to `/topics`; navigate back to `/questions`.
- **Expected:** Width and font are back at their defaults — they are not persisted. The language is back at English too, because the return navigation drops the query string; following a link that carries `?lang=vn` restores it (contrast with TC-Q75).

### TC-Q52 — Code blocks are highlighted
- **Requirements:** Q-R46
- **Level:** Unit (component)
- **Steps:** Render `HighlightedHtml` with content containing `<pre><code class="language-sql">SELECT 1</code></pre>` and with a `<pre><code>` that has no language class.
- **Expected:** Both gain the `hljs` class and tokenized spans; the class-less one is highlighted as TypeScript (the configured default).

## Language display

> Every case below is written against a runner that does not exist yet (see *Existing automated
> tests*). TC-Q73 and TC-Q87 are pure-function tests needing nothing but Vitest; the component cases
> would additionally need `@testing-library/react` plus a `next/navigation` stub; the E2E cases need
> Playwright.

### TC-Q70 — The selector renders once per reading surface
- **Requirements:** Q-R59, R62, R63
- **Level:** E2E
- **Steps:** Open `/questions`, `/admin/questions` (as `ADMIN`), and `/share/<slug>`.
- **Expected:** Exactly one language control on each page, offering English / Vietnamese / Custom with English selected. On `/questions` it sits in the filter row after Sort; on the other two it sits in the card-list toolbar after the width buttons. `/questions` must **not** show a second copy in its toolbar.

### TC-Q71 — Switching language re-renders the cards with no server request
- **Requirements:** Q-R59, R64 · AC-13
- **Level:** E2E
- **Preconditions:** A question with Vietnamese question and answer text, expanded.
- **Steps:** Record network activity, then select "Vietnamese".
- **Expected:** The URL becomes `?lang=vn`; the question body and the expanded answer switch to Vietnamese; **no** request is issued — no RSC payload fetch and no write of any kind.

### TC-Q72 — English fallback is per field
- **Requirements:** Q-R65, R30 · AC-11
- **Level:** Unit (component)
- **Preconditions:** Q1 has `questionVn` and `answerVn`; Q2 has `questionVn` but `answerVn = null`; Q3 has neither.
- **Steps:** Render the list with `lang = "vn"`, all cards expanded.
- **Expected:** Q1 fully Vietnamese; Q2 Vietnamese question with the **English** answer; Q3 fully English. No card is blank and no card mixes a fallback marker into the text.

### TC-Q73 — `normalizeLang` accepts only the three known values
- **Requirements:** Q-R60 · AC-12
- **Level:** Unit
- **Steps:** Call `normalizeLang` with `"en"`, `"vn"`, `"cus"`, `"zz"`, `""`, `null`, `undefined`, `"VN"`.
- **Expected:** `"vn"` and `"cus"` pass through; everything else — including the uppercase `"VN"` — returns `"en"`.

### TC-Q74 — The URL is written like the other filter controls
- **Requirements:** Q-R60, R62
- **Level:** Unit (component)
- **Steps:** With `?difficulty=HARD&page=2` in the URL, select Vietnamese, then select English again.
- **Expected:** First write produces `?difficulty=HARD&lang=vn` — `page` dropped, `difficulty` preserved. Selecting English **removes** `lang` rather than writing `lang=en`. Both go through `history.pushState`, not `router.push`.

### TC-Q75 — The selection is shareable and survives a refresh
- **Requirements:** Q-R61 · AC-13
- **Level:** E2E
- **Steps:** Select Custom, copy the URL, reload; then open the same URL in a different browser profile.
- **Expected:** Both show the Custom variant with the control reading "Custom". Nothing was written to the database — the second profile is a different user and still sees Custom.

### TC-Q76 — Back and forward restore the previous language
- **Requirements:** Q-R61
- **Level:** E2E
- **Steps:** From English select Vietnamese, then Custom, then press Back twice and Forward once.
- **Expected:** The cards render Vietnamese, then English, then Vietnamese again, and the control label tracks each step — `pushState` created real history entries.

### TC-Q77 — A request carrying `?lang=vn` renders Vietnamese server-side
- **Requirements:** Q-R61
- **Level:** E2E
- **Steps:** Request `/questions?lang=vn` cold and inspect the initial HTML before hydration.
- **Expected:** The Vietnamese text is already in the server-rendered markup; there is no English-then-Vietnamese flash on hydration.

### TC-Q78 — The selection is display-only
- **Requirements:** Q-R66
- **Level:** Integration + E2E
- **Preconditions:** Filters applied (`difficulty=HARD&sort=difficulty:asc`), and a question whose Vietnamese text would not match the active search term.
- **Steps:** Capture the ordered list of card ids at `lang=en`, then switch to Vietnamese and capture again.
- **Expected:** Identical ids in identical order, including the question whose Vietnamese text does not match the search. `getQuestionsForUser` is never called with a `lang` argument.

### TC-Q79 — A customized default shows the user's own variant
- **Requirements:** Q-R67 · Q-R4
- **Level:** Integration + E2E
- **Preconditions:** Default D has `questionVn = "goc"`. User A overrides `questionVn = "cua toi"`. User B has no override.
- **Steps:** Both users open `/questions?lang=vn`.
- **Expected:** A sees "cua toi" with the "Customized" badge; B sees "goc". The variant is picked after the override merge, not from the raw row.

### TC-Q80 — Related-question titles follow the language
- **Requirements:** Q-R69
- **Level:** Integration + E2E
- **Preconditions:** A links to B; B has `questionVn`; A links to C, which has no `questionVn`.
- **Steps:** At `lang=vn`, expand A. Separately, assert every read path that builds `relatedTo` returns the new fields.
- **Expected:** B's title is Vietnamese, C's title falls back to English, and clicking either still focuses the target card (TC-Q49 unaffected). All five `toQuestion` selects — `getQuestionsForUser`, `getQuestionForUser`, `/admin/questions`, `POST /api/questions`, `PUT /api/questions/[id]` — include `questionVn` and `questionCus`; none returns `undefined` for them.

### TC-Q81 — Editing and mutating from a non-English view
- **Requirements:** Q-R68
- **Level:** E2E
- **Steps:** At `?lang=vn`, star a card, then click its pencil, save, and finally delete another card.
- **Expected:** The star toggles as usual. The editor opens with all three tabs and English selected first — the display language does not change the editor. `returnTo` carries `lang=vn`, so saving lands back on the Vietnamese view. Delete and override-reset dispatch exactly as at `lang=en`.

### TC-Q82 — Search does not follow the displayed language
- **Requirements:** Q-X18
- **Level:** Integration
- **Preconditions:** Q1's Custom text contains "bao dong" and nothing else does; Q1's English text contains "closure".
- **Steps:** At `lang=cus`, search "bao dong". Then search "closure".
- **Expected:** "bao dong" returns **nothing** — Custom variants are not searched. "closure" returns Q1, displayed in Custom, even though the visible text does not contain the term. Pins the documented mismatch.

### TC-Q83 — The export language is chosen separately
- **Requirements:** Q-X19
- **Level:** E2E
- **Steps:** With the screen at `?lang=vn`, open the export menu and choose "Questions & answers → English".
- **Expected:** The request is `...&lang=en` — the button's own choice overwrites the `lang` already in the query string — and the file is English while the page stays Vietnamese.

### TC-Q84 — A shared link can carry a language
- **Requirements:** Q-X20
- **Level:** E2E
- **Steps:** Open `/share/<slug>?lang=vn` as a different user, then `/share/<slug>` with no parameter.
- **Expected:** The first renders the owner's collection in Vietnamese; the second renders English regardless of what the owner last selected, since nothing is stored per user.

### TC-Q85 — A whitespace-only variant does not fall back
- **Requirements:** Q-X21
- **Level:** Unit (component)
- **Preconditions:** A question with `questionVn = "<p></p>"`.
- **Steps:** Render at `lang = "vn"`.
- **Expected:** The card body renders **blank** rather than falling back to English — `pickVariant` tests for nullish/empty, not for empty markup. Pins the behavior; mirrors Q-V3 on the write side.

### TC-Q86 — The card and the export agree on the fallback
- **Requirements:** Q-R65, R55
- **Level:** Unit
- **Steps:** Run `pickVariant` over a table of fixtures — variant present, variant `null`, variant `""`, answer present with question missing, and the reverse — for all three languages.
- **Expected:** One shared implementation in `src/lib/language.ts` produces the export's documented results (TC-Q53) and the card's (TC-Q72). A change to the rule cannot move one surface without the other.

## Export cases

### TC-Q53 — Language fallback
- **Requirements:** Q-R55 · AC-8
- **Level:** Integration
- **Preconditions:** Q1 has Vietnamese text; Q2 has none.
- **Steps:** `GET /api/questions/export?lang=vn`.
- **Expected:** Q1 exports its Vietnamese text; Q2 falls back to English.

### TC-Q54 — Questions-only export
- **Requirements:** Q-R52, R57
- **Level:** Integration
- **Steps:** `GET /api/questions/export?answers=false`.
- **Expected:** Filename contains `-only`; the body has no `### Answer` sections, no difficulty/topic meta lines, and no `---` separators.

### TC-Q55 — Export respects filters and ignores pagination
- **Requirements:** Q-R54 · AC-9
- **Level:** Integration
- **Preconditions:** 60 HARD questions.
- **Steps:** `GET /api/questions/export?difficulty=HARD&page=2&limit=10`.
- **Expected:** All 60 appear — the handler forces `page: 1, limit: MAX_SAFE_INTEGER` — and no non-HARD question appears.

### TC-Q56 — Table conversion
- **Requirements:** Q-R56
- **Level:** Integration
- **Preconditions:** A question whose answer HTML contains a table with `<p>`-wrapped cells, a cell containing a `|`, and a cell containing a line break.
- **Expected:** Valid GFM table rows; the `|` is escaped as `\|`; the line break becomes `<br>`; no blank line breaks the row.

### TC-Q57 — Multi-line question heading
- **Requirements:** Q-R56 (heading branch)
- **Level:** Integration
- **Steps:** Export a single-line question and a multi-paragraph question.
- **Expected:** Single-line → `## Question 1. <text>`; multi-line → `## Question 2.` followed by the body on subsequent lines.

### TC-Q58 — Invalid `lang` parameter
- **Requirements:** Q-R52, Q-R60
- **Level:** Integration
- **Steps:** `GET /api/questions/export?lang=fr`.
- **Expected:** Falls back to `en`; the filename contains `-en-`. The export and the card view share `normalizeLang`, so both treat an unrecognized value identically (see TC-Q73, TC-Q84).

### TC-Q59 — Client-side download wiring
- **Requirements:** Q-R53, R58
- **Level:** Unit (component)
- **Steps:** Trigger an export with `fetch` stubbed to return a blob and a `Content-Disposition` header.
- **Expected:** The filename is parsed out of the header; an anchor is created, clicked, and the object URL revoked; the overlay appears during the request and is removed afterwards.

## Loading and empty states

### TC-Q60 — Empty list
- **Requirements:** Q-R41 (empty branch)
- **Level:** Unit (component)
- **Steps:** Render `QuestionList` with `questions: []`.
- **Expected:** "No questions found" plus "Try adjusting your filters or add a new question."; the width/font controls are not rendered.

### TC-Q61 — Filters skeleton
- **Level:** Unit
- **Steps:** Render `/questions` with the `QuestionFilters` Suspense boundary pending.
- **Expected:** A full-width `Skeleton` in place of the filter bar.

### TC-Q62 — Editor loading placeholder
- **Level:** Unit (component)
- **Steps:** Render `QuestionForm` before the dynamically imported TipTap editor resolves.
- **Expected:** A pulsing 160px-tall muted block per editor; the form does not crash server-side (the editor is `ssr: false`).

### TC-Q63 — Saving state
- **Level:** Unit (component)
- **Steps:** Submit the form with a slow fetch stub.
- **Expected:** The submit button reads "Saving..." and both it and Cancel are disabled.

### TC-Q64 — Related-question selector before data arrives
- **Level:** Unit (component)
- **Steps:** Render with SWR pending.
- **Expected:** The trigger renders with placeholder text; the command list shows "No questions found." rather than crashing on `undefined`.

## API / network failure scenarios

### TC-Q65 — Save failure surfaces the server message
- **Requirements:** Q-E5
- **Level:** Unit (component)
- **Steps:** Stub the endpoint to return `400 { error: "Question is required" }`.
- **Expected:** Toast shows that exact message; the form stays open with its values intact; the button re-enables.

### TC-Q66 — Delete failure
- **Requirements:** Q-E6
- **Level:** Unit (component)
- **Steps:** Stub `DELETE` to return `500`.
- **Expected:** Toast "Something went wrong"; no refresh; the card remains.

### TC-Q67 — Star failure rolls back
- **Requirements:** Q-R50, Q-E8
- **Level:** Unit (component)
- **Steps:** Click the star with the endpoint stubbed to fail.
- **Expected:** The icon fills, then reverts; toast "Failed to update"; the button is re-enabled.

### TC-Q68 — Export failure clears the overlay
- **Requirements:** Q-E7
- **Level:** Unit (component)
- **Steps:** Stub the export endpoint to return `500`.
- **Expected:** Toast "Export failed"; the full-screen overlay is removed (cleared in `finally`).

### TC-Q69 — Un-starring while filtered by important
- **Requirements:** Q-R51
- **Level:** E2E
- **Steps:** Apply `important=1`, un-star a visible card.
- **Expected:** `router.refresh()` fires and the card leaves the list. Un-starring on the unfiltered list must **not** trigger a refresh.

## Regression-sensitive behavior

| Area | Why it is fragile | Guard test |
|---|---|---|
| `getQuestionsForUser` merge order | Every read path depends on it; a change to the `??` chain silently changes effective content | TC-Q06, TC-Q22, TC-Q35 |
| In-memory filter order | Filters run before sort before slice; reordering changes which 50 items are returned | TC-Q30, TC-Q33 |
| `isDefault` admin gating at both write sites | Losing either check lets any user publish to everyone | TC-Q15, TC-Q19 |
| Permission predicate duplication | Copy-pasted in `PUT` and `DELETE`; fixing one and not the other is easy | TC-Q16, TC-Q17, TC-Q18 |
| Delete-vs-reset dispatch in `QuestionList` | Inverting the condition would destroy shared default questions instead of resetting an override | TC-Q44 |
| `returnTo` prefix check | Dropping `startsWith("/")` reintroduces an open redirect | TC-Q46 |
| Turndown custom `tableCell` rule | Removing it silently corrupts every exported table | TC-Q56 |
| Export forcing `page: 1, limit: MAX` | Losing it truncates exports to 50 with no visible error | TC-Q55 |
| `useEffect` listener cleanup in `QuestionCard` | Leaks `hashchange` / `question:focus` listeners per card | TC-Q49 |
| Difficulty rank map | Reverting to enum ordering silently changes sort output | TC-Q25 |
| Shared `pickVariant` | One helper now feeds the cards and the export; changing the fallback rule moves both surfaces at once, and a "fix" for one silently rewrites exported files | TC-Q86, TC-Q72, TC-Q53 |
| Shallow `pushState` in the language selector | Regressing to `router.push` reintroduces a full read pass per switch; if `useSearchParams` stops syncing with `pushState`, the control updates the URL while the cards silently keep the old language | TC-Q71, TC-Q76 |
| The five widened `toQuestion` selects | Missing one leaves `questionVn`/`questionCus` `undefined` on that path only, so related titles fall back to English in one view and not another | TC-Q80 |
| `lang` staying out of `QuestionFilters` | Passing it into `getQuestionsForUser` would turn a display toggle into a filter and change result sets | TC-Q78 |

## Recommended missing coverage

Ordered by value, given that nothing is currently tested:

1. **Unit tests for `getQuestionsForUser`** with a mocked Prisma client. This one function backs the
   list, API, export, and shared-profile views — it is the highest-leverage target in the whole
   codebase. Cover: visibility union, hidden exclusion, override merge, each filter, both sorts, and
   the slice.
2. **Integration tests for the permission matrix** (TC-Q15 → TC-Q20). These are the security-relevant
   paths and are currently unprotected.
3. **A test for TC-Q46 (`returnTo` open-redirect guard)** — small, security-relevant, easy to regress.
4. **A test for TC-Q44 (delete vs. override-reset dispatch)** — the failure mode is destructive and
   affects shared content.
5. **Export snapshot tests** covering tables, code blocks, language fallback, and the answers-off
   variant. Markdown output is exactly the kind of thing that silently degrades.
6. **Pin the known-wrong behaviors** so they change deliberately, not accidentally: TC-Q29 (HTML
   search), TC-Q33 (50-item cap and wrong count), TC-Q13 (server accepts `"<p></p>"`),
   TC-Q39 (`500` on a bad topic id).
7. **No coverage exists for the debounce bug** noted in `design.md` — a component test asserting how
   many `router.push` calls result from typing "react" would document it.
8. **No coverage exists for `/admin/questions`**, which duplicates the read logic and hard-codes
   `hasOverride: false` (Q-X16). A test comparing it against `getQuestionsForUser` output for the same
   admin would expose the divergence.
9. **`normalizeLang` and `pickVariant` are the cheapest tests in this document** (TC-Q73, TC-Q86):
   pure functions, no DOM, no Prisma, no network. If exactly one test file is ever added for this
   feature, make it that one — it guards the card and the export at the same time.
</content>
