# Mock Interview — Test Cases

> Verification plan for **current** behavior. Requirement IDs refer to
> [`requirements.md`](./requirements.md).
>
> ⚠️ This feature has **never been run end-to-end**. `MOCK_INTERVIEW_TODO.md` contains a 17-item
> manual checklist, none of it completed. The cases below are derived from the code, so some
> "expected" results are predictions about untested code paths — those are marked
> **Unverified prediction**.

## Existing automated tests

**None.** No test runner is installed and no test files exist in the repository.

The closest thing to a test plan that exists today is the manual checklist in
`MOCK_INTERVIEW_TODO.md` §2. That checklist should be executed at least once before any of these
cases can be trusted as regression tests rather than specifications.

## Prerequisites for running any of this

From `MOCK_INTERVIEW_TODO.md` §1 — without these, every runtime case fails at the first network call:

```
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=eastus
GEMINI_API_KEY=
OPENAI_API_KEY=          # only for provider-switching cases
INTERVIEW_AI_PROVIDER=gemini
```

For automated tests, the AI provider and the Azure client should be stubbed rather than called —
see "Recommended missing coverage".

## Happy path

### TC-M01 — Create a session in random mode
- **Requirements:** MI-R16, R17, R19, R20, R21 · AC-1
- **Level:** Integration
- **Preconditions:** ≥10 visible questions in the active domain.
- **Steps:** `POST /api/interview/sessions` with `selectionMode: "random"`, `filters: { count: 5 }`, follow-ups enabled with max 2, a valid voice, `ai.provider: "gemini"`, `language: "en"`.
- **Expected:** `201`; `status = ACTIVE`; `config.questionIds.length === 5`; `domainId` matches the user's active domain; exactly one turn with `order = 0`, `type = "DB_QUESTION"`, `questionId` equal to `config.questionIds[0]`, and a non-empty `promptText`.

### TC-M02 — Create a session in picked mode
- **Requirements:** MI-R5, R16
- **Level:** Integration
- **Steps:** `POST` with `selectionMode: "picked"` and three explicit `questionIds`.
- **Expected:** `201`; `config.questionIds` equals exactly those three, in the given order.

### TC-M03 — First prompt honours the override and language
- **Requirements:** MI-R22 · AC-4
- **Level:** Integration
- **Preconditions:** Question Q is a default; the user has an override changing `questionVn`.
- **Steps:** Create a picked session with `[Q]` and `language: "vn"`.
- **Expected:** `promptText` equals the **override's** `questionVn`, not the original's and not the English text.

### TC-M04 — Submit an answer and receive an evaluation
- **Requirements:** MI-R33, R37, R40, R42 · AC-5
- **Level:** Integration (AI provider stubbed)
- **Steps:** Stub `evaluateAnswer` to return score 7 with a `nextQuestion` decision. `POST .../turns` with the open `turnId` and an answer.
- **Expected:** `200` with `evaluatedTurn` (answer, evaluation, decision persisted), a `nextTurn` of type `DB_QUESTION` for the second configured question, and `sessionStatus: "ACTIVE"`.

### TC-M05 — Follow-up flow
- **Requirements:** MI-R43, R46
- **Level:** Integration (stubbed)
- **Preconditions:** Follow-ups enabled, max 2.
- **Steps:** Stub the provider to return `{ kind: "followUp", question: "Can you elaborate?", reason: "…" }`. Submit an answer.
- **Expected:** A new turn with `type = "AI_FOLLOWUP"`, `questionId = null`, `promptText = "Can you elaborate?"`, `order` one greater than the answered turn.

### TC-M06 — Session completes when questions run out
- **Requirements:** MI-R45, R48 · AC-8
- **Level:** Integration (stubbed)
- **Preconditions:** A one-question session.
- **Steps:** Stub `nextQuestion`. Submit the answer.
- **Expected:** Decision rewritten to `{ kind: "end", reason: "No more questions in the configured set." }`; session `COMPLETED` with `endedAt` set; `nextTurn` is `null`.

### TC-M07 — Session list
- **Requirements:** MI-R50, R51
- **Level:** Integration
- **Preconditions:** One `ACTIVE` and one `COMPLETED` session.
- **Steps:** Render `/interview`.
- **Expected:** Newest first; each row shows status, mode, question count, start time, turn count, provider; the active row links to `/interview/<id>` ("Resume →") and the completed one to `.../summary` ("View →").

