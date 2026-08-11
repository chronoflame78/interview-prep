# Question Overrides — Requirements (as built)

> Reverse-engineered from the current implementation. Items that could not be confirmed from code
> are marked **Unknown / needs confirmation**.

## Feature overview

An **override** lets a user personalize an admin-authored default question **without mutating the
shared row**. The user edits the question or answer text, or changes the difficulty, and those
changes are stored in a separate `UserQuestionOverride` row keyed by `(userId, questionId)`. Every
read merges the original with the user's override field by field. The user can reset at any time,
restoring the admin's original exactly.

The schema also supports hiding a default question via `isHidden`, but **no UI sets that flag**.

## Purpose / user problem

Default questions are shared across every user in a domain. A user who disagrees with a model
answer, wants to add their own notes, or prefers different wording needs to change what they see —
without changing what everyone else sees, and without losing the ability to go back. Copying the
question into a private one would fork it permanently and duplicate the collection; an override
keeps a live link to the original.

## Current functional requirements

### Creating and updating an override

- **OV-R1** — `PUT /api/questions/[id]/override` creates or updates the calling user's override for that question. It is an upsert on the `(userId, questionId)` unique key.
- **OV-R2** — Overrides are permitted **only on default questions**. If the target does not exist, or has `isDefault = false`, the API returns `400 { error: "Can only override default questions" }`.
- **OV-R3** — Overridable fields are: `question`, `questionVn`, `questionCus`, `answer`, `answerVn`, `answerCus`, `difficulty`, `isHidden`. Topics, sub-topics, and related questions are **not** overridable.
- **OV-R4** — All override fields are optional. Any field omitted from the request body is left untouched on an update.
- **OV-R5** — The API returns the stored override row on success.

### Reaching the override editor

- **OV-R6** — `/questions/[id]/edit` renders in override mode when the question is a default **and** the current user is not its creator. Otherwise it renders in direct-edit mode.
- **OV-R7** — In override mode the page heading reads "Customize Question" with the subtitle "Your changes will only be visible to you." Direct-edit mode reads "Edit Question" / "Update your question details."
- **OV-R8** — In override mode the form shows only the language tabs (question and answer per language) and the difficulty selector. Topics, sub-topics, related questions, and the `isDefault` checkbox are hidden.
- **OV-R9** — The form is pre-filled with the **effective** (already merged) content, so a user editing an existing override sees their own version, not the admin's original.
- **OV-R10** — Saving in override mode submits the six content fields plus `difficulty`. Empty Vietnamese, Custom, and answer fields are sent as `null`; the English question body is sent as-is.
- **OV-R11** — On success the toast reads "Override saved" and the user returns to `returnTo`.

### Merging

- **OV-R12** — For each overridable field, the effective value is `override.<field> ?? original.<field>` — nullish coalescing. A `null` override field falls back to the original.
- **OV-R13** — The merge is applied by `getQuestionsForUser` (lists, export, shared profiles) and `getQuestionForUser` (single question, edit form).
- **OV-R14** — `isDefault`, `createdBy`, `createdAt`, `updatedAt`, topics, sub-topics, and related questions always come from the original — an override never affects them.
- **OV-R15** — Merged fields participate in filtering and sorting: a question whose difficulty was overridden to `HARD` is returned by `?difficulty=HARD`, and search matches the overridden text.
- **OV-R16** — A question with any override row gets `hasOverride: true` in the read model.

### Hiding

- **OV-R17** — When an override has `isHidden = true`, the question is dropped from `getQuestionsForUser` results entirely — it disappears from the list, the export, and any shared view of that user's collection.
- **OV-R18** — `getQuestionForUser` does **not** apply the hidden check, so a hidden question is still readable by direct id.
- **OV-R19** — **No UI ever sets `isHidden`.** The field is accepted by the API schema and honoured on read, but nothing in the application sends it. Hiding is reachable only by calling the API directly. **Unknown / needs confirmation:** whether hiding was intended to ship and the UI was dropped, or whether the field is speculative.

### Resetting

- **OV-R20** — `DELETE /api/questions/[id]/override` removes the calling user's override for that question, restoring the admin original.
- **OV-R21** — The delete is a `deleteMany` and always returns `200 { success: true }`, whether or not an override existed.
- **OV-R22** — Two UI paths reach the reset: a "Reset to Default" button in the override form (shown only when `question.hasOverride`), and the trash icon on a customized default card in the list.
- **OV-R23** — The form's reset confirms with "Reset to the original default question?"; the list's reset confirms with "Reset to default?".
- **OV-R24** — Both show the toast "Override removed" and refresh.

