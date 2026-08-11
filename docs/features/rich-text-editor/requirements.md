# Rich Text Editor — Requirements (as built)

> Reverse-engineered from the current implementation. Items that could not be confirmed from code
> are marked **Unknown / needs confirmation**.
>
> This is a **shared building block** rather than a user-facing feature in its own right. It covers
> the TipTap editor used for authoring question and answer content, and the matching read-only
> renderer used everywhere that content is displayed.

## Feature overview

Question and answer bodies are rich text, authored in a TipTap editor and stored as HTML strings.
The editor supports basic formatting, headings, lists, blockquotes, inline code, syntax-highlighted
code blocks with a selectable language, and tables. A companion renderer displays stored HTML and
re-applies syntax highlighting to code blocks at view time.

Six editor instances exist on the question form — a question and an answer editor for each of the
three language variants.

## Purpose / user problem

Interview answers are technical: they need code samples, comparison tables, ordered steps, and
emphasis. Plain text cannot express that, and a Markdown textarea would put the burden of syntax on
the user. A WYSIWYG editor with code-block highlighting lets answers look the way they will be
studied.

## Current functional requirements

### Editing surface

- **RT-R1** — The editor renders a toolbar above an editable content area with a minimum height of 120px.
- **RT-R2** — A placeholder is shown when the editor is empty; the question editors use "Enter the question..." and the answer editors "Enter the answer...".
- **RT-R3** — The editor is loaded via a dynamic import with server-side rendering disabled, and shows a pulsing 160px placeholder while loading.
- **RT-R4** — Every change emits the full document as an HTML string to the parent form.
- **RT-R5** — The toolbar is rendered only when the editor is editable.

### Formatting

- **RT-R6** — Inline marks: bold, italic, underline, strikethrough.
- **RT-R7** — Headings: levels 1, 2, and 3.
- **RT-R8** — Lists: bullet and ordered.
- **RT-R9** — Blockquote.
- **RT-R10** — Inline code, with the keyboard shortcut Ctrl+E noted in the button tooltip.
- **RT-R11** — Code blocks.
- **RT-R12** — Undo and redo.
- **RT-R13** — Each toolbar button reflects whether its mark or node is active at the cursor.
- **RT-R14** — Links are supported by the underlying extension but are **not exposed in the toolbar**; link clicks are configured not to open while editing.

### Code blocks

- **RT-R15** — Code blocks are syntax-highlighted in the editor using lowlight.
- **RT-R16** — A language dropdown offers TypeScript, JavaScript, JSON, SQL, Bash, HTML, CSS, Python, and Java.
- **RT-R17** — The dropdown is disabled unless the cursor is inside a code block, and it displays the current block's language.
- **RT-R18** — When a code block has no explicit language, it is highlighted as **TypeScript**. This default is chosen deliberately because the TypeScript grammar is a superset of JavaScript's, and because automatic language detection mis-identifies short snippets.
- **RT-R19** — Code blocks carry the styling classes `bg-muted rounded-md p-4 font-mono text-sm`.

### Tables

- **RT-R20** — A table menu offers: insert a 3×3 table with a header row, add a row above or below, delete a row, add a column left or right, delete a column, toggle the header row, merge or split cells, and delete the table.
- **RT-R21** — All table operations except "Insert table" are disabled unless the cursor is inside a table.
- **RT-R22** — Tables are resizable and are wrapped in a container element.

### Whitespace handling

- **RT-R23** — Content is parsed with whitespace preserved in full, so runs of multiple spaces survive a save-and-reload cycle.
- **RT-R24** — The view surface renders with `white-space: pre-wrap` semantics to match.

### Rendering stored content

- **RT-R25** — Stored HTML is rendered directly into the DOM.
- **RT-R26** — After rendering, every `pre code` element is re-highlighted with lowlight and given the `hljs` class.
- **RT-R27** — The rendering language is taken from a `language-*` class when present and registered with lowlight; otherwise it falls back to TypeScript, matching the editor's default.
- **RT-R28** — Highlighting re-runs whenever the HTML changes.
- **RT-R29** — Content is displayed inside Tailwind `prose` typography classes with dark-mode variants.