### TC-M08 — Summary metrics
- **Requirements:** MI-R53, R54, R55
- **Level:** Integration
- **Preconditions:** A completed session with scores 8, 6, and 10 across three evaluated turns.
- **Steps:** Render the summary.
- **Expected:** Average "8.0/10", questions asked / configured, total turn count; each turn shows its badge, score, prompt, answer, strengths, gaps, and `Decision: <kind> — <reason>`.

### TC-M09 — Full interview loop
- **Requirements:** MI-R23 → R49
- **Level:** E2E (requires real Azure + Gemini credentials)
- **Steps:** Follow the `MOCK_INTERVIEW_TODO.md` §2 checklist end to end.
- **Expected:** Every checklist item passes. **This is the single most important test to run first**, since none of it has ever been exercised.

## Validation cases

### TC-M10 — Random mode requires filters
- **Requirements:** MI-V1 (cross-field refine)
- **Level:** Unit (schema)
- **Steps:** Parse `{ selectionMode: "random" }` with no `filters`.
- **Expected:** Rejected — "Provide filters for random mode, or questionIds for picked mode."

### TC-M11 — Picked mode requires a non-empty list
- **Requirements:** MI-V1 · AC-3
- **Level:** Unit (schema) + Integration
- **Steps:** Parse and post `{ selectionMode: "picked", questionIds: [] }`.
- **Expected:** `400` with the refine message.

### TC-M12 — Numeric boundaries
- **Requirements:** MI-V1
- **Level:** Unit (schema)
- **Steps:** Validate `count` at 0, 1, 50, 51; `maxPerQuestion` at −1, 0, 5, 6; `rate` at 0.49, 0.5, 2, 2.01.
- **Expected:** 0/51, −1/6, and 0.49/2.01 rejected; the in-range values accepted.

### TC-M13 — Empty answer rejected
- **Requirements:** MI-R28
- **Level:** Unit (schema) + Integration + Unit (component)
- **Steps:** Post `answerText: ""` and `"   "`; also click Submit in the room with a whitespace-only transcript.
- **Expected:** Schema rejects `""` with "Answer cannot be empty". The client blocks whitespace-only with a toast and issues no request. **Note:** `"   "` passes `z.string().min(1)` server-side — record whether the API accepts it.

### TC-M14 — Invalid PATCH action
- **Requirements:** MI-V1 · AC-11
- **Level:** Integration
- **Steps:** `PATCH .../[id]` with `{ action: "pause" }`, `{}`, and a malformed body.
- **Expected:** `400 { error: "Invalid action" }` in all cases (the handler catches a `json()` failure with `.catch(() => ({}))`).

### TC-M15 — Unknown voice name is accepted
- **Requirements:** MI-V2
- **Level:** Integration
- **Steps:** Create a session with `voice: { name: "not-a-real-voice", rate: 1 }`.
- **Expected:** **`201`** — no validation against the voice list. The failure surfaces later as a TTS error. Pins the gap.

### TC-M16 — `ai.model` is ignored
- **Requirements:** MI-V4, MI-X20
- **Level:** Integration
- **Steps:** Create a session with `ai: { provider: "gemini", model: "gemini-1.5-pro" }`; stub the provider and inspect the outbound request.
- **Expected:** The stored config contains the model, but the request uses `GEMINI_MODEL` or the hard-coded default. Documents the dead field.

### TC-M17 — Picked mode accepts arbitrary question ids
- **Requirements:** MI-V3
- **Level:** Integration
- **Steps:** Create a picked session with another user's private question id.
- **Expected:** Document the outcome — no visibility validation exists, so creation is expected to proceed and then fail when the question is resolved. **Unverified prediction.**

## Flow-control cases

### TC-M18 — Follow-up budget exhausted
- **Requirements:** MI-R44 · AC-7
- **Level:** Integration (stubbed)
- **Preconditions:** `maxPerQuestion: 1`; one follow-up already used on the current question.
- **Steps:** Stub the provider to return `followUp` again. Submit.
- **Expected:** The stored decision is `{ kind: "nextQuestion", reason: "Follow-ups exhausted; moving on." }` and a `DB_QUESTION` turn is created — the model's choice is overridden.

