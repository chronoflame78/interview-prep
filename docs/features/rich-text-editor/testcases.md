# Rich Text Editor — Test Cases

> Verification plan for **current** behavior. Requirement IDs refer to
> [`requirements.md`](./requirements.md).

## Existing automated tests

**None.** No test runner is installed and no test files exist in the repository.

Note that TipTap/ProseMirror components need a real DOM. A `jsdom` environment covers most of it, but
selection-dependent and drag-dependent behavior generally needs a browser — those cases are marked
E2E below.

## Happy path

### TC-E01 — Editor mounts and emits HTML
- **Requirements:** RT-R1, R4 · AC-1
- **Level:** Unit (component)
- **Steps:** Render `TipTapEditor` with empty content and type "Hello".
- **Expected:** `onChange` fires with HTML containing `<p>Hello</p>`; the toolbar and a content area at least 120px tall are present.

### TC-E02 — Placeholder shown when empty
- **Requirements:** RT-R2
- **Level:** Unit (component)
- **Steps:** Render with `content: ""` and `placeholder: "Enter the question..."`.
- **Expected:** The placeholder text is exposed via the `data-placeholder` attribute on the empty first paragraph and rendered by the CSS pseudo-element.

### TC-E03 — Initial content is loaded
- **Requirements:** RT-B4
- **Level:** Unit (component)
- **Steps:** Render with `content: "<p>Existing <strong>bold</strong></p>"`.
- **Expected:** The document shows the text with the bold mark applied.

### TC-E04 — Inline formatting round-trip
- **Requirements:** RT-R6 · AC-2
- **Level:** Unit (component)
- **Steps:** Type text, select it, then click bold, italic, underline, and strikethrough in turn.
- **Expected:** The emitted HTML contains `<strong>`, `<em>`, `<u>`, and `<s>` (or the marks TipTap emits for each); each button shows an active state while the cursor is inside its mark.

### TC-E05 — Headings and blocks
- **Requirements:** RT-R7, R8, R9 · AC-2
- **Level:** Unit (component)
- **Steps:** Apply H1, H2, H3, bullet list, ordered list, and blockquote.
- **Expected:** `<h1>`, `<h2>`, `<h3>`, `<ul><li>`, `<ol><li>`, `<blockquote>` respectively; the corresponding button is active in each case.

### TC-E06 — Inline code vs. code block
- **Requirements:** RT-R10, R11
- **Level:** Unit (component)
- **Steps:** Apply inline code to a selection; separately create a code block.
- **Expected:** `<code>` inline; `<pre><code …>` for the block, carrying the classes `bg-muted rounded-md p-4 font-mono text-sm` (RT-R19).

### TC-E07 — Undo and redo
- **Requirements:** RT-R12
- **Level:** Unit (component)
- **Steps:** Type, click undo, then redo.
- **Expected:** The document reverts and then returns; `onChange` fires at each step.

### TC-E08 — Author a code block end to end
- **Requirements:** RT-R15, R16 · AC-3
- **Level:** E2E
- **Steps:** In the answer editor, insert a code block, set the language to SQL, type `SELECT * FROM users;`, save, then expand the question card.
- **Expected:** Highlighted in the editor as SQL; the stored HTML carries `language-sql`; the card shows the same code with `hljs` and tokenized spans.

## Code-block language cases

### TC-E09 — Language dropdown enablement
- **Requirements:** RT-R17 · AC-5
- **Level:** Unit (component)
- **Steps:** Place the cursor outside a code block, then inside one.
- **Expected:** Disabled and labelled "Language" outside; enabled and labelled with the block's language inside.

### TC-E10 — Changing the language
- **Requirements:** RT-R16
- **Level:** Unit (component)
- **Steps:** Inside a code block, pick each of the nine languages in turn.
- **Expected:** `updateAttributes("codeBlock", { language })` is called; the emitted HTML carries the matching `language-*` class; the radio item shows as selected.

### TC-E11 — Blocks with no language default to TypeScript
- **Requirements:** RT-R18, RT-R27 · AC-4
- **Level:** Unit (component)
- **Steps:** Create a code block without setting a language, and separately render `HighlightedHtml` with `<pre><code>const x: number = 1;</code></pre>`.
- **Expected:** The dropdown reads "TypeScript" via the `?? "typescript"` fallback; the renderer highlights it as TypeScript. **Both halves must agree** — this is the contract flagged in `design.md`.

