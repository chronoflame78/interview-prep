# Domains — Requirements (as built)

> Reverse-engineered from the current implementation. Items that could not be confirmed from code
> are marked **Unknown / needs confirmation**.

## Feature overview

A **Domain** is a top-level content area (seeded as "Software Engineering", "Finance",
"Journalism"). Every user has exactly one `activeDomain`, and that choice scopes what they see:
questions and topics are filtered to the active domain, and newly created questions and topics are
stamped with it. Users pick a domain on first sign-in and can switch it later from their profile.

## Purpose / user problem

Without domains, one shared question pool would mix unrelated professions. Domains partition the
default content so a finance candidate never sees JavaScript questions, while keeping a single
account, a single admin surface, and a single codebase.

## Current functional requirements

### Domain catalogue

- **DOM-R1** — Domains are read-only from the application's perspective. There is **no create, update, or delete API and no admin UI** for domains. They exist only because `prisma/seed.ts` upserts them by `slug`.
- **DOM-R2** — The seed creates exactly three domains: `Software Engineering` (`software-engineering`), `Finance` (`finance`), `Journalism` (`journalism`).
- **DOM-R3** — `GET /api/domains` returns all domains as `{ id, name, slug }`, ordered by `name` ascending.
- **DOM-R4** — A domain has a unique `name` and a unique `slug`.

### Choosing a domain

- **DOM-R5** — A signed-in user with `activeDomainId === null` is redirected to `/domain-select` from any protected page (not from `/api/*` routes and not from public routes).
- **DOM-R6** — `/domain-select` presents every domain as a clickable card with an icon and name.
- **DOM-R7** — Icons are mapped by slug: `software-engineering` → book, `finance` → briefcase, `journalism` → newspaper. Any other slug falls back to the book icon.
- **DOM-R8** — Selecting a card calls `PUT /api/domains/active` with `{ domainId }`, then updates the JWT via NextAuth's `update({ activeDomainId })`, then navigates to `/questions` and refreshes.
- **DOM-R9** — While a selection is in flight, the chosen card is visually dimmed and further clicks on any card are ignored.

### Switching domains

- **DOM-R10** — `/profile` has an "Interview Domain" card with a dropdown listing every domain, showing the current one as selected.
- **DOM-R11** — Choosing a different domain calls the same `PUT /api/domains/active`, updates the session, optimistically patches the cached profile, revalidates the `/api/topics` SWR cache, and shows a "Domain switched" toast.
- **DOM-R12** — The dropdown is disabled while a switch is in flight or while the domain list has not loaded.
- **DOM-R13** — Switching a domain **does not** move, copy, or delete any existing content. Questions and topics keep the `domainId` they were created with.

### Domain display

- **DOM-R14** — The header shows a badge with the active domain's name. The badge is hidden on small screens (`md:` and up only) and renders nothing when the active domain cannot be resolved from the fetched list.

### Scoping effects

- **DOM-R15** — `GET /api/questions` and the `/questions` page scope results to the caller's active domain.
- **DOM-R16** — `GET /api/topics` returns topics whose `domainId` equals the caller's active domain (and which are either default or created by the caller).
- **DOM-R17** — `GET /api/subtopics` without a `topicId` scopes to sub-topics whose parent topic is in the active domain. **With** a `topicId` the domain filter is not applied.
- **DOM-R18** — `POST /api/questions` stamps the new question with the creator's active domain.
- **DOM-R19** — `POST /api/topics` stamps the new topic with the creator's active domain.
- **DOM-R20** — `POST /api/subtopics` does **not** set a domain; a sub-topic inherits its domain implicitly through its parent topic.
- **DOM-R21** — `PUT /api/questions/[id]` and `PUT /api/topics/[id]` do **not** change `domainId`. Editing content while in a different domain leaves the original domain intact.
- **DOM-R22** — The admin default-questions page scopes to the admin's active domain when one is set, and shows all default questions across domains when it is not.
- **DOM-R23** — Mock interview sessions record the creator's active domain on `InterviewSession.domainId`, and random question selection is scoped to it.
- **DOM-R24** — The shared-profile page scopes the owner's questions to **the owner's** active domain, not the viewer's.

## User flows

### First-time domain selection

1. New user registers or signs in with Google → `activeDomainId` is `null`.
2. Any navigation to a protected page is intercepted by middleware → `/domain-select`.
3. User clicks a domain card.
4. `PUT /api/domains/active` persists the choice.
5. `update({ activeDomainId })` writes it into the JWT.
6. Redirect to `/questions`, now showing that domain's content.

### Switching domain later

1. User opens `/profile`.
2. Changes the "Interview Domain" dropdown.
3. `PUT /api/domains/active` → session update → topics cache revalidated → toast.
4. The header badge and the sidebar topic list reflect the new domain; the questions list updates on the next navigation or refresh.

## Business rules

- **DOM-B1** — A user has at most one active domain at a time.
- **DOM-B2** — Any authenticated user may switch to any domain. There is no per-domain membership, entitlement, or role check.
- **DOM-B3** — Content is stamped with the domain that was active **at creation time** and never re-stamped.
- **DOM-B4** — `Question.domainId` and `Topic.domainId` are nullable, and the relation uses `onDelete: SetNull`. Deleting a domain would orphan its content rather than cascade-delete it (no such delete path exists in the app).
- **DOM-B5** — The seed backfills every user, topic, and question that has a null domain to "Software Engineering".