### TC-M19 — Follow-ups disabled
- **Requirements:** MI-R44, MI-R9
- **Level:** Integration (stubbed)
- **Preconditions:** `followUps.enabled: false`.
- **Steps:** Stub `followUp`. Submit.
- **Expected:** `followUpsAllowed` computes to 0, so the decision is rewritten to `nextQuestion`. Also assert the prompt told the model `0 left` and `(cannot pick followUp)`.

### TC-M20 — Follow-up counter resets per question
- **Requirements:** MI-R43 · AC-9
- **Level:** Unit (of `countFollowUpsForCurrentQuestion`) + Integration
- **Steps:** Build a turn list `[DB, FU, FU, DB, FU]` and evaluate.
- **Expected:** `currentQuestionId` is the second `DB` turn's question and `followUpsUsed === 1` — the count resets at each `DB_QUESTION`.

### TC-M21 — Both rewrites in sequence
- **Requirements:** MI-R44, MI-R45
- **Level:** Integration (stubbed)
- **Preconditions:** Last configured question; follow-up budget exhausted.
- **Steps:** Stub `followUp`. Submit.
- **Expected:** `followUp` → `nextQuestion` → `end`; the session completes. Confirms the rewrites compose in the right order.

### TC-M22 — Model-initiated end
- **Requirements:** MI-R40, R48, MI-B6
- **Level:** Integration (stubbed)
- **Steps:** Stub `{ kind: "end", reason: "Candidate asked to stop." }` with questions still remaining.
- **Expected:** Session `COMPLETED`, `endedAt` set, `nextTurn` null, and the remaining questions never asked.

### TC-M23 — Only the latest turn can be answered
- **Requirements:** MI-R34 · AC-6
- **Level:** Integration
- **Preconditions:** A session with three turns, the last one open.
- **Steps:** Submit against the **first** turn's id.
- **Expected:** `400` with "Can only answer the latest open turn".

### TC-M24 — A turn cannot be answered twice
- **Requirements:** MI-R35 · AC-6
- **Level:** Integration
- **Steps:** Submit the same turn twice.
- **Expected:** Second call `400` with "Turn already answered".

### TC-M25 — Cannot submit to a non-active session
- **Requirements:** MI-R36
- **Level:** Integration
- **Steps:** Abandon the session, then submit an answer.
- **Expected:** `400` with "Session is not active".

### TC-M26 — Unknown turn id
- **Requirements:** MI-R33
- **Level:** Integration
- **Steps:** Submit with `turnId: "nope"`.
- **Expected:** `400` with "Turn not found".

## Evaluation-input cases

### TC-M27 — Reference answer only for DB questions
- **Requirements:** MI-R38
- **Level:** Integration (capture the provider input)
- **Steps:** Submit against a `DB_QUESTION` turn, then against an `AI_FOLLOWUP` turn.
- **Expected:** `expectedAnswer` is the question's answer in the first case and **`null`** in the second.

### TC-M28 — Override affects the reference answer and difficulty
- **Requirements:** MI-R39
- **Level:** Integration
- **Preconditions:** The user overrode both `answer` and `difficulty` on the current question.
- **Steps:** Submit and capture the provider input.
- **Expected:** `expectedAnswer` and `difficulty` come from the override.

### TC-M29 — History excludes the current turn
- **Requirements:** MI-R37
- **Level:** Unit (of `buildHistory`) + Integration
- **Steps:** With three prior answered turns plus the open one, capture `history`.
- **Expected:** Six entries (interviewer/candidate for each of the three prior turns) and **no** entry for the current prompt or answer, which are passed separately.

### TC-M30 — Prompt guardrails
- **Requirements:** MI-R37, MI-R41
- **Level:** Unit (of `buildEvaluationPrompt`)
- **Steps:** Build prompts for `followUpsRemaining` of 0 and 2, and for `language` `en` and `vn`.
- **Expected:** The system prompt names the correct language; the user message includes `(cannot pick followUp)` only at 0; the reference answer line appears only when one is supplied and carries "never reveal".