### Where the editor and renderer are used

- **RT-R30** — The editor appears six times on the question form: question and answer, for English, Vietnamese, and Custom.
- **RT-R31** — The highlighted renderer is used for the question body and the answer body on question cards.
- **RT-R32** — The mock interview renders prompt text with plain HTML injection and **no** syntax highlighting.
- **RT-R33** — The related-question picker and the interview's picked-question list render or strip question HTML without highlighting.

### Content validation

- **RT-R34** — An empty editor produces the string `"<p></p>"`, which the question form treats as empty and rejects with "Question content is required".
- **RT-R35** — The server-side question schema requires only a non-empty string, so `"<p></p>"` passes server validation.

## User flows

### Author an answer with a code block
1. User opens the question form and switches to the Answer editor.
2. Types prose, then clicks the code-block button.
3. The language dropdown becomes enabled; the user selects SQL.
4. Types the query, which is highlighted live.
5. Saves; the HTML is stored on the question.
6. On the question card, expanding the answer shows the same code re-highlighted.

### Build a comparison table
1. User clicks the table button and chooses "Insert table".
2. A 3×3 table with a header row is inserted.
3. The user fills cells, adds rows and columns from the menu, and optionally merges cells.
4. Saves. The table survives export to Markdown as a GFM table (see [`../questions-management/`](../questions-management/) Q-R56).

## Business rules

- **RT-B1** — Content is stored as HTML, not Markdown or JSON. HTML is the canonical format.
- **RT-B2** — The editor's default code language and the renderer's default must match, or code would be highlighted differently while editing and while reading.
- **RT-B3** — Stored HTML is trusted and rendered without sanitization.
- **RT-B4** — The editor is uncontrolled after mount: `content` seeds the initial document and changes to that prop do not re-seed it.

## Validation rules

- **RT-V1** — The editor itself performs no validation. It emits whatever HTML the document produces.
- **RT-V2** — The only content check is in the consuming form (RT-R34), and it is client-side only.
- **RT-V3** — No length limit, no allowed-tag list, and no sanitization on input or output.
- **RT-V4** — Pasted content is handled by TipTap's default paste rules; **Unknown / needs confirmation:** exactly which tags and attributes survive a paste from an external source, since no explicit paste configuration exists.

## Permissions / access restrictions

- **RT-P1** — The editor has no permission logic of its own; access is governed by the pages that host it.
- **RT-P2** — The `editable` prop can render a read-only editor, but **no caller currently passes it** — every instance is editable.
- **RT-P3** — Any signed-in user can author HTML through the editor.
- **RT-P4** — Admin-authored default questions are rendered into every user's browser in the same domain; a user's own content is rendered into the browsers of anyone viewing their shared profile.

## Error and failure behavior

- **RT-E1** — The editor renders `null` until TipTap has initialized, so a failure to initialize results in nothing being displayed, with no error message.
- **RT-E2** — Immediate rendering is disabled to avoid hydration mismatches; the loading placeholder covers the gap.
- **RT-E3** — If lowlight does not recognize a language class, the renderer silently falls back to TypeScript rather than failing.
- **RT-E4** — Highlighting failures are not caught; an exception inside the highlight effect would surface as a React error.
- **RT-E5** — There is no error boundary around either component.

## Important edge cases

