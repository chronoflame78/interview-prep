---
name: feature-spec
description: Produce or amend requirements/design/testcases specification documents for a new or changed non-trivial feature, then stop for human approval before writing any implementation code. Use when asked to add, build, implement, design, extend, modify, change, or rework a feature, and whenever a change — however small — would contradict what docs/features/ currently states. Skip only when nothing under docs/features/ describes the behavior being changed: typo fixes, styling tweaks, config changes, crash fixes, and refactors that leave documented behavior and structure intact.
---

# Feature specification workflow

Before writing implementation code for a non-trivial feature — new **or** changed — the three
specification documents must be current and approved.

```
docs/features/<feature-name>/
  requirements.md
  design.md
  testcases.md
```

Use a descriptive kebab-case folder name: `user-notifications`, `password-reset`,
`export-reports`, `team-invitations`.

## When this applies

**Diff size is not the test. Documentation impact is.** A three-line change can invalidate a page of
documentation; a large refactor can invalidate none. Ask two questions, in order.

**1. Does the change add a new user-visible capability, data model, API surface, or integration?**

Yes → the full workflow below, ending at the Step 5 approval gate.

**2. Does it change behavior or structure that `docs/features/` currently states?**

Read the relevant folder to find out — do not answer from memory, and do not assume a small fix is
undocumented. Then:

| | |
|---|---|
| Substantial change | Full workflow. Amend the affected documents, stop for approval. |
| Small fix that contradicts a document | Fix it **and** correct the contradicted lines in the same change. No approval gate — but state what you amended. |
| Nothing documented contradicts it | Just do it. |

**Genuinely exempt**, because no document describes them: typo fixes, small styling adjustments,
configuration changes, crash fixes for cases the docs never claimed worked, and refactors that leave
documented behavior *and* documented structure intact.

That last qualifier matters: `design.md` describes structure, so a refactor with zero behavior change
can still make it wrong. Extracting a shared helper invalidates a sentence saying the logic is
duplicated in three places. Correct the sentence.

> **Specific to this repo:** the eight existing folders deliberately pin known-wrong behavior as
> current behavior — the HTML-matching search, the 50-item cap, the non-functioning debounce, the
> `500` on a duplicate topic name, the missing sanitization. Fixing any of them is a small diff that
> contradicts documented assertions, including test cases written to lock the behavior in. Those are
> amendments, not exempt fixes.

If it is genuinely ambiguous, ask rather than guessing — the cost of a needless spec is wasted time,
but the cost of skipping one is unreviewed code and documentation that quietly starts lying.

### Which path

| Situation | What to do |
|---|---|
| Changing a feature that has docs under `docs/features/<name>/` | **Amend those three files in place.** Do not create a second folder. |
| New capability, large enough to stand alone | Create a new `docs/features/<name>/` folder. |
| Changing an area with no docs yet | Ask which is wanted: document the current behavior first, then amend; or write a fresh set covering only the new scope. Do not silently pick. |

A change that spans several documented features amends each affected folder, and says so in the
approval summary.

## Reference examples

`docs/features/` already contains eight documented features (`authentication`, `domains`,
`questions-management`, `question-overrides`, `topics-subtopics`, `profile-sharing`,
`mock-interview`, `rich-text-editor`). **Read at least one full set before writing or amending
one** — match their structure, depth, heading style, and ID conventions. They are the format
specification.

Those eight describe behavior that already exists. A spec for new work describes intended behavior
instead. The shape is the same, the tense is not — and once the work ships, an amended document is
back to describing what the system does.

---

## Step 1 — Understand the existing codebase

Before writing any specification:

- Inspect the parts of the codebase the feature will touch.
- Understand the current architecture, conventions, folder structure, patterns, and dependencies.
- Identify existing components, hooks, services, utilities, APIs, stores, schemas, and abstractions
  **that should be reused**.
- Inspect related tests.
- Read the relevant feature docs under `docs/features/` for anything the new work integrates with.

Prefer existing project conventions over introducing new patterns. Avoid unnecessary dependencies
and avoid architectural changes that the feature does not require. The feature should fit naturally
into the codebase as it already is.

## Step 2 — Write `requirements.md`

What the feature should do, from a product and behavior perspective.

Include: feature overview · purpose / problem being solved · functional requirements · user flows ·
business rules · validation rules · permissions and roles (if applicable) · error and failure
behavior · important edge cases · non-goals · acceptance criteria.

- Requirements must be **specific and testable**.
- Use requirement IDs so tests can reference them: `REQ-001`, `REQ-002`, … or a feature-scoped
  prefix matching the existing docs' style.
- Avoid implementation detail unless it is an explicit constraint.
- Mark anything genuinely unclear as **Needs confirmation**. Do not silently invent product
  behavior — an invented requirement that reaches implementation is worse than a flagged gap.

## Step 3 — Write `design.md`

How the feature integrates into the existing system.