### TC-E12 — The two defaults are the same value
- **Requirements:** RT-B2
- **Level:** Unit (static)
- **Steps:** Assert that the editor's configured `defaultLanguage` and the renderer's `DEFAULT_LANGUAGE` are equal.
- **Expected:** Both `"typescript"`. Since only a comment enforces this today, an explicit assertion is the cheapest available guard.

### TC-E13 — JavaScript highlights under the TypeScript grammar
- **Requirements:** RT-R18
- **Level:** Unit
- **Steps:** Highlight `function add(a, b) { return a + b; }` as TypeScript.
- **Expected:** Keywords tokenized correctly — confirms the superset claim that justifies the default.

### TC-E14 — Unregistered language class falls back
- **Requirements:** RT-R27, RT-E3
- **Level:** Unit (component)
- **Steps:** Render `HighlightedHtml` with `<pre><code class="language-brainfuck">…</code></pre>`.
- **Expected:** `lowlight.registered()` returns false, so it is highlighted as TypeScript rather than throwing or auto-detecting.

### TC-E15 — Language class parsing
- **Requirements:** RT-R27
- **Level:** Unit (of `languageOf`)
- **Steps:** Test class strings `"language-sql"`, `"hljs language-python"`, `"foo language-css bar"`, `"nolanguage"`, and `""`.
- **Expected:** `sql`, `python`, `css`, then the TypeScript default for the last two. Confirms the `(?:^|\s)language-(\S+)` regex.

### TC-E16 — Renderer accepts languages the toolbar does not offer
- **Requirements:** RT-X5
- **Level:** Unit
- **Steps:** Render a block with `language-rust` (registered in lowlight's common set but absent from the toolbar's nine).
- **Expected:** Highlighted as Rust. Documents the asymmetry between authoring and rendering.

## Table cases

### TC-E17 — Insert a table
- **Requirements:** RT-R20 · AC-6
- **Level:** Unit (component)
- **Steps:** Click the table menu → "Insert table".
- **Expected:** A 3×3 table with a header row; the emitted HTML contains `<table>`, `<th>`, and `<td>`.

### TC-E18 — Table actions disabled outside a table
- **Requirements:** RT-R21 · AC-6
- **Level:** Unit (component)
- **Steps:** Open the table menu with the cursor outside a table.
- **Expected:** Every item except "Insert table" is disabled.

### TC-E19 — Row and column operations
- **Requirements:** RT-R20
- **Level:** Unit (component)
- **Steps:** Inside a table, exercise add row above/below, delete row, add column left/right, delete column.
- **Expected:** The table's dimensions change accordingly after each action.

### TC-E20 — Header toggle and merge/split
- **Requirements:** RT-R20
- **Level:** E2E (needs real selection)
- **Steps:** Toggle the header row; select two cells and merge; then split.
- **Expected:** `<th>` ↔ `<td>` conversion; `colspan`/`rowspan` appear and disappear.

### TC-E21 — Delete table
- **Requirements:** RT-R20
- **Level:** Unit (component)
- **Steps:** Inside a table, choose "Delete table".
- **Expected:** No `<table>` remains in the emitted HTML.

### TC-E22 — Table cells wrap content in paragraphs
- **Requirements:** RT-X13
- **Level:** Unit
- **Steps:** Insert a table, type into a cell, inspect the HTML.
- **Expected:** Cell content is wrapped in `<p>`. This is what forces the custom Turndown rule in the export — cross-reference [`../questions-management/testcases.md`](../questions-management/testcases.md) TC-Q56.

## Whitespace and content-fidelity cases

### TC-E23 — Multiple spaces survive a round-trip
- **Requirements:** RT-R23, RT-R24 · AC-7
- **Level:** Unit (component) — **regression**
- **Steps:** Set content to `<p>hello&nbsp;&nbsp;&nbsp;world</p>` and to `<p>hello   world</p>`; read back the emitted HTML; re-seed a new editor with that output.
- **Expected:** The three spaces are preserved rather than collapsed to one. This is the exact defect fixed by the "fix whitespace issue" commit and is the most likely thing to silently regress if `parseOptions` is touched.

