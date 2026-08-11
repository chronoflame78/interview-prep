# Profile Sharing — Requirements (as built)

> Reverse-engineered from the current implementation. Items that could not be confirmed from code
> are marked **Unknown / needs confirmation**.
>
> This document also covers the small profile-management surface (`/profile`), since the share link
> lives there and there is no other profile feature.

## Feature overview

A user can generate a share link containing a random 10-character slug. Anyone **who is signed in**
can open `/share/<slug>` and browse that user's personalized question collection read-only — the
questions they can see, with their customizations applied, in their active domain. The owner can
regenerate the slug at any time, which invalidates the previous link.

## Purpose / user problem

A user who has curated and customized a question set often wants to show it to a study partner,
mentor, or colleague. Sharing it should not require giving away account access, should not let the
recipient modify anything, and should not be a static export that goes stale.

## Current functional requirements

### Generating the link

- **PS-R1** — `POST /api/profile/share` generates a new slug with `nanoid(10)` and stores it on `User.shareSlug`.
- **PS-R2** — The endpoint returns `{ shareSlug }`.
- **PS-R3** — Calling it again **overwrites** the existing slug. There is no separate "regenerate" endpoint — generate and regenerate are the same call.
- **PS-R4** — Regenerating immediately invalidates the previous link; a request to the old slug returns "not found".
- **PS-R5** — New users have `shareSlug = null`; a link exists only after an explicit generate.

### Profile page

- **PS-R6** — `/profile` shows the user's email (read-only, disabled input), an editable name, the active-domain switcher, and the share card.
- **PS-R7** — When no slug exists, the share card shows a "Generate Share Link" button.
- **PS-R8** — Once a slug exists, the card shows the full URL in a read-only monospace input, a copy button, and a regenerate button.
- **PS-R9** — The displayed URL is built client-side as `${window.location.origin}/share/${shareSlug}`.
- **PS-R10** — The copy button writes the URL to the clipboard and shows a "Link copied to clipboard" toast.
- **PS-R11** — The card carries the explanatory text: "Share your customized question set with others. They'll need to be logged in to view it."
- **PS-R12** — `PUT /api/profile` updates the user's `name`.
- **PS-R13** — `GET /api/profile` returns `id`, `name`, `email`, `image`, `shareSlug`, `role`, `activeDomainId`, and the nested `activeDomain` (`id`, `name`, `slug`).

### Viewing a shared profile

- **PS-R14** — `/share/[slug]` resolves the slug to a user; an unknown slug renders the Next.js not-found page.
- **PS-R15** — The viewer must be signed in. An anonymous visitor is redirected to `/login`.
- **PS-R16** — The page heading is `<Owner name>'s Questions`, falling back to `"User"` when the owner has no name. The subheading reads "Viewing shared collection · N questions".
- **PS-R17** — The listed questions are the owner's **effective** collection: defaults plus their private questions, with their overrides applied and their hidden questions removed.
- **PS-R18** — Questions are scoped to **the owner's** active domain, not the viewer's.
- **PS-R19** — No filters are applied — the shared view always shows the unfiltered collection, subject to the default page size of 50.
- **PS-R20** — The list renders in `readOnly` mode: no star button, no edit link, no delete button.
- **PS-R21** — In `readOnly` mode a filled star icon is displayed for questions the **owner** marked important. Questions the owner did not star show nothing.
- **PS-R22** — Viewers can still expand cards to read answers, view related questions, and adjust the width and font-size controls.
- **PS-R23** — The shared page uses its own centered layout and does not render the app header or sidebar.

### JSON endpoint

- **PS-R24** — `GET /api/users/[slug]/questions` returns `{ user: { id, name, activeDomainId, activeDomain: { name } }, questions }` for the same data.
- **PS-R25** — It requires a session and returns `404 { error: "User not found" }` for an unknown slug.
- **PS-R26** — **No component in the application calls this endpoint.** It duplicates what the page already does server-side.