### TC-M31 — Empty history
- **Requirements:** MI-R37
- **Level:** Unit
- **Steps:** Build a prompt for the very first turn.
- **Expected:** The history block reads `(no prior turns)`.

## Permission cases

### TC-M32 — Sessions are per-user
- **Requirements:** MI-R56, MI-P1 · AC-10
- **Level:** Integration
- **Steps:** As user B, `GET`, `PATCH`, and submit an answer against user A's session.
- **Expected:** `GET` → `404 { error: "Not found" }`; `PATCH` → `400` with "Not found"; submit → `400` with "Session not found". Ownership is reported as absence, never as forbidden.

### TC-M33 — Unauthenticated access
- **Requirements:** MI-E1
- **Level:** Integration (handlers called directly, `auth()` mocked to `null`)
- **Steps:** Invoke all five interview/speech handlers.
- **Expected:** `401 { error: "Unauthorized" }` from each.

### TC-M34 — No role restriction
- **Requirements:** MI-R3
- **Level:** Integration
- **Steps:** Create and run a session as a plain `USER`.
- **Expected:** Fully permitted — documents that the feature is not admin-gated despite being hidden.

### TC-M35 — Routes remain reachable while hidden
- **Requirements:** MI-R1, R2
- **Level:** E2E
- **Steps:** Inspect the header for a "Mock Interview" link; then navigate directly to each of the four routes.
- **Expected:** No link exists; all four routes render. This is the guard for the "hidden, not disabled" state.

### TC-M36 — Sidebar hidden on interview pages
- **Requirements:** MI-R4
- **Level:** Unit (component)
- **Steps:** Render `ConditionalSidebar` at `/interview` and `/interview/abc`.
- **Expected:** `null` in both cases.

## Session lifecycle cases

### TC-M37 — Abandon
- **Requirements:** MI-R31 · AC-11
- **Level:** Integration
- **Steps:** `PATCH` with `{ action: "abandon" }`.
- **Expected:** `status = ABANDONED`, `endedAt` set, `200 { success: true }`.

### TC-M38 — End
- **Requirements:** AC-11
- **Level:** Integration
- **Steps:** `PATCH` with `{ action: "end" }`.
- **Expected:** `status = COMPLETED`, `endedAt` set.

### TC-M39 — Ending an already-ended session is a silent no-op
- **Requirements:** MI-B8, MI-X23
- **Level:** Integration
- **Steps:** Abandon, then `PATCH` again with `{ action: "end" }`.
- **Expected:** `200 { success: true }` but the status **stays `ABANDONED`** and `endedAt` is unchanged — `endInterviewSession` returns early for non-active sessions. Pins the misleading success.

### TC-M40 — Active session page redirects when not active
- **Requirements:** MI-R51
- **Level:** Integration
- **Steps:** Open `/interview/<completed id>`.
- **Expected:** Redirect to `/interview/<id>/summary`.

### TC-M41 — Resume across a reload
- **Requirements:** MI-R32
- **Level:** E2E
- **Steps:** Mid-session, reload the page.
- **Expected:** The room rehydrates with all turns and the same open turn. **Also assert (MI-X15):** the current prompt is **spoken again**, because `playedTurnIdsRef` resets on remount.

## Edge cases

### TC-M42 — No questions match
- **Requirements:** MI-R18 · AC-2
- **Level:** Integration
- **Steps:** Create a random session with filters matching nothing.
- **Expected:** `400 { error: "No questions matched the given filters/selection." }`; no session row created.

### TC-M43 — Fewer matches than requested
- **Requirements:** MI-X8
- **Level:** Integration
- **Preconditions:** Only 3 questions match.
- **Steps:** Request `count: 10`.
- **Expected:** `201` with **3** question ids — silently fewer, no warning.

### TC-M44 — Hidden questions are still selectable
- **Requirements:** MI-X4
- **Level:** Integration
- **Preconditions:** The user hid question H via an override.
- **Steps:** Create a random session whose filters match only H.
- **Expected:** **H is selected and asked.** Documents that `isHidden` is not consulted here, unlike every other read path.

### TC-M45 — Missing Vietnamese variant falls back to English
- **Requirements:** MI-X12
- **Level:** Integration
- **Preconditions:** Question Q has no `questionVn`.
- **Steps:** Create a `vn` session with `[Q]`.
- **Expected:** `promptText` is the **English** text while the session language remains `vn` — so it will be spoken with a Vietnamese voice.