### TC-E24 — Line breaks are preserved
- **Requirements:** RT-R23
- **Level:** Unit (component) — **regression**
- **Steps:** Enter content with hard line breaks inside a paragraph; save and reload.
- **Expected:** Breaks survive. Companion to the "fix linebreak issue" commit.

### TC-E25 — Code-block indentation is preserved
- **Requirements:** RT-R23
- **Level:** Unit (component)
- **Steps:** Author a code block with nested indentation; round-trip it.
- **Expected:** Leading whitespace on each line is unchanged.

### TC-E26 — Empty editor produces `"<p></p>"`
- **Requirements:** RT-R34 · AC-8
- **Level:** Unit (component)
- **Steps:** Render empty and read the emitted HTML.
- **Expected:** Exactly `"<p></p>"` — the sentinel the question form checks against.

### TC-E27 — Form blocks the empty sentinel
- **Requirements:** RT-R34, RT-V2 · AC-8
- **Level:** Unit (component)
- **Steps:** Submit `QuestionForm` with the question editor empty.
- **Expected:** Toast "Question content is required"; no request issued.

### TC-E28 — Server accepts the sentinel
- **Requirements:** RT-R35
- **Level:** Integration
- **Steps:** `POST /api/questions` with `{ question: "<p></p>" }`.
- **Expected:** **`201`** — the server has no equivalent check. Pins the client/server divergence.

## Renderer cases

### TC-E29 — Code blocks gain `hljs` and tokens
- **Requirements:** RT-R26 · AC-10
- **Level:** Unit (component)
- **Steps:** Render `HighlightedHtml` with a `<pre><code>` block.
- **Expected:** The element has the `hljs` class and its `innerHTML` contains `<span class="hljs-…">` elements.

### TC-E30 — Non-code content is untouched
- **Requirements:** RT-R25
- **Level:** Unit (component)
- **Steps:** Render HTML with paragraphs, lists, and a table but no code block.
- **Expected:** Rendered verbatim; the effect finds no `pre code` and mutates nothing.

### TC-E31 — Re-highlighting on content change
- **Requirements:** RT-R28
- **Level:** Unit (component)
- **Steps:** Render with one code block, then re-render with different code.
- **Expected:** The new code is highlighted; the effect's `[html]` dependency drives it.

### TC-E32 — Multiple code blocks
- **Requirements:** RT-R26
- **Level:** Unit (component)
- **Steps:** Render content with three code blocks in different languages.
- **Expected:** All three highlighted, each with its own language.

### TC-E33 — Empty and malformed HTML
- **Requirements:** RT-E4
- **Level:** Unit (component)
- **Steps:** Render with `""`, then with `"<p>unclosed"`, then with `"<pre><code></code></pre>"`.
- **Expected:** No crash in any case; the empty code block is handled (`textContent ?? ""`).

### TC-E34 — Highlighting survives a parent re-render
- **Requirements:** RT-X9
- **Level:** Unit (component)
- **Steps:** Render, confirm highlighting, force a parent re-render with the same `html`.
- **Expected:** Document the outcome — React restores the raw `dangerouslySetInnerHTML` content, and the effect does **not** re-run because `html` is unchanged. Determine whether highlighting is lost and pin the result; this is a real fragility of mutating outside React's tree.

## Security cases — highest priority

### TC-E35 — Script tag in stored content
- **Requirements:** RT-X1, RT-B3 — **security**
- **Level:** Unit (component)
- **Steps:** Render `HighlightedHtml` with `<p>x</p><script>window.__pwned=1</script>`.
- **Expected:** Document the actual behavior. `innerHTML` does not execute `<script>` inserted this way, so this case likely does **not** fire — which is why TC-E36 matters more.

### TC-E36 — Event-handler attribute executes
- **Requirements:** RT-X1 — **security**
- **Level:** Unit (component)
- **Steps:** Render `HighlightedHtml` with `<img src=x onerror="window.__pwned=1">`.
- **Expected:** **The handler runs.** No sanitizer is installed. This is the concrete demonstration of the missing-sanitization finding and should be pinned before any hardening work, then inverted once a sanitizer is added.

### TC-E37 — Cross-user delivery path
- **Requirements:** RT-P4, RT-X1 — **security**
- **Level:** Integration
- **Steps:** (a) As an admin, store a default question containing `<img src=x onerror=…>`; view it as another user. (b) As user A, store the same in a private question; view it as user B through `/share/<A's slug>`.
- **Expected:** In both paths the payload reaches another user's browser. This test documents *why* TC-E36 is severe rather than theoretical.