## User flows

### Share your collection
1. Owner opens `/profile`.
2. Clicks "Generate Share Link".
3. `POST /api/profile/share` → slug stored → SWR revalidates → the URL appears.
4. Clicks the copy button and sends the link to someone.

### View someone's collection
1. Recipient opens the link.
2. If signed out, they are redirected to `/login?callbackUrl=/share/<slug>`; after signing in they arrive at the shared page.
3. They see the owner's questions read-only, expand cards, and read answers.

### Invalidate a link
1. Owner opens `/profile` and clicks the regenerate (circular arrow) button.
2. A new slug replaces the old one.
3. Anyone holding the old link now gets a not-found page.

## Business rules

- **PS-B1** — `User.shareSlug` is unique across all users.
- **PS-B2** — A user has at most one active share link at a time.
- **PS-B3** — The shared view is a **live** view, not a snapshot — later edits by the owner are immediately visible to anyone with the link.
- **PS-B4** — Sharing exposes the owner's private questions and their personal customizations. It is not limited to default content.
- **PS-B5** — Sharing is read-only in every respect: no endpoint permits a viewer to modify the owner's data.
- **PS-B6** — The owner's stars are visible to viewers; the viewer's own stars are irrelevant on this page.
- **PS-B7** — There is no way to revoke a link outright — only to replace it with a new one.

## Validation rules

- **PS-V1** — `POST /api/profile/share` takes **no request body** and performs no validation beyond requiring a session.
- **PS-V2** — `PUT /api/profile` reads `name` from the body with **no validation whatsoever** — no schema, no type check, no length limit, no trimming.
- **PS-V3** — Passing a non-string `name` is forwarded straight to Prisma; omitting it entirely means `name: undefined`, which Prisma treats as "no change".
- **PS-V4** — The client-side name form does check `name.trim()` before submitting, so an empty name cannot be set through the UI.
- **PS-V5** — The slug format is fixed at `nanoid(10)` and is never validated on lookup — any string is simply looked up and misses.

## Permissions / access restrictions

| Action | Anonymous | Signed-in viewer | Owner |
|---|---|---|---|
| `GET /api/profile` | `401` | own profile only | own profile |
| `PUT /api/profile` | `401` | own name only | ✅ |
| `POST /api/profile/share` | `401` | own slug only | ✅ |
| View `/share/<slug>` | redirect to `/login` | ✅ any valid slug | ✅ |
| `GET /api/users/<slug>/questions` | `401` | ✅ any valid slug | ✅ |
| Modify anything on a shared page | ❌ | ❌ | ❌ (read-only view) |

- **PS-P1** — Every profile endpoint scopes to `session.user.id`; there is no way to read or write another user's profile.
- **PS-P2** — Any signed-in user can view any share link they possess. There is no allow-list, no per-viewer permission, and no owner approval.
- **PS-P3** — Admins have no special access to share links.

## Error and failure behavior

- **PS-E1** — Unauthenticated API calls → `401 { error: "Unauthorized" }`.
- **PS-E2** — Unknown slug on `/share/[slug]` → `notFound()` → the app's not-found page.
- **PS-E3** — Unknown slug on the JSON endpoint → `404 { error: "User not found" }`.
- **PS-E4** — Failed generate → toast "Failed to generate link".
- **PS-E5** — Failed name update → toast "Failed to update".
- **PS-E6** — A `nanoid` collision on the unique `shareSlug` column would raise an unhandled Prisma error → `500`. No retry logic exists.
- **PS-E7** — The clipboard write is not wrapped in error handling; the success toast fires regardless of whether the write succeeded.

## Important edge cases