### Display

- **OV-R25** — A question with an override shows a "Customized" badge (pencil icon) on its card.
- **OV-R26** — On a customized default the trash icon is shown even to non-admins, because it resets rather than deletes.

## User flows

### Customize a default question

1. User finds a default question on `/questions` and clicks the pencil icon.
2. `/questions/[id]/edit` detects `isDefault && createdBy !== me` → override mode.
3. The form pre-fills with the effective content; topic and relation controls are absent.
4. User rewrites the answer and saves.
5. `PUT /api/questions/[id]/override` upserts the row.
6. Toast "Override saved"; back on `/questions` the card shows the new answer and a "Customized" badge.
7. Other users see the admin's original, unchanged.

### Reset a customization

1. On the customized card the user clicks the trash icon.
2. Confirm "Reset to default?".
3. `DELETE /api/questions/[id]/override`.
4. Toast "Override removed"; the card reverts to the admin's text and loses the "Customized" badge.

### Admin updates a default that users have customized

1. Admin edits default D via `PUT /api/questions/[id]`, changing both question and answer.
2. A user who had overridden **only the answer** now sees the admin's **new question** with **their own** answer — the merge is per field, not per row.

## Business rules

- **OV-B1** — An override never mutates the `Question` row. Admin content and user customization are physically separate.
- **OV-B2** — At most one override row exists per `(userId, questionId)`, enforced by a unique constraint.
- **OV-B3** — Overrides apply only to default questions. A user's own private question is edited directly instead.
- **OV-B4** — Merging is per field, so an admin edit to a field the user has not overridden is still seen by that user.
- **OV-B5** — Deleting the question cascades the override away (`onDelete: Cascade` on `originalQuestion`).
- **OV-B6** — Deleting the user cascades their overrides away (`onDelete: Cascade` on `user`).
- **OV-B7** — Overrides are not domain-scoped in their own right; they inherit scope from the question they point at.
- **OV-B8** — An override is invisible to everyone but its owner — **except** through that owner's shared profile, which renders their effective (overridden) collection to any signed-in viewer.

## Validation rules

`overrideSchema` in `src/lib/validations/question.ts`:

| Field | Rule |
|---|---|
| `question`, `questionVn`, `questionCus`, `answer`, `answerVn`, `answerCus` | optional, nullable string |
| `difficulty` | optional, nullable enum `EASY` \| `MEDIUM` \| `HARD` |
| `isHidden` | optional boolean |

- **OV-V1** — Every field is optional, so `PUT` with an empty body `{}` is valid and creates an all-null override row.
- **OV-V2** — There is **no minimum length on the question body**, unlike `questionSchema`. An override may set the question text to `""`.
- **OV-V3** — Validation failure returns `400` with the first Zod issue message.
- **OV-V4** — The client-side "Question content is required" guard in `QuestionForm` still applies in override mode, since it runs before the mode branch.

## Permissions / access restrictions

| Action | Anonymous | `USER` | `ADMIN` |
|---|---|---|---|
| Create/update own override on a default | `401` | ✅ | ✅ |
| Override a non-default question | – | `400` | `400` |
| Delete own override | `401` | ✅ | ✅ |
| See or affect another user's override | – | ❌ (no endpoint exposes it) | ❌ |
| Reach override mode in the UI | – | on any default | only on defaults they did not create |

- **OV-P1** — The override endpoints scope every operation to `session.user.id`. There is no admin path to read, edit, or clear another user's override.
- **OV-P2** — `PUT` does **not** verify that the caller can actually see the question (its domain, for instance) — only that it exists and is a default.

## Error and failure behavior

- **OV-E1** — No session → `401 { error: "Unauthorized" }`.
- **OV-E2** — Unknown id **or** non-default question → `400 { error: "Can only override default questions" }`. Note this conflates "not found" with "not a default"; there is no `404` on this route.
- **OV-E3** — Invalid body → `400` with the first Zod message.
- **OV-E4** — `DELETE` never fails on a missing override; it returns `200` regardless.
- **OV-E5** — Save failure in the form → toast with the server's `error`, falling back to "Failed to save"; the form stays open.
- **OV-E6** — Reset failure in the form → toast "Failed to reset".
- **OV-E7** — Reset failure from the list → toast "Something went wrong".