- **RT-X1** — **Stored HTML is rendered with `dangerouslySetInnerHTML` and is never sanitized.** This is the central risk of the design. It appears in the highlighted renderer, in the mock interview room, the interview conversation log, the interview summary, and the interview's picked-question list. Any HTML a user can get into a question body — or that an LLM produces as a follow-up prompt — is executed in the viewer's browser. Content crosses user boundaries in two places: admin defaults render for every user, and shared profiles render one user's content for another.
- **RT-X2** — The editor is **uncontrolled after mount** (RT-B4). Since `content` is only the initial value, a parent that resets its form state programmatically would not update the editor. In the current question form this never happens, because the form is mounted with its initial values and never reset.
- **RT-X3** — All six editors mount at once on the question form, even though only one language tab is visible. Each carries its own TipTap instance, ProseMirror state, and lowlight registration.
- **RT-X4** — The `lowlight` common language set is instantiated **twice** — once in the editor module and once in the renderer module — rather than shared.
- **RT-X5** — The editor's language dropdown offers nine languages, but the renderer accepts **any** language registered in lowlight's common set, so content authored elsewhere with another language class still highlights correctly.
- **RT-X6** — The TypeScript default (RT-R18) means a plain-text or shell snippet in a code block with no language will be tokenized as TypeScript, producing arbitrary-looking coloring.
- **RT-X7** — Underline is toggled by the toolbar via `toggleUnderline()`, which must come from the StarterKit bundle — `@tiptap/extension-underline` is listed in `package.json` but is **not imported** by the editor. Likewise `@tiptap/extension-link` is a dependency but is configured through StarterKit rather than imported directly.
- **RT-X8** — Links can be created by pasting a URL (via StarterKit's link extension) but there is no toolbar affordance to add, edit, or remove one (RT-R14).
- **RT-X9** — The renderer mutates the DOM inside a `useEffect` after React has rendered the HTML, so highlighted markup is not part of React's tree. A re-render restores the unhighlighted HTML and the effect re-applies highlighting.
- **RT-X10** — The whitespace-preservation setting (RT-R23) exists because ProseMirror would otherwise collapse runs of spaces on parse; this was fixed in the commits "fix whitespace issue" and "fix linebreak issue".
- **RT-X11** — The mock interview renders prompt HTML **without** the highlighting renderer (RT-R32), so a question containing a code block appears unhighlighted during an interview but highlighted on the question card.
- **RT-X12** — Two different HTML-stripping implementations exist for previews: a regex in `question-card.tsx` and a DOM-based one in `related-question-selector.tsx` and `interview-room.tsx`. The regex version mishandles attribute values containing `>`.
- **RT-X13** — Table cells wrap their content in `<p>` elements, which required a custom Turndown rule in the Markdown export to avoid producing broken tables.
- **RT-X14** — No maximum content length is enforced anywhere, and the columns are `@db.Text`.

## Non-goals / not supported

- HTML sanitization.
- Image upload or embedding (beyond whatever survives a paste).
- A link toolbar button.
- Mentions, slash commands, or autocompletion.
- Collaborative or concurrent editing.
- Markdown input or output in the editor (export converts at request time instead).
- Draft autosave — content is only persisted when the form is submitted.
- A read-only editor mode in practice (the prop exists, unused).
- Editor-level content validation or length limits.
- Custom or user-configurable code languages beyond the nine listed.
- Text alignment, colors, font sizes, or highlight marks.
- Footnotes, task lists, or horizontal rules.

## Acceptance criteria

- **AC-1** — Typing in an editor emits HTML to the parent on every change.
- **AC-2** — Each formatting button applies its mark or node and shows an active state when the cursor is inside it.
- **AC-3** — A code block with the language set to SQL is highlighted as SQL both while editing and when rendered on a question card.
- **AC-4** — A code block with no language is highlighted as TypeScript in both places.
- **AC-5** — The language dropdown is disabled outside a code block and enabled inside one, showing that block's language.
- **AC-6** — "Insert table" produces a 3×3 table with a header row; all other table actions are disabled outside a table.
- **AC-7** — Content containing multiple consecutive spaces round-trips through save and reload unchanged.
- **AC-8** — An empty editor yields `"<p></p>"`, and submitting the question form in that state is blocked client-side.
- **AC-9** — The editor does not render on the server and shows a loading placeholder until it initializes.
- **AC-10** — Rendered code blocks carry the `hljs` class and tokenized child elements.
</content>