- **PS-X1** — **The share page is not public.** Despite being called "sharing", `/share/[slug]` redirects anonymous visitors to `/login`. A recipient without an account cannot view the collection at all. The UI does disclose this, but it substantially limits the feature.
- **PS-X2** — **The shared view is capped at 50 questions** by the default page size in `getQuestionsForUser`, with no pagination and no indication that anything was truncated. An owner with a large collection shares only part of it.
- **PS-X3** — **Slug knowledge is the only access control.** Anyone signed in who obtains the URL — forwarded, pasted, or logged in an intermediary — has full read access.
- **PS-X4** — **There is no revoke.** Regenerating replaces the slug, but the user cannot clear it and return to having no link.
- **PS-X5** — Sharing exposes private questions and personal overrides (PS-B4), which may be more than the owner expects from a button labelled "Share Profile".
- **PS-X6** — The star icons on a shared page reflect the **owner's** priorities, but nothing on the page explains that; a viewer could reasonably read them as their own.
- **PS-X7** — If the owner switches domain, the shared link silently begins showing a different collection.
- **PS-X8** — If the owner has never selected a domain, `getQuestionsForUser` receives `null` and the domain filter is skipped entirely, so the shared page shows their questions **across all domains**.
- **PS-X9** — `GET /api/users/[slug]/questions` is unused by the app (PS-R26) and returns the owner's `id` — an internal identifier not otherwise exposed to other users.
- **PS-X10** — `PUT /api/profile` has no validation (PS-V2). A direct API call can set `name` to an empty string, a very long string, or a non-string value.
- **PS-X11** — Updating the name calls `updateSession({ name })`, but the NextAuth `jwt` callback only handles `activeDomainId` on update. The header may continue showing the old name. See [`../authentication/`](../authentication/) AUTH-X3.
- **PS-X12** — The profile name input uses `value={name || profile?.name || ""}`, so clearing the field falls back to displaying the stored name rather than showing an empty box.
- **PS-X13** — The share URL is computed from `window.location.origin`, so a link generated while browsing a preview deployment carries that deployment's host.
- **PS-X14** — There is no share management view: the owner cannot see whether their link has ever been opened, by whom, or how often.
- **PS-X15** — `QuestionList` in `readOnly` mode still renders the width and font controls, and `QuestionCard` still registers its `hashchange` / `question:focus` listeners, so related-question navigation works within a shared page.
- **PS-X16** — Related-question links on a shared page point at `/questions#q-<id>` — the **viewer's** own question list — not at the shared collection. Following one leaves the shared view entirely and usually finds nothing.

## Non-goals / not supported

- Truly public (no-login) sharing.
- Revoking a link without replacing it.
- Expiring links or time-limited access.
- Password-protected or per-recipient links.
- Multiple simultaneous links, or per-link scoping (e.g. "share only my JavaScript questions").
- Choosing what to share — the shared set is always the owner's full effective collection.
- Filters, search, or pagination on the shared page.
- Access logs or view counts.
- Copying a shared question into your own collection.
- Commenting or collaboration.
- Sharing anything other than questions (topics and interview sessions are not shared).
- Editing your email or password on the profile page.

## Acceptance criteria

- **AC-1** — `POST /api/profile/share` sets a 10-character `shareSlug` and returns it.
- **AC-2** — Calling it twice produces a different slug; the first link then renders not-found.
- **AC-3** — An anonymous request to `/share/<valid slug>` redirects to `/login` with the share path as `callbackUrl`.
- **AC-4** — A signed-in viewer at `/share/<valid slug>` sees the owner's effective collection: defaults plus the owner's private questions, with the owner's overrides applied and hidden questions absent.
- **AC-5** — The shared page shows no star buttons, edit links, or delete buttons.
- **AC-6** — A question the owner starred shows a filled star; one they did not shows none — independent of the viewer's own stars.
- **AC-7** — `/share/<unknown slug>` renders the not-found page and does not leak whether any user exists.
- **AC-8** — Questions on the shared page are scoped to the **owner's** active domain even when the viewer's differs.
- **AC-9** — `GET /api/users/<slug>/questions` returns the same question set as the page for the same slug.
- **AC-10** — No request originating from the shared page can modify the owner's data.
</content>