### TC-M46 — English reference answer in a Vietnamese session
- **Requirements:** MI-X13
- **Level:** Integration
- **Preconditions:** Q has `answer` but no `answerVn`.
- **Steps:** Submit in a `vn` session and capture the provider input.
- **Expected:** `expectedAnswer` is the **English** answer while `language` is `vn`.

### TC-M47 — `followUp` decision with no question field
- **Requirements:** MI-X11
- **Level:** Integration (stubbed)
- **Steps:** Stub the provider to return `{ kind: "followUp", reason: "…" }` with no `question`.
- **Expected:** **Unverified prediction:** a turn is created with `promptText: undefined`, which either fails the non-null database constraint or produces an empty prompt. Determine which, and pin it — the JSON schema permits this response.

### TC-M48 — Malformed provider response
- **Requirements:** MI-X19 (cast without validation)
- **Level:** Integration (stubbed)
- **Steps:** Stub the provider to return valid JSON with a missing `evaluation` key.
- **Expected:** Document the failure mode. The cast performs no runtime check, so the error surfaces downstream.

### TC-M49 — Randomness distribution
- **Requirements:** MI-X6
- **Level:** Unit
- **Steps:** Run the shuffle 10,000 times over 5 items and tally position frequencies.
- **Expected:** A measurably **non-uniform** distribution, since `sort(() => Math.random() - 0.5)` is biased. Pins the known defect.

### TC-M50 — Concurrent submissions for the same turn
- **Requirements:** MI-X18
- **Level:** Integration
- **Steps:** Fire two simultaneous submits for the same open turn.
- **Expected:** Document the outcome — there is no transaction or lock, so both may pass the "already answered" check. **Unverified prediction:** duplicate next-turn creation is possible.

### TC-M51 — Stale config shape
- **Requirements:** MI-X19
- **Level:** Integration
- **Steps:** Write a session row whose `config` JSON lacks `followUps`, then submit an answer.
- **Expected:** A runtime error when `config.followUps.enabled` is read — no validation guards the cast.

## Speech cases

### TC-M52 — Token exchange
- **Requirements:** MI-R57 · AC-12
- **Level:** Integration
- **Steps:** `GET /api/speech/token` with Azure stubbed.
- **Expected:** `200 { token, region }` with `Cache-Control: no-store`; the request to Azure carries `Ocp-Apim-Subscription-Key`; **the subscription key never appears in the response**.

### TC-M53 — Azure unconfigured
- **Requirements:** MI-E5 · AC-12
- **Level:** Integration
- **Steps:** Unset `AZURE_SPEECH_KEY`; call the endpoint.
- **Expected:** `500 { error: "Azure Speech not configured" }`.

### TC-M54 — Upstream token failure
- **Requirements:** MI-E5
- **Level:** Integration
- **Steps:** Stub Azure to return `401`.
- **Expected:** `502` whose message includes the upstream status and body. Note this leaks upstream detail — record it.

### TC-M55 — Token refresh threshold
- **Requirements:** MI-R58
- **Level:** Unit
- **Steps:** Instantiate `AzureSpeech`, advance the clock to 7 minutes then to 9, calling `speak` each time.
- **Expected:** No refetch at 7 minutes; a refetch at 9.

### TC-M56 — SSML escaping
- **Requirements:** MI-R59
- **Level:** Unit
- **Steps:** Speak text containing `& < > " '`.
- **Expected:** All five escaped in the SSML; the document remains well-formed. This is an injection guard — treat it as security-relevant.

### TC-M57 — HTML stripped before speaking
- **Requirements:** MI-R60
- **Level:** Unit
- **Steps:** Speak a prompt of `<p>What is a <strong>closure</strong>?</p>`.
- **Expected:** The synthesized text is "What is a closure?" with no tags.

### TC-M58 — Recognition locale
- **Requirements:** MI-R61
- **Level:** Unit
- **Steps:** Start listening with `en` and with `vn`.
- **Expected:** `speechRecognitionLanguage` is `en-US` and `vi-VN` respectively.

