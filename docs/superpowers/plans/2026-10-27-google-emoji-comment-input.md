# Google Emoji Comment Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the existing Google emoji images while editing comments and open the comment picker to the left of its trigger.

**Architecture:** Replace only the comment textarea with a plain-text Lexical editor using inline emoji text nodes backed by the already bundled Google spritesheet. Lexical owns selection, composition and undo; the app continues storing and submitting Unicode strings through the existing React state and API. Picker selection inserts at the editor's remembered caret or replaces its selection.

**Tech Stack:** React 19, TypeScript, antd 6, Lexical, Vitest, existing Emoji Mart Google data and spritesheet.

**Spec:** User-approved design in this conversation: preserve normal typing, selection, copy/paste and multiline editing; display Google emojis inline; save plain Unicode with no backend changes. Additional requirement: position the comment picker to the left of its clickable icon.

## Global Constraints

- Limit changes to the comment composer and shared emoji rendering; preserve other in-progress workspace changes.
- Keep comment storage and `onSubmit(content: string, author: UserInterface): Promise<boolean>` unchanged.
- Keep vanilla React state; no application-wide state library.
- Reuse the bundled Google spritesheet; no CDN image requests or additional emoji assets.
- Preserve `Your comment`, `Add emoji to comment`, and `Add Comment` labels.
- Retain the current two-line minimum/five-line scrolling maximum and mobile sizing.
- Use npm and update `package-lock.json` for any editor dependencies.
- Do not commit unrelated workspace changes; leave implementation uncommitted unless requested.

## Review Focus

- Joined/skin-tone emojis must select, delete and copy as complete Unicode sequences.
- IME composition must finish without rewriting intermediate composing text or losing the caret.
- Pasted HTML must produce plain text, not executable or formatted content.
- Undo/redo must work after typing, selecting an emoji, deleting and pasting.
- A pending submit must not erase newer edits; unsuccessful submits must preserve the draft.

## File Responsibilities

- `src/components/AnnotationList/GoogleEmoji.tsx`: existing read-only sprite components; extract only shared lookup/tokenization needed by editable nodes.
- `src/components/AnnotationList/googleEmojiData.ts`: shared Unicode-to-sprite lookup and longest-first tokenization, if needed to avoid duplicating current private data handling.
- `src/components/AnnotationList/EmojiCommentInput.tsx`: accessible editor, plain-text changes, external value resets, imperative picker insertion and editor styling hooks.
- `src/components/AnnotationList/GoogleEmojiNode.ts`: Lexical text-node implementation preserving Unicode while displaying Google sprites.
- `src/components/AnnotationList/AnnotationEditor.tsx`: integrate the input and set the comment Popover's placement to `left`.
- `src/components/AnnotationList/Annotations.module.scss`: composer field styling and height limits.
- Editor/node tests plus existing `AnnotationList.test.tsx`: editing and submission coverage without mocking the editor.

### Task 1: Emoji-aware plain-text input

**Files:** Create `EmojiCommentInput.tsx`, `GoogleEmojiNode.ts`, their tests, and shared emoji data helper if needed; modify `GoogleEmoji.tsx`, `package.json` and `package-lock.json`.

**Interfaces:**
- `EmojiCommentInputProps = { value: string; onChange: (value: string) => void }`.
- `EmojiCommentInputHandle = { insertEmoji: (emoji: string) => void }` exposed through a ref.
- The node's text content and exported plain text are always the original Unicode, not HTML or shortcodes.
- Use the same Google data, sheet dimensions and coordinate calculation as the existing renderer.

- [ ] **Step 1: Add failing input/node tests.** Assert typing `Hello 🔥` emits `Hello 🔥` and displays the Google sprite; `👍🏽`, `👨‍👩‍👧‍👦`, flags and keycaps each remain one emoji node; unknown emojis and `{W}` remain text. Assert replacing a selected range with `🔥` produces the expected Unicode string and caret position. Assert multiline plain-text paste/copy, literal `<script>` text, backspace/delete across emoji boundaries, undo/redo and composing text updates preserve content correctly. Assert a controlled reset to `''` clears the editor without generating a user edit.
- [ ] **Step 2: Run the tests and confirm the missing-input failure.** Run `npm test -- --run src/components/AnnotationList/EmojiCommentInput.test.tsx` (and node tests if separated).
- [ ] **Step 3: Implement the input.** Install matching current versions of `lexical`, `@lexical/react`, `@lexical/plain-text` and `@lexical/history`. Use plain-text/history plugins and a custom token-mode text node for emoji. Transform known sequences only after composition; do not recreate the editable DOM on every React render. Retain the editor selection when opening the picker, insert Unicode through an editor update, and refocus the input afterward. Share lookup/tokenization with the read-only renderer rather than keeping separate emoji datasets. Preserve Unicode in clipboard operations and never inject user HTML.
- [ ] **Step 4: Run the new tests plus existing emoji/reaction tests.** All assertions pass without mocking the input or its selection logic.

### Task 2: Integrate the composer and left-hand picker

**Files:** Modify `AnnotationEditor.tsx`, `Annotations.module.scss`, `AnnotationList.test.tsx`; add `AnnotationEditor.test.tsx` for picker insertion and submission race coverage.

**Interfaces:** Consume Task 1's input and imperative handle; retain the existing annotation editor props and parent submission flow.

- [ ] **Step 1: Add failing integration tests.** Replace textarea-only `fireEvent.change`/`toHaveValue` assertions with real editable-input interactions and plain-text draft assertions. Preserve every existing HTTP success/failure test. Assert choosing an emoji inserts at the remembered caret rather than appending, and that opening the picker does not discard a selection. Assert the comment Popover uses left placement while reaction picker placement stays unchanged. Assert successful submission clears the unchanged draft but preserves edits made while awaiting the request, and failed submission retains the draft.
- [ ] **Step 2: Run focused tests and confirm the integration failures.** Run `npm test -- --run src/components/AnnotationList`.
- [ ] **Step 3: Integrate the input and style it.** Replace antd `Input.TextArea` only in `AnnotationEditor`; keep its author, submit/loading state and conditional draft clearing. Set `placement="left"` on the comment emoji `Popover`, retaining antd's normal viewport overflow adjustment. Match the field's existing fill, border, radius, padding and font; add visible focus, accessible multiline textbox semantics and placeholder. Keep 2–5 lines of height with vertical scrolling and mobile wrapping.
- [ ] **Step 4: Run focused tests, full suite, build and changed-file lint.** Run `npm test -- --run src/components/AnnotationList`, `npm test -- --run`, `npm run build`, then ESLint for changed TypeScript files. Record any failures by name rather than hiding unrelated failures.
- [ ] **Step 5: Verify in the browser.** Type and paste mixed text/emojis; move/select with mouse and keyboard; insert an emoji in the middle; backspace/delete; copy/cut/paste to plain text; undo/redo; enter multiple lines; submit; test a narrow viewport. Confirm Google icons are visible inside the actual editable field, not just a preview, and the picker opens to the left when space permits. Exercise IME composition where available and explicitly report any unverified browser-specific behavior.

## Self-review

- Both user requirements map to Task 2; Task 1 supplies the editor behavior needed by Task 2.
- All five review-focus risks have explicit editing or integration test coverage and a browser check.
- Submission and storage interfaces are unchanged; implementation uses only local React/editor state.
- No commit or broad cleanup of the dirty working tree is planned.