### TC-E38 — Interview surfaces inject unsanitized HTML too
- **Requirements:** RT-X1, RT-R32 — **security**
- **Level:** Unit (component)
- **Steps:** Render the interview room, conversation log, summary, and picked-question list with a payload in `promptText` / `question`.
- **Expected:** All four use `dangerouslySetInnerHTML` with no sanitization. For `AI_FOLLOWUP` turns the source is **LLM output**. Cross-reference [`../mock-interview/testcases.md`](../mock-interview/testcases.md) TC-M74.

### TC-E39 — Payload survives the editor round-trip
- **Requirements:** RT-V3, RT-V4
- **Level:** Unit (component)
- **Steps:** Seed the editor with `<img src=x onerror=…>` and with `<script>…</script>`, then read the emitted HTML.
- **Expected:** Determine what TipTap's schema actually preserves. Unknown tags are typically dropped by the ProseMirror schema on parse, which may mean the editor is an accidental partial filter — but pasted content and direct API writes bypass it entirely. Record the result; it changes how much protection the editor incidentally provides.

### TC-E40 — Direct API write bypasses the editor entirely
- **Requirements:** RT-V3 — **security**
- **Level:** Integration
- **Steps:** `POST /api/questions` with a raw payload in `question`, bypassing the UI.
- **Expected:** Stored verbatim — the API performs no HTML validation. Confirms that any incidental filtering by the editor is not a security control.

## Loading and rendering-lifecycle cases

### TC-E41 — Dynamic import placeholder
- **Requirements:** RT-R3 · AC-9
- **Level:** Unit (component)
- **Steps:** Render `QuestionForm` with the dynamic import pending.
- **Expected:** A pulsing 160px muted block per editor; no TipTap markup yet.

### TC-E42 — No server-side rendering
- **Requirements:** RT-R3, RT-E2 · AC-9
- **Level:** Integration
- **Steps:** Server-render a page hosting `QuestionForm`.
- **Expected:** No editor markup in the server HTML and no hydration warning — guaranteed by `ssr: false` plus `immediatelyRender: false`.

### TC-E43 — Nothing renders before initialization
- **Requirements:** RT-E1
- **Level:** Unit (component)
- **Steps:** Render `TipTapEditor` with `useEditor` stubbed to return `null`.
- **Expected:** The component returns `null` — no toolbar, no container, no error.

### TC-E44 — Toolbar hidden when not editable
- **Requirements:** RT-R5, RT-P2
- **Level:** Unit (component)
- **Steps:** Render with `editable: false`.
- **Expected:** No toolbar; the content is not editable. Also assert that **no production caller passes this prop** — it is dead configuration today.

## Multi-instance / form integration cases

### TC-E45 — Six editors on the question form
- **Requirements:** RT-R30, RT-X3
- **Level:** Unit (component)
- **Steps:** Render `QuestionForm` and count the mounted editor instances.
- **Expected:** **Six** — question and answer for each of English, Vietnamese, and Custom — all mounted simultaneously, including the four in hidden tabs.

### TC-E46 — Field mapping per language
- **Requirements:** RT-R30
- **Level:** Unit (of `getFieldKey`)
- **Steps:** Evaluate for `("en","question")`, `("vn","question")`, `("cus","answer")`, etc.
- **Expected:** `question`, `questionVn`, `answerCus` — the six field names map correctly.

### TC-E47 — Editing one language does not affect another
- **Requirements:** RT-R30
- **Level:** Unit (component)
- **Steps:** Type in the English question editor, switch to the Vietnamese tab, type there, switch back.
- **Expected:** Both values are retained independently and both appear in the submitted payload.

### TC-E48 — Editor is uncontrolled after mount
- **Requirements:** RT-B4, RT-X2
- **Level:** Unit (component)
- **Steps:** Render with `content: "<p>A</p>"`, then re-render with `content: "<p>B</p>"`.
- **Expected:** The document **still shows "A"** — `content` seeds `useEditor` once. Pins the unstated constraint that would break a future draft-loading or form-reset feature.

## Consumer-consistency cases