### TC-M59 — Transcript accumulation
- **Requirements:** MI-R62
- **Level:** Unit
- **Steps:** Emit `recognizing("hello")`, `recognized("hello world")`, `recognizing("and")`, then stop.
- **Expected:** The callback receives the final text appended to the partial at each step; `stopListening` returns the combined final + partial, trimmed, and clears both accumulators.

### TC-M60 — Dispose cleans up
- **Requirements:** MI-X14
- **Level:** Unit
- **Steps:** Start speaking and listening, then unmount the room.
- **Expected:** `dispose()` closes both the synthesizer and the recognizer. **Also assert** that a turn change alone does **not** stop them — that is the known gap.

## Loading and empty states

### TC-M61 — Empty session list
- **Requirements:** MI-R52
- **Level:** Unit (component)
- **Steps:** Render `/interview` with no sessions.
- **Expected:** A microphone icon and "No sessions yet. Start your first mock interview."

### TC-M62 — Empty question list in picked mode
- **Requirements:** MI-R7
- **Level:** Unit (component)
- **Steps:** Render the config form in picked mode with `/api/questions` returning `[]`.
- **Expected:** "No questions available."; the Start button stays disabled.

### TC-M63 — Room state badges
- **Requirements:** MI-R29
- **Level:** Unit (component)
- **Steps:** Render the room in each `RoomState`.
- **Expected:** The state badge shows the uppercase state; "Question X / Y" counts `DB_QUESTION` turns against `config.questionIds.length`; the "Follow-up" badge appears only for an `AI_FOLLOWUP` open turn.

### TC-M64 — Waiting for the next turn
- **Requirements:** MI-X16
- **Level:** Unit (component)
- **Steps:** Render with an `ACTIVE` session whose last turn is already answered.
- **Expected:** "Preparing next turn…" — and note there is **no timeout** if the next turn never arrives.

### TC-M65 — Ended-session redirect
- **Requirements:** MI-R49
- **Level:** Unit (component)
- **Steps:** Set the session status to `COMPLETED` in the room.
- **Expected:** "Session ended / Redirecting to summary…" then navigation after 1.5 s; the timer is cleared on unmount.

### TC-M66 — Conversation log
- **Requirements:** MI-R30
- **Level:** Unit (component)
- **Steps:** Render with four turns.
- **Expected:** A collapsed `<details>` reading "Conversation so far (3 prior turns)"; expanding shows each prior turn's type label, prompt, answer, and score.

## API / network failure scenarios

### TC-M67 — Missing provider API key
- **Requirements:** MI-E6
- **Level:** Integration
- **Steps:** Unset `GEMINI_API_KEY`; submit an answer.
- **Expected:** `400` whose body contains "GEMINI_API_KEY is not set" — an internal configuration detail reaching the client.

### TC-M68 — Provider HTTP error leaks upstream detail
- **Requirements:** MI-E7, MI-X3
- **Level:** Integration
- **Steps:** Stub the Gemini endpoint to return `429` with a body.
- **Expected:** `400` containing `Gemini API error 429: <body>`. Pins the leak flagged in `design.md`.

### TC-M69 — TTS failure does not break the interview
- **Requirements:** MI-E8
- **Level:** Unit (component)
- **Steps:** Make `speak` reject.
- **Expected:** Toast; state returns to `idle`; the user can still record and submit.

### TC-M70 — Microphone failure
- **Requirements:** MI-E9
- **Level:** Unit (component)
- **Steps:** Make `startListening` reject (permission denied).
- **Expected:** Toast; state returns to `idle`.

### TC-M71 — Speech init failure
- **Requirements:** MI-E11
- **Level:** Unit (component)
- **Steps:** Make `AzureSpeech.create()` reject.
- **Expected:** Toast; the caller aborts; the room does not crash and remains usable for reading.

### TC-M72 — Submit failure preserves the transcript
- **Requirements:** MI-E10
- **Level:** Unit (component)
- **Steps:** Stub the turns endpoint to return `500`; submit.
- **Expected:** Toast; state returns to `confirming`; **the edited transcript is still in the textarea**.

### TC-M73 — Abandon failure still navigates
- **Requirements:** MI-X24
- **Level:** Unit (component)
- **Steps:** Stub `PATCH` to return `500`; click "End session" and confirm.
- **Expected:** **Navigation to the summary happens anyway** — the response is never checked. Pins the bug.

