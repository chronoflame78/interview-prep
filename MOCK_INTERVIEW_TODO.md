# Mock Interview — Remaining Work

Status as of pause: feature is fully coded and typechecks clean, but has **never been run end-to-end in a browser**. Picking this back up means doing the setup below, then verifying.

## 1. Environment setup

Add these to `.env`:

```
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=eastus       # or whichever region your Azure resource lives in
GEMINI_API_KEY=
OPENAI_API_KEY=                  # optional — only needed if switching providers in the UI
INTERVIEW_AI_PROVIDER=gemini     # default; the config form overrides per session
```

Where to get the keys:

- **Azure Speech**: Azure portal → create a Speech resource (F0 free tier = 5 hr STT/mo + 500k chars Neural TTS/mo). Key + region appear on the resource overview page.
- **Gemini**: https://aistudio.google.com/apikey — generous free tier on `gemini-2.0-flash`.
- **OpenAI** (optional): https://platform.openai.com/api-keys — paid only, `gpt-4o-mini` is cheap.

## 2. End-to-end verification (never run yet)

Test path:

- [ ] Top nav shows "Mock Interview" between "Topics" and other items
- [ ] Left sidebar is **hidden** on `/topics` and `/interview`, **shown** on `/questions/*`
- [ ] `/interview` empty state renders when no sessions exist
- [ ] **Random mode**: pick filters → start → session created with N random questions
- [ ] **Picked mode**: select specific questions → start → session uses exactly those
- [ ] First question's TTS plays automatically when session loads
- [ ] "Replay" button replays the prompt
- [ ] Start → STT records → partials show in transcript box
- [ ] Stop → editable transcript appears (verify Whisper-style mistranscriptions are correctable)
- [ ] Submit → evaluation + decision returns from Gemini
- [ ] Follow-up flow: AI asks a follow-up → new turn appears → TTS plays it
- [ ] Move-to-next: AI moves on → next DB question loads
- [ ] End-of-session: last question answered → session marked COMPLETED → redirect to summary
- [ ] "End session" button works mid-session (marks ABANDONED)
- [ ] **Resume across reload**: refresh during active session → state restored from DB
- [ ] Summary page shows avg score, per-turn evaluations (strengths/gaps), decision reasons
- [ ] Vietnamese mode: switch language → `vi-VN` voices appear → STT works in Vietnamese
- [ ] Switch AI provider to OpenAI mid-session (new session) → still works

## 3. Prisma migration cleanup (required before deploy)

The interview tables are in dev DB via `prisma db push` — **there is no migration file**. Before deploying:

1. Fix the pre-existing `20250525_add_domain_model` shadow-DB blocker:
   - Rename folder `20250525_add_domain_model` → `20260522074200_add_domain_model` (any timestamp after init)
   - Make its statements idempotent: `DROP INDEX IF EXISTS`, etc.
   - On prod, run once: `npx prisma migrate resolve --applied 20260522074200_add_domain_model`
2. Now `npx prisma migrate dev --name add_interview_session` will work — it'll diff dev DB vs. schema and generate the missing migration file.
3. Commit the migration file. Prod can then `prisma migrate deploy`.

## 4. Known limitations / nice-to-haves

Not blockers, but worth knowing:

- **No raw audio storage** — only text. If you want replay/grading-by-listening later, add a Blob column on `InterviewTurn` and upload audio to S3/Azure Blob.
- **LLM evaluation is non-streaming** — UI shows "Evaluating…" for ~1–2s. Could SSE-stream the response for a typewriter effect.
- **Token refresh is reactive** — checks age before each call, refreshes if >8 min. Proactive refresh on a timer would be slicker but the current approach works.
- **No retry** on transient Azure/Gemini failures. Add exponential backoff if you see flakes.
- **Voice list is hardcoded** in `src/lib/interview/constants.ts`. Could fetch the full Azure voice catalog at runtime.
- **No mid-session config changes** — can't add/remove questions or change voice after starting. Acceptable for v1.
- **Mobile UX not tested** — the STT button + textarea should work on mobile but the active session page hasn't been exercised on a touch device.

## 5. Files touched (for reference)

```
prisma/schema.prisma                               (added 2 models, 2 enums, relations)
src/lib/interview/                                 (new: types, constants, session.ts, ai/)
src/lib/validations/interview.ts                   (new)
src/app/api/interview/sessions/route.ts            (new: GET, POST)
src/app/api/interview/sessions/[id]/route.ts       (new: GET, PATCH)
src/app/api/interview/sessions/[id]/turns/route.ts (new: POST)
src/app/api/speech/token/route.ts                  (new: Azure token exchange)
src/app/(main)/interview/page.tsx                  (new: session list)
src/app/(main)/interview/new/page.tsx              (new: config)
src/app/(main)/interview/[sessionId]/page.tsx     (new: active room)
src/app/(main)/interview/[sessionId]/summary/page.tsx (new: post-session)
src/components/interview/azure-speech.ts           (new: Azure SDK wrapper)
src/components/interview/interview-room.tsx        (new: state machine UI)
src/components/interview/session-config-form.tsx   (new)
src/components/layout/header.tsx                   (modified: added nav item)
src/components/layout/sidebar.tsx                  (no change — reverted)
src/components/layout/conditional-sidebar.tsx      (new: hides sidebar outside /questions)
src/app/(main)/layout.tsx                          (modified: uses ConditionalSidebar)
package.json                                       (added microsoft-cognitiveservices-speech-sdk)
```
