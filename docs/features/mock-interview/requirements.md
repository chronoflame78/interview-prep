# Mock Interview — Requirements (as built)

> Reverse-engineered from the current implementation. Items that could not be confirmed from code
> are marked **Unknown / needs confirmation**.
>
> ⚠️ **This feature is built but hidden.** Its navigation entry is commented out in
> `src/components/layout/header.tsx` (commit "hide mock interview menu"), so the pages are reachable
> only by typing a URL. `MOCK_INTERVIEW_TODO.md` in the repo root records that the feature
> **has never been run end-to-end in a browser**. Everything below is derived from the code, not
> from observed runtime behavior.

## Feature overview

A voice-driven mock interview. The user configures a session (which questions, how many follow-ups,
which language, which AI provider, which voice). The app then reads each question aloud via Azure
Neural TTS, records the spoken answer via Azure speech-to-text, lets the user correct the transcript,
and sends it to an LLM (Gemini or OpenAI) which scores the answer, lists strengths and gaps, and
decides whether to ask a follow-up, move to the next question, or end. A summary page shows the
average score and every turn's evaluation.

## Purpose / user problem

Reading questions and answers is passive practice. A spoken, timed, adaptive interview with
follow-up probing is much closer to the real experience, and automated scoring gives feedback
without needing a human partner.

## Current functional requirements

### Availability

- **MI-R1** — The "Mock Interview" nav item is commented out; there is no link to the feature anywhere in the UI.
- **MI-R2** — The routes `/interview`, `/interview/new`, `/interview/[sessionId]`, and `/interview/[sessionId]/summary` remain live and reachable by direct URL for any signed-in user.
- **MI-R3** — There is no role restriction — any `USER` can start a session.
- **MI-R4** — The left sidebar is not rendered on interview pages (it appears only on `/questions` paths).

### Session configuration

- **MI-R5** — `/interview/new` offers two selection modes: **Random** (filter-driven) and **Pick specific** (explicit checklist).
- **MI-R6** — Random mode accepts a question count (1–50, default 5), and optional difficulty, topic, and sub-topic filters.
- **MI-R7** — Picked mode lists up to 500 of the user's visible questions with checkboxes and shows a running selected count.
- **MI-R8** — Sub-topic options in random mode are restricted to the selected topics; with no topic selected, all sub-topics are offered.
- **MI-R9** — Follow-ups can be enabled or disabled; when enabled, a maximum per question (0–5, default 2) is configurable.
- **MI-R10** — Language is English or Vietnamese. Changing it resets the voice to that language's default.
- **MI-R11** — Voice is chosen from a hard-coded list — six English voices, two Vietnamese.
- **MI-R12** — Speech rate is a slider from 0.5× to 2× in 0.05 steps, default 1.0×.
- **MI-R13** — AI provider is Gemini 2.0 Flash or OpenAI GPT-4o-mini, default Gemini.
- **MI-R14** — The Start button is disabled while submitting, and in picked mode until at least one question is selected.
- **MI-R15** — On success the user is navigated to `/interview/<id>`.

### Session creation