## Security-relevant cases

### TC-M74 — LLM output is injected as HTML
- **Requirements:** MI-X2
- **Level:** Unit (component) — **security**
- **Steps:** Craft an `AI_FOLLOWUP` turn whose `promptText` contains `<img src=x onerror=…>`, and render the room, the conversation log, and the summary.
- **Expected:** Document that all three use `dangerouslySetInnerHTML` and the markup is inserted unsanitized. This is the highest-severity finding in the feature and should be pinned before any hardening work.

### TC-M75 — Speech token is unthrottled
- **Requirements:** MI-X9
- **Level:** Integration — **security**
- **Steps:** Call `/api/speech/token` 100 times in quick succession as one user.
- **Expected:** All succeed. Documents that any signed-in user can mint Azure tokens at the account owner's expense.

### TC-M76 — Reference answer is not revealed
- **Requirements:** MI-R37 (prompt guardrail)
- **Level:** Integration (real provider) — **behavioral**
- **Steps:** Submit a deliberately poor answer and inspect the returned follow-up question and gaps.
- **Expected:** The model does not quote the reference answer verbatim. This is prompt-dependent and cannot be guaranteed — treat as a monitored expectation rather than a hard assertion.

## Regression-sensitive behavior

| Area | Why it is fragile | Guard test |
|---|---|---|
| Decision rewrite order in `submitAnswer` | `followUp → nextQuestion → end` must compose; reordering breaks termination | TC-M18, TC-M21 |
| `countFollowUpsForCurrentQuestion` | Derived state; a change to the reset rule silently changes budgets | TC-M20 |
| "Latest open turn" check | The only guard against out-of-order answering | TC-M23, TC-M24 |
| `expectedAnswer` gated on `DB_QUESTION` | Passing it for follow-ups would leak the reference into follow-up grading | TC-M27 |
| `buildHistory(turns.slice(0, -1))` | Including the current turn double-feeds the prompt | TC-M29 |
| Ownership checks in `session.ts` | Enforced in the lib, not the routes; a new route that skips the lib bypasses them | TC-M32 |
| `escapeSsml` | Removing it allows SSML injection through question text | TC-M56 |
| Token stays server-side | Returning the subscription key instead of the token would expose the Azure account | TC-M52 |
| JSON schema `required` lists | Loosening them further increases the `undefined promptText` risk | TC-M47 |
| `playedTurnIdsRef` | Dropping it causes the prompt to be re-spoken on every render | TC-M41 |

## Recommended missing coverage

Ordered by value:

1. **Run the manual checklist in `MOCK_INTERVIEW_TODO.md` §2 first (TC-M09).** Nothing else here is
   meaningful until the feature is known to work at all. Several "expected" results above are
   predictions that this exercise would confirm or refute.
2. **Resolve the migration blocker (MI-X17)** before any of this can run against a fresh database.
3. **Unit tests for `submitAnswer`'s flow control** with the provider stubbed — TC-M18, TC-M20,
   TC-M21, TC-M23, TC-M24. This is pure, deterministic logic and the most intricate code in the
   repository; it needs no network access to test.
4. **TC-M74 (unsanitized LLM output)** — highest-severity issue. Pin it, then fix it.
5. **Unit tests for `buildEvaluationPrompt`** (TC-M30, TC-M31) — cheap, no network, and the prompt is
   the contract with both providers.
6. **Unit tests for `AzureSpeech`** with the SDK stubbed: SSML escaping (TC-M56, security-relevant),
   token refresh (TC-M55), and transcript accumulation (TC-M59).
7. **A contract test per provider** asserting the request body shape (schema, temperature, auth
   header) against a stubbed HTTP layer — this is what would catch an upstream API change.
8. **Provider-response validation does not exist** (TC-M48). Introducing a Zod schema for
   `EvaluateAnswerOutput` and testing it would close both TC-M47 and TC-M48.
9. **Nothing covers the interaction with overrides** (TC-M28, TC-M44). Given that this feature carries
   a third, divergent copy of the merge logic, a consistency test against
   `getQuestionForUser` is worth more here than anywhere else.
10. **No coverage of concurrency** (TC-M50). Worth at least documenting before the feature is unhidden.
</content>