## Important edge cases

- **OV-X1** — **You cannot override a field to be empty.** Because the merge uses `??`, storing `null` means "fall back to the original". A user who clears the Vietnamese answer is sending `null`, so the admin's Vietnamese answer reappears. Clearing a field is indistinguishable from never having overridden it.
- **OV-X2** — **Except for the English question body**, which the form sends raw rather than `|| null`. An empty string is not nullish, so `"" ?? original` yields `""` — the English question *can* be blanked, producing a card with an empty title. This asymmetry is accidental.
- **OV-X3** — **Saving without changing anything still creates an override row**, because the form always sends all seven fields. The card then shows "Customized" even though the content is identical to the original.
- **OV-X4** — After an admin edits a default, a user's override silently continues to apply to whichever fields it covers. There is no notification, no diff, and no "the original changed" indicator.
- **OV-X5** — `hasOverride` is `true` whenever a row exists, even if every field in it is `null` — so the "Customized" badge can appear on a question that is byte-identical to the original.
- **OV-X6** — **The hidden flag is a dead feature path in the UI** (OV-R19). It works end to end on the read side but has no writer.
- **OV-X7** — `getQuestionForUser` ignores `isHidden` (OV-R18), so a hidden question remains reachable at `/questions/[id]/edit` and via `GET /api/questions/[id]`. The list and the detail view disagree.
- **OV-X8** — An **admin who created a default edits it directly**; an admin who did not gets override mode (see [`../questions-management/`](../questions-management/) Q-X8). So two admins can experience the same question differently.
- **OV-X9** — `/admin/questions` hard-codes `hasOverride: false` and does not merge overrides, so an admin viewing default questions there sees the originals even where they have personally customized them — inconsistent with `/questions`.
- **OV-X10** — Overrides survive a domain switch. If a question's domain changes (only possible via direct database edit), the override follows the question.
- **OV-X11** — The mock interview resolves overrides **independently**, with its own inline `?? ` merges in `src/lib/interview/session.ts`, rather than reusing `getQuestionForUser`. It merges only `question`, `questionVn`, `answer`, `answerVn`, `difficulty` — and it does **not** honour `isHidden`, so a hidden question can still be asked in an interview.
- **OV-X12** — Override rows are never cleaned up when they become no-ops. There is no garbage collection of all-null overrides.
- **OV-X13** — If an admin flips a question from `isDefault = true` to `false`, existing override rows remain but become unreachable through the API (`PUT` would now `400`), while the merge on read still applies them.

## Non-goals / not supported

- Overriding topics, sub-topics, or related questions.
- Hiding a question from the UI (schema-supported, no UI).
- Seeing a diff between your version and the admin's original.
- Being notified when the underlying default changes.
- Sharing an override with another user, or an admin promoting a user's override into the default.
- Per-field reset — reset is all-or-nothing.
- Override history or undo beyond the single reset.
- Overriding a private question (edit it directly instead).
- Bulk reset of all overrides.

## Acceptance criteria

- **AC-1** — `PUT /api/questions/<default>/override` with a changed answer creates one `UserQuestionOverride` row and leaves the `Question` row byte-identical.
- **AC-2** — After that call, the owner's `/questions` shows the new answer and a "Customized" badge, while a second user's `/questions` shows the admin's original with no badge.
- **AC-3** — `PUT /api/questions/<private>/override` returns `400 { error: "Can only override default questions" }`.
- **AC-4** — `DELETE /api/questions/<id>/override` restores the original exactly, removes the badge, and returns `200` even when no override existed.
- **AC-5** — Overriding only `difficulty` leaves all six text fields resolving to the admin's originals.
- **AC-6** — After an admin changes a default's question text, a user who overrode only the answer sees the admin's new question with their own answer.
- **AC-7** — An override with `isHidden = true` removes the question from that user's list and export, and from their shared profile, while leaving it visible to everyone else.
- **AC-8** — A question whose difficulty is overridden to `HARD` is returned by `GET /api/questions?difficulty=HARD` for that user and not for others.
- **AC-9** — The override form never renders topic, sub-topic, related-question, or `isDefault` controls.
- **AC-10** — One user's override is never visible to another user through any list, detail, or export endpoint (the shared-profile view being the documented exception, OV-B8).
</content>