## Validation rules

`PUT /api/domains/active` performs its checks inline; there is no Zod schema for this endpoint.

| Check | Failure response |
|---|---|
| Session present | `401 { error: "Unauthorized" }` |
| `domainId` present and a string | `400 { error: "domainId is required" }` |
| Domain exists | `404 { error: "Domain not found" }` |

On success it returns `{ domainId, domainName }`.

## Permissions / access restrictions

| Action | Anonymous | `USER` | `ADMIN` |
|---|---|---|---|
| `GET /api/domains` | No `auth()` check in the handler — blocked only by middleware redirect | ✅ | ✅ |
| `PUT /api/domains/active` | `401` | ✅ any domain | ✅ any domain |
| Create / rename / delete a domain | ❌ — no such endpoint exists | ❌ | ❌ |
| `/domain-select` page | Redirected to `/login` | ✅ | ✅ |

## Error and failure behavior

- **DOM-E1** — `PUT /api/domains/active` with a missing or non-string `domainId` → `400`.
- **DOM-E2** — With an unknown `domainId` → `404`; the user's `activeDomainId` is left unchanged.
- **DOM-E3** — On `/domain-select`, a failed request leaves the user on the page with **no error message** — the failure branch only clears the "selecting" state. The card simply stops being dimmed.
- **DOM-E4** — On `/profile`, a failed switch shows a "Failed to switch domain" toast and the dropdown reverts to the previously cached value.
- **DOM-E5** — If `GET /api/domains` fails, `/domain-select` renders an empty grid below the heading (SWR error is not surfaced), the profile dropdown stays disabled, and the header badge is hidden.

## Important edge cases

- **DOM-X1** — **A user with no active domain sees only domain-less content, not all content.** `GET /api/topics` builds `where: { domainId: user?.activeDomainId, … }`. When that value is `null`, Prisma filters for `domainId IS NULL` rather than skipping the filter. `getQuestionsForUser`, by contrast, uses `...(domainId ? { domainId } : {})`, which *does* skip the filter. The two endpoints therefore behave differently for a domain-less user.
- **DOM-X2** — The middleware gate reads `activeDomainId` from the **JWT**, while API routes re-read it from the **database**. Until `update()` is called, or the user signs in again, these can disagree (see `authentication/requirements.md` AUTH-X5).
- **DOM-X3** — `/domain-select` is reachable directly even by a user who already has a domain; the middleware only forces the redirect *toward* it, never away from it. Visiting it and picking a domain is an alternative switch path.
- **DOM-X4** — Sub-topics are never stamped with a domain. A sub-topic's effective domain is whatever its parent topic's is, so moving a sub-topic to a topic in another domain (via `PUT /api/subtopics/[id]`, which accepts `topicId`) silently changes its domain.
- **DOM-X5** — Cross-domain references are not prevented. `POST /api/questions` accepts arbitrary `topicIds` / `subTopicIds` / `relatedQuestionIds` without checking that they belong to the active domain, so a question can be linked to a topic in a different domain.
- **DOM-X6** — After switching domains on `/profile`, the questions list is not revalidated — only `/api/topics` is. The sidebar updates immediately; the `/questions` page updates on the next navigation.
- **DOM-X7** — Because `PUT /api/questions/[id]` does not touch `domainId`, editing a question while a *different* domain is active keeps it in its original domain — so it will still be invisible from the currently active domain after saving.
- **DOM-X8** — The admin questions page falls back to "all domains" when `activeDomainId` is unset, unlike every other read path.
- **DOM-X9** — Deleting a domain is not possible through the app. **Unknown / needs confirmation:** what the product intends should happen to a domain's content if a domain were ever removed manually; the schema's `SetNull` would strand it in the domain-less bucket described in DOM-X1.

## Non-goals / not supported

- Creating, renaming, or deleting domains from the UI or API.
- Per-domain permissions, membership, or invitations.
- Viewing more than one domain at once, or a "show all domains" mode.
- Moving existing questions or topics between domains.
- Per-domain admins — `ADMIN` is global.
- Domain-specific branding beyond the three hard-coded icons.
- Remembering a per-domain filter/sort state.

## Acceptance criteria

- **AC-1** — `GET /api/domains` returns the three seeded domains sorted by name, each with `id`, `name`, `slug` only.
- **AC-2** — A signed-in user with `activeDomainId = null` cannot reach `/questions` without first choosing a domain.
- **AC-3** — Selecting a domain on `/domain-select` persists `User.activeDomainId` and lands the user on `/questions`.
- **AC-4** — `PUT /api/domains/active` returns `400` for a missing `domainId` and `404` for an unknown one, and leaves the stored value unchanged in both cases.
- **AC-5** — With domain A active, `/questions` shows only questions whose `domainId` is A (plus the user/default visibility rules); switching to B and refreshing shows only B's.
- **AC-6** — A question created while domain A is active has `domainId = A`, and remains `A` after being edited while domain B is active.
- **AC-7** — The header badge displays the active domain's name and disappears when no domain resolves.
- **AC-8** — Switching domains never deletes or reassigns existing questions, topics, or overrides.
</content>