### TC-E49 — Interview prompts are not highlighted
- **Requirements:** RT-R32, RT-X11
- **Level:** Unit (component)
- **Steps:** Render a question containing a code block on a `QuestionCard` and as an interview prompt.
- **Expected:** Highlighted on the card, **not** highlighted in the interview. Documents the inconsistency.

### TC-E50 — The two `stripHtml` implementations differ
- **Requirements:** RT-X12
- **Level:** Unit
- **Steps:** Run both implementations against `<p>a</p>`, `<img alt="a > b">`, and `<p>a &amp; b</p>`.
- **Expected:** They agree on the simple case and **diverge** on the attribute containing `>` (the regex truncates incorrectly) and on entity decoding (the DOM version decodes, the regex does not).

### TC-E51 — TTS strips HTML
- **Requirements:** RT-R32
- **Level:** Unit
- **Steps:** Pass `<p>What is a <strong>closure</strong>?</p>` through the interview's `stripHtml` before speaking.
- **Expected:** `"What is a closure?"`. Cross-reference [`../mock-interview/testcases.md`](../mock-interview/testcases.md) TC-M57.

### TC-E52 — Markdown export conversion
- **Requirements:** RT-B1
- **Level:** Integration
- **Steps:** Export a question whose answer contains headings, a bullet list, a code block, and a table.
- **Expected:** ATX headings, `-` bullets, fenced code blocks, and a GFM table. Cross-reference `questions-management` TC-Q56 and TC-Q57.

## Regression-sensitive behavior

| Area | Why it is fragile | Guard test |
|---|---|---|
| `parseOptions: { preserveWhitespace: "full" }` | Removing it silently collapses spaces in every stored question — a defect already fixed once | TC-E23, TC-E24, TC-E25 |
| Matching `defaultLanguage` in both halves | Enforced only by a comment; a change in one file makes editing and reading disagree | TC-E11, TC-E12 |
| `codeBlock: false` in StarterKit | Re-enabling it would shadow `CodeBlockLowlight` and kill highlighting | TC-E08, TC-E29 |
| `immediatelyRender: false` + `ssr: false` | Losing either produces hydration errors | TC-E42 |
| `lowlight.registered()` guard | Dropping it lets unregistered languages fall through to `highlightAuto` | TC-E14 |
| The `"<p></p>"` sentinel | If TipTap changes its empty-document output, the form's guard silently stops working | TC-E26, TC-E27 |
| `[html]` effect dependency | Widening or narrowing it changes when highlighting is applied | TC-E31, TC-E34 |
| Table cells wrapping in `<p>` | The export's custom Turndown rule depends on this shape | TC-E22 |
| Absence of sanitization | Any new render site inherits the same exposure | TC-E36, TC-E37, TC-E38 |

## Recommended missing coverage

Ordered by value:

1. **TC-E36 / TC-E37 / TC-E38 (unsanitized HTML).** Write these first even though they currently
   *document a vulnerability rather than assert safety*. They make the exposure concrete, they
   enumerate every delivery path, and they become the acceptance tests for a sanitizer when one is
   added. This is the highest-value testing work in the entire repository.
2. **TC-E23 / TC-E24 (whitespace and line breaks).** This defect has already been fixed twice
   (two separate commits) with nothing preventing a third regression. These are pure round-trip tests
   needing no browser.
3. **TC-E12 (the two defaults match).** A one-line assertion guarding a contract currently held
   together by a comment.
4. **Unit tests for `languageOf`** (TC-E15) — pure function, five cases, no DOM.
5. **TC-E48 (uncontrolled after mount)** — documents an unstated constraint that a future feature
   would otherwise violate silently.
6. **Renderer tests generally** (TC-E29 → TC-E33). `HighlightedHtml` is small, dependency-light, and
   entirely testable in `jsdom`.
7. **TC-E45 (six instances)** — a cheap performance guard; if someone adds a fourth language this
   test makes the cost visible.
8. **TC-E39 / TC-E40** — determine empirically how much incidental filtering the editor provides, so
   that the security posture is based on measurement rather than assumption.
9. **No coverage exists for paste behavior** (RT-V4), which is the most likely route for unexpected
   markup to enter the system through the UI.
10. **Toolbar tests are lower priority** — they mostly assert that TipTap's own commands work, which
    is the library's responsibility. Cover active-state derivation (TC-E09) and the language menu,
    and skip the rest.
</content>