Include: relevant existing architecture · proposed implementation approach · existing files and
modules being reused · new files and modules to create · components, hooks, services, utilities,
stores, modules involved · data flow · state management · API changes or new API usage · important
types and interfaces · database and data-model changes · persistence and caching behavior ·
authentication and authorization implications · error handling · external dependencies · integration
with existing features · important technical decisions and trade-offs.

- Reference actual or proposed file paths.
- Use Mermaid diagrams where they genuinely clarify a flow. Skip them where prose is clearer.
- Prefer the **simplest design** that satisfies the requirements and matches the current codebase.
- Do not redesign unrelated parts of the system.

## Step 4 — Write `testcases.md`

How the feature will be verified.

Include: happy paths · validation cases · error cases · boundary and edge cases · authentication and
authorization cases · loading states · empty states · API and network failure scenarios ·
regression-sensitive behavior.

For each important case:

```
TC-001
Related requirements: REQ-001, REQ-002
Test level: Unit | Integration | E2E
Scenario:
Preconditions:
Steps:
Expected result:
```

Aim for every important requirement to have appropriate coverage.

Note the current state of testing in this repo when writing the plan: there is **no test runner and
no automated tests** (`package.json` has no `test` script; no `*.test.*` or `*.spec.*` files exist).
If the feature warrants automated tests, say so explicitly in the document — including what would
need to be installed — rather than assuming a harness is available.

## Steps 2–4 when amending an existing feature

Same three documents, same approval gate — but edit rather than rewrite. Read the existing set in
full first; a change described against a misremembered baseline is worse than no change.

**Amend, don't replace.** Keep untouched sections untouched. A reviewer should be able to diff the
folder and see only what the change actually affects.

**Requirement IDs are stable identifiers.** Never renumber them — `testcases.md`, and possibly other
features' docs, reference them by ID.

- New behavior → a new ID continuing the existing sequence.
- Changed behavior → edit that requirement in place, keeping its ID.
- Removed behavior → keep the ID and mark it removed with a one-line reason, rather than deleting
  the line. A silently vanished requirement is indistinguishable from an oversight.

**Keep the three documents in step.** A new or changed requirement needs matching test cases; a
removed one needs its test cases removed or retargeted. `design.md` gets the same treatment —
update the affected data flow, types, and file references, and leave the rest alone.

**Edge cases and non-goals move too.** A change often converts a documented non-goal into a
requirement, or an edge case into settled behavior. Move the line rather than leaving a document
that contradicts itself.

**`Observed Technical Debt` is a record of the current implementation.** Leave it alone unless the
change resolves an item — then strike that item and note the change that fixed it. Do not add
aspirational entries there.

## Step 5 — Stop for human review

**This is a mandatory approval gate** for the full workflow — new capabilities and substantial
changes. It does not apply to the small-fix-plus-amendment path in *When this applies*, where the fix
and the corrected lines land together and the summary just reports what moved.

After creating or amending the three documents, STOP. Do not implement the feature yet.

Do not: modify application code · add production components · add API routes · add database
migrations · install dependencies · write automated tests · refactor unrelated code.

Provide a short summary containing:

- documents created or amended
- main design decisions
- assumptions made
- questions requiring confirmation
- notable risks or dependencies

**When amending, state the change as a diff, not a description.** A reviewer cannot approve "updated
requirements.md". List what moved:

```
docs/features/questions-management/
  requirements.md  + Q-R59, Q-R60 (cursor pagination)
                   ~ Q-R40 (page size now caller-controlled)
                   − Q-X3 (no pagination UI) — resolved by this change
  design.md        ~ read core, API surface; + new types
  testcases.md     + TC-Q70..TC-Q74   ~ TC-Q33 (cap no longer applies)
```

Then wait. Implementation begins only on explicit approval — for example, "Approved. Implement it."

## Step 6 — Implement, after approval

Once approved:

1. Re-read all three documents. Treat them as the source of truth.
2. Implement according to the approved requirements and design.
3. Add automated tests based on `testcases.md`, to the extent a harness exists or the spec called
   for adding one.
4. Reuse existing project patterns and abstractions.
5. Run relevant tests, linting, formatting, and type checking.
6. Verify the implementation against the acceptance criteria and test cases.

If you discover mid-implementation that the approved specification needs a significant change: do
not silently diverge. Explain the issue, update the relevant document, and request approval before
proceeding with the deviation.

---

## Retroactively documenting undocumented code

Distinct from the workflow above: this is for capturing a feature that already exists and has no
docs, with **no change being made to it**.

Do not do this unprompted — it is a large amount of work and is only useful when asked for. When
asked:

- Describe what the code **currently does**, not what it should do. Prefer implementation evidence
  over assumption, and do not infer behavior from a filename.
- Mark anything you cannot confirm from the code as **Unknown / needs confirmation**.
- Keep known problems out of the main description and in a separate `Observed Technical Debt`
  section at the end of `design.md`, so the current design is described straight.
- Change no application code, and add no tests.

The eight existing folders under `docs/features/` were produced this way and are the reference for
tone and depth.