- **MI-R16** — `POST /api/interview/sessions` validates the payload, resolves the question set, and creates an `InterviewSession` with `status = ACTIVE`.
- **MI-R17** — In random mode the candidate pool is the same visibility rule as the question list (defaults plus the user's own, domain-scoped), narrowed by the chosen filters, then shuffled and truncated to `count`.
- **MI-R18** — If no questions match, creation fails with "No questions matched the given filters/selection."
- **MI-R19** — The full configuration is stored as JSON on `InterviewSession.config`, including the resolved `questionIds`.
- **MI-R20** — The session is stamped with the user's active domain.
- **MI-R21** — The first turn is created together with the session: `order = 0`, `type = DB_QUESTION`, with the first question's text as `promptText`.
- **MI-R22** — The prompt text respects the user's override for that question and the session language (Vietnamese if requested and present, otherwise English).

### Conducting the interview

- **MI-R23** — On loading an active session, the current open turn's prompt is spoken automatically, once per turn.
- **MI-R24** — A "Replay" button re-speaks the current prompt. It is disabled while speaking or listening.
- **MI-R25** — "Start" begins continuous speech recognition; interim results stream into a transcript box.
- **MI-R26** — "Stop" ends recognition and moves to a confirmation step showing the final transcript in an editable textarea, with the note that speech-to-text often mistranscribes technical terms.
- **MI-R27** — From the confirmation step the user can "Re-record" (discarding the transcript) or "Submit".
- **MI-R28** — Submitting an empty or whitespace-only answer is blocked client-side with "Answer cannot be empty", and rejected server-side by the schema.
- **MI-R29** — The header shows the current state, "Question X / Y", a "Follow-up" badge when the open turn is an AI follow-up, the turn count, and the provider name.
- **MI-R30** — A collapsible "Conversation so far" section lists all prior turns with their prompts, answers, and scores.
- **MI-R31** — "End session" asks for confirmation, marks the session `ABANDONED`, and navigates to the summary.
- **MI-R32** — Refreshing mid-session restores state from the database, because every turn is persisted.

### Answer evaluation

- **MI-R33** — `POST /api/interview/sessions/[id]/turns` accepts `{ turnId, answerText }` and returns `{ evaluatedTurn, nextTurn, sessionStatus }`.
- **MI-R34** — Only the **latest** turn may be answered; answering an earlier turn fails with "Can only answer the latest open turn".
- **MI-R35** — A turn that already has an answer cannot be answered again ("Turn already answered").
- **MI-R36** — Answers can only be submitted to an `ACTIVE` session.
- **MI-R37** — The evaluator receives the question, the reference answer, the conversation history excluding the current turn, the remaining follow-up allowance, the difficulty, and the language.
- **MI-R38** — The reference answer is supplied **only for `DB_QUESTION` turns**; follow-up turns are evaluated with no reference.
- **MI-R39** — The reference answer and difficulty respect the user's override.
- **MI-R40** — The model returns a score (0–10), a list of strengths, a list of gaps, and one decision: `followUp` (with a question), `nextQuestion`, or `end` — each with a reason.
- **MI-R41** — Both providers are constrained to a JSON schema — Gemini via `responseSchema`, OpenAI via a strict `json_schema` response format. Temperature is 0.4 for both.
- **MI-R42** — The evaluation and decision are stored on the answered turn as JSON.

### Flow control

- **MI-R43** — Follow-ups used are counted **per question** and reset whenever a new `DB_QUESTION` turn begins.
- **MI-R44** — If the model asks for a follow-up but none remain, the decision is rewritten to `nextQuestion` with the reason "Follow-ups exhausted; moving on."
- **MI-R45** — If the model says `nextQuestion` but every configured question has been asked, the decision is rewritten to `end` with the reason "No more questions in the configured set."
- **MI-R46** — A `followUp` decision creates a new `AI_FOLLOWUP` turn carrying the model's question.
- **MI-R47** — A `nextQuestion` decision creates a new `DB_QUESTION` turn for the first configured question not yet asked, again resolving overrides and language.
- **MI-R48** — An `end` decision sets the session to `COMPLETED` with an end timestamp.
- **MI-R49** — When a session stops being `ACTIVE`, the room shows "Session ended — Redirecting to summary…" and navigates to the summary after 1.5 seconds.

### Session list and summary

- **MI-R50** — `/interview` lists the user's sessions newest-first with status, selection mode, question count, start time, turn count, and provider.
- **MI-R51** — Active sessions link to the room ("Resume →"); others link to the summary ("View →").
- **MI-R52** — An empty state invites the user to start their first session.
- **MI-R53** — The summary shows average score, questions asked versus configured, and total turns.
- **MI-R54** — The average is computed over **all** turns that have an evaluation, including follow-ups.
- **MI-R55** — Each turn is rendered with its type badge, score, prompt, answer, strengths, gaps, and the decision with its reason.
- **MI-R56** — Sessions are strictly per-user; another user's session id returns not-found.

### Speech

- **MI-R57** — `GET /api/speech/token` exchanges the server-held Azure subscription key for a short-lived authorization token and returns it with the region, marked `Cache-Control: no-store`.
- **MI-R58** — The client refreshes the token when it is older than 8 minutes, checked before each speak or listen call.
- **MI-R59** — Text is spoken via SSML with the chosen voice and rate; XML special characters are escaped.
- **MI-R60** — HTML is stripped from the prompt before it is spoken, but the prompt is rendered as HTML on screen.
- **MI-R61** — Recognition locale is `vi-VN` for Vietnamese and `en-US` for English.
- **MI-R62** — Recognized phrases accumulate: finalized segments are appended, and the in-progress phrase is shown appended to them.

## User flows

### Run an interview
1. Navigate to `/interview/new` (no link exists — MI-R1).
2. Choose random or picked selection, set filters or tick questions.
3. Configure follow-ups, language, provider, voice, and rate.
4. Click "Start interview" → session and first turn created → redirected to the room.
5. The first question is spoken automatically.
6. Click Start, speak the answer, click Stop.
7. Review and correct the transcript, click Submit.
8. The model scores the answer and decides what is next; a follow-up or the next question is spoken.
9. Repeat until the model ends or the question set is exhausted.
10. The session is marked `COMPLETED` and the summary opens.

### Abandon mid-session
1. Click "End session" and confirm.
2. `PATCH /api/interview/sessions/[id]` with `{ action: "abandon" }` sets `ABANDONED`.
3. The summary opens showing partial results.

### Resume
1. Open `/interview` and click an `ACTIVE` session.
2. The room rehydrates from the database and continues at the open turn.

## Business rules

- **MI-B1** — The question set is fixed at creation. It cannot be changed mid-session.
- **MI-B2** — Configuration is immutable once the session starts — no changing voice, provider, language, or follow-up allowance.
- **MI-B3** — Turns form an ordered append-only log; nothing is ever deleted or rewritten except the answer, evaluation, and decision on the turn being answered.
- **MI-B4** — Exactly one turn may be open (unanswered) at a time, and it is always the last one.
- **MI-B5** — The model's decision is advisory; the server overrides it when the follow-up budget or the question set is exhausted (MI-R44, MI-R45).
- **MI-B6** — `end` is reserved by the prompt for cases where the candidate explicitly gives up, though the server also produces it when questions run out.
- **MI-B7** — A session belongs to exactly one user and is never visible to another.
- **MI-B8** — Ending an already-ended session is a no-op.
- **MI-B9** — Only text is stored; no audio is retained.

## Validation rules

`src/lib/validations/interview.ts` (Zod v4 via the default `zod` import, unlike the other schemas which use `zod/v4`):

| Field | Rule |
|---|---|
| `selectionMode` | `"random"` \| `"picked"` |
| `questionIds` | optional array of string |
| `filters.count` | integer 1–50 |
| `filters.topicIds`, `subTopicIds`, `difficulties` | optional arrays |
| `followUps.enabled` | boolean |
| `followUps.maxPerQuestion` | integer 0–5 |
| `voice.name` | non-empty string |
| `voice.rate` | 0.5–2 |
| `ai.provider` | `"gemini"` \| `"openai"` |
| `language` | `"en"` \| `"vn"` |
| Cross-field | random mode requires `filters`; picked mode requires a non-empty `questionIds` |
| `submitAnswerSchema.turnId` | non-empty string |
| `submitAnswerSchema.answerText` | non-empty — "Answer cannot be empty" |

- **MI-V1** — `PATCH` accepts only `action: "end"` or `action: "abandon"`; anything else returns `400 { error: "Invalid action" }`.
- **MI-V2** — `voice.name` is not checked against the known voice list — any non-empty string is accepted and passed to Azure.
- **MI-V3** — `questionIds` in picked mode are not validated for existence, visibility, or domain.
- **MI-V4** — `ai.model` is accepted but **never used**; both providers read their model from environment variables.

## Permissions / access restrictions

| Action | Anonymous | `USER` | `ADMIN` |
|---|---|---|---|
| All interview pages | redirect to `/login` | ✅ | ✅ |
| Create a session | `401` | ✅ | ✅ |
| Read / end a session | `401` | own only | own only |
| Submit an answer | `401` | own only | own only |
| Speech token | `401` | ✅ | ✅ |

- **MI-P1** — Every session operation checks `session.userId !== userId` and treats a mismatch as not-found rather than forbidden.
- **MI-P2** — There is no admin view of other users' sessions.

## Error and failure behavior

- **MI-E1** — Unauthenticated API calls → `401 { error: "Unauthorized" }`.
- **MI-E2** — Invalid create payload → `400` with the first Zod message.
- **MI-E3** — Any error thrown inside session creation or answer submission is returned as `400` with **the raw `Error.message`**.
- **MI-E4** — `GET /api/interview/sessions/[id]` for a missing or foreign session → `404 { error: "Not found" }`.
- **MI-E5** — Azure Speech not configured → `500 { error: "Azure Speech not configured" }`; token exchange failure → `502` including the upstream status and body.
- **MI-E6** — A missing provider API key throws "GEMINI_API_KEY is not set" / "OPENAI_API_KEY is not set", which reaches the client as a `400`.
- **MI-E7** — A provider HTTP error throws `"<Provider> API error <status>: <body>"`, also surfaced as a `400` to the client.
- **MI-E8** — Text-to-speech failures show a toast and return the room to idle; the interview continues silently.
- **MI-E9** — Microphone failures show a toast and return to idle.
- **MI-E10** — A failed answer submission shows a toast and returns to the confirmation step with the transcript preserved.
- **MI-E11** — Speech initialization failure shows a toast and the caller aborts.

## Important edge cases

- **MI-X1** — **The whole feature is unverified.** `MOCK_INTERVIEW_TODO.md` states it has never been run end-to-end. Everything here is code-derived.
- **MI-X2** — **Prompt text is rendered with `dangerouslySetInnerHTML`** in the room, the conversation log, and the summary. For `DB_QUESTION` turns this is stored question HTML; for `AI_FOLLOWUP` turns it is **LLM output injected into the DOM unsanitized**.
- **MI-X3** — **Provider errors leak to the client.** The raw upstream status and response body are put into the `Error` message and returned in a `400`, potentially including provider-side detail.
- **MI-X4** — **Hidden questions can still be asked.** `resolveRandomQuestionIds` does not consult `UserQuestionOverride.isHidden`, so a question the user hid still enters the pool.
- **MI-X5** — The override merge in the interview is a **third independent implementation**, covering only `question`, `questionVn`, `answer`, `answerVn`, `difficulty` — the Custom variants are ignored, and it does not reuse `getQuestionForUser`.
- **MI-X6** — **Random selection is biased.** `[...candidates].sort(() => Math.random() - 0.5)` is not a uniform shuffle.
- **MI-X7** — **The candidate pool is fully materialized.** Every matching question id is fetched before shuffling, regardless of the requested count.
- **MI-X8** — If fewer questions match than requested, the session silently starts with fewer; only a zero match is an error.
- **MI-X9** — **The Azure token is handed to the browser.** It is short-lived and scoped, but any signed-in user can call `/api/speech/token` repeatedly and use it directly against Azure, at the account owner's expense. There is no rate limiting.
- **MI-X10** — Token refresh is checked *before* a call, so a token that expires **during** a long recognition session is not renewed.
- **MI-X11** — **A `followUp` decision missing its `question` field would create a turn with `promptText: undefined`.** The JSON schema marks only `kind` and `reason` as required, so `question` is optional even for `followUp`.
- **MI-X12** — The Vietnamese fallback is per field: with `language: "vn"`, a question lacking `questionVn` is asked in English while the session continues in Vietnamese.
- **MI-X13** — `pickAnswerText` falls back to the English answer for Vietnamese sessions, so the model may receive an English reference answer while grading a Vietnamese response.
- **MI-X14** — **Speech synthesis and recognition are not stopped when a turn changes**, only on unmount. Rapid interaction could overlap audio.
- **MI-X15** — `playedTurnIdsRef` prevents replaying a prompt, but it is a `useRef` that resets on remount, so a refresh replays the current prompt.
- **MI-X16** — The room's `state` machine has a `"loading"` state entered after a successful submit that resolves only when the effect for the new open turn fires; there is no timeout if that never happens.
- **MI-X17** — **There is no migration for the interview tables.** `MOCK_INTERVIEW_TODO.md` records that they were created with `prisma db push` and that a pre-existing shadow-database blocker must be fixed before `migrate dev` will work.
- **MI-X18** — Answering is restricted to the latest turn, but there is no locking; two concurrent submissions for the same turn are not serialized.
- **MI-X19** — `InterviewSession.config` is stored as opaque JSON and cast with `as unknown as InterviewConfig` on read — no runtime validation, so an old session with a stale config shape would fail at use.
- **MI-X20** — `ai.model` is accepted but ignored (MI-V4); the model actually used comes from `GEMINI_MODEL` / `OPENAI_MODEL` or a hard-coded default.
- **MI-X21** — Picked mode's list is capped at `?limit=500`; a user with more questions cannot select beyond that.
- **MI-X22** — The summary's average includes follow-up turns, which are scored against no reference answer, so it mixes two kinds of measurement.
- **MI-X23** — `endInterviewSession` returns silently when the session is not `ACTIVE`, so "End session" on an already-completed session appears to succeed.
- **MI-X24** — The room's abandon handler does not check the response, so a failed `PATCH` still navigates to the summary.

## Non-goals / not supported

- Audio storage or playback of the candidate's answers.
- Streaming evaluation — the UI waits for the complete response.
- Changing configuration mid-session.
- Retrying a question or editing a submitted answer.
- Overall session-level feedback beyond the numeric average.
- Comparing sessions or tracking progress over time.
- Sharing an interview session.
- Any language other than English and Vietnamese.
- Providers other than Gemini and OpenAI.
- Typed answers as a first-class path (the textarea exists only to correct a transcript).
- Time limits per question or per session.
- Retry or backoff on transient Azure/LLM failures.

## Acceptance criteria

- **AC-1** — `POST /api/interview/sessions` in random mode with matching filters creates a session with `status = ACTIVE`, `config.questionIds.length ≤ count`, and exactly one turn (`order = 0`, `type = DB_QUESTION`).
- **AC-2** — Creation with filters matching nothing returns `400 { error: "No questions matched the given filters/selection." }`.
- **AC-3** — Picked mode with an empty `questionIds` fails validation.
- **AC-4** — The first prompt reflects the user's override and the session language.
- **AC-5** — Submitting an answer stores it with the evaluation and decision, and returns the next turn or a terminal status.
- **AC-6** — Answering a non-latest or already-answered turn fails.
- **AC-7** — A `followUp` decision with no remaining budget is converted to `nextQuestion`.
- **AC-8** — A `nextQuestion` decision with no unasked questions left is converted to `end`, and the session becomes `COMPLETED` with an `endedAt`.
- **AC-9** — Follow-up counting resets at each new `DB_QUESTION` turn.
- **AC-10** — Another user's session id returns `404` from `GET` and `PATCH`.
- **AC-11** — `PATCH` with `{ action: "abandon" }` sets `ABANDONED`; with `{ action: "end" }` sets `COMPLETED`; any other action returns `400`.
- **AC-12** — `GET /api/speech/token` returns `{ token, region }` with `Cache-Control: no-store` and `500` when Azure is unconfigured.
</content>
