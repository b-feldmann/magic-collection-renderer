# Mobile Card Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make creating and editing cards usable on mobile through the approved inline modal editor.

**Architecture:** Reuse the existing `CardEditor` and its autosave/draft handling. `MobileApp` owns editor visibility and card selection; the mobile modal places a collapsible editor between card controls and comments. Remove the inaccessible zero-width editor from mobile collection tabs rather than mounting duplicate editors.

**Tech Stack:** Existing React 19, TypeScript, antd 6, SCSS modules, Vitest and Testing Library; no new dependencies.

**Spec:** Approved chat design and `.superpowers/brainstorm/38-1793101184/content/mobile-card-editor.html` (throwaway visual reference).

## Global Constraints

- Mobile only; desktop layout and behavior remain unchanged.
- An `Edit card` action sits beside the card's existing controls. While expanded, that same button reads `Hide editor` and collapses the editor when tapped again.
- The editor opens below the card and above comments, with a separate `Hide editor` button.
- Hiding the editor must not discard edits or cancel its existing autosave.
- Opening a different existing card on mobile always starts with the editor hidden, including switching to another variant. Newly created cards are the exception and open with editing expanded.
- A `New card` button uses `createCard(dispatch, currentUser)` and opens the resulting card with its editor expanded.
- Keep existing card/variant unsaved-change confirmation and native Back behavior.
- Preserve all pre-existing user changes, especially `CardEditor.tsx` and its tests.

## Review Focus

- Hiding and reopening the editor preserves pending input and autosave.
- Switching cards or variants while editing updates both preview and editor to the same card and collapses the editor after the switch is accepted.
- Closing and reopening an existing card defaults to collapsed editing.
- Creation failure must not open an unrelated or empty placeholder card.
- Narrow screens keep fields and controls within the modal without breaking background dismissal.

---

### Task 1: Inline mobile editor presentation

**Files:**
- Modify `src/components/BigCardRenderModal/BigCardRenderModal.tsx`
- Modify `src/components/BigCardRenderModal/MobileBigCardRenderModal.tsx`
- Modify `src/components/BigCardRenderModal/BigCardRenderModal.module.scss`
- Create `src/components/BigCardRenderModal/MobileBigCardRenderModal.editor.test.tsx`

**Interfaces:**
- Add optional `mobileEditor?: React.ReactNode`, `mobileEditorOpen?: boolean`, `onEditCard?: () => void`, and `onHideEditor?: () => void` to the outer modal; forward to corresponding editor controls on the mobile modal.
- Existing callers without an editor retain their current behavior.

- [x] Write failing tests: `Edit card` invokes the opening callback; while expanded that same control reads `Hide editor` and invokes the hiding callback on another tap; an expanded editor appears after the card and before comments; the separate panel-header `Hide editor` button also invokes its callback without dismissing the modal; collapsing and expanding preserves input state; controls remain usable on single-faced cards without variants.
- [x] Run `npm test -- --run src/components/BigCardRenderModal/MobileBigCardRenderModal.editor.test.tsx` and confirm feature-related failures.
- [x] Implement the optional editor panel and accessible toggle controls (`aria-expanded`, `aria-controls`). The main control toggles between `Edit card` and `Hide editor` and remains enabled in both states; retain the separate hide button in the panel header. Preserve the editor instance while collapsed, using a hidden wrapper. Style a light, rounded panel with a compact header and touch-friendly buttons; retain modal scrolling and avoid fixed panel heights.
- [x] Run the new tests and existing mobile dismissal/modal variant tests; expect all to pass.

### Task 2: Mobile application editing and creation flow

**Files:**
- Modify `src/MobileApp.tsx`
- Create `src/MobileApp.editor.test.tsx`
- Modify `src/App.module.scss` only if needed for mobile creation-button styling.

**Interfaces:**
- Consume Task 1's modal props.
- Reuse `CardEditor`'s existing `card`, `saveTmpCard`, and `onDraftChange` props and `createCard(dispatch, currentUser): void`.

- [x] Write failing integration tests covering existing cards initially collapsed; edit/hide/reopen through the same main toggle preserving draft input; new-card action calling creation with the current user and opening the returned `newUuid` with editing expanded; card/variant switching with pending-draft confirmation; accepted switches always collapsing the editor, while cancelling a switch preserves the current editor; closing/reopening defaulting to collapsed; creation failure leaving the current selection untouched.
- [x] Run `npm test -- --run src/MobileApp.editor.test.tsx` and confirm feature-related failures.
- [x] Add `showCardEditor` state in `MobileApp`; pass one shared editor instance into the modal and remove the zero-width collection-tab editors. Expand on `newUuid`; collapse on modal dismissal, ordinary collection opening, and every accepted switch to another card or variant. Do not collapse the current editor when a pending-draft switch is cancelled. Keep editor selection synchronized with preview and preserve existing pending-draft handling. Add a prominent `New card` button to mobile collection controls.
- [x] Run both new test files, then `npm test -- --run`, `npm run build`, and `npm run lint`. Report any failures by name, distinguishing pre-existing issues if verified.
- [x] Review the final diff for unrelated changes and inspect mobile layout in the browser if the middleware/data are available. Request independent review before declaring completion.

## Verification outcome

- 60 test files / 588 tests pass; production build passes; lint exits 0 with one pre-existing unused-variable warning.
- Independent read-only review: no findings.
- Browser layout checks passed at 390px and 320px using the real components with isolated sample data. Physical-device touch and virtual-keyboard behavior was not tested; screenshot capture was unavailable without a visible desktop tab.
- Changes remain uncommitted on `feat/mobile-card-editor`, alongside the preserved user work.

## Workspace and delivery

- Worktree isolation must preserve the user's uncommitted editor work; do not copy, overwrite, or discard it without checking the appropriate worktree workflow.
- Do not commit or merge user work as part of this task. Leave implementation changes available for review unless the user requests a commit.
- The `.superpowers/` directory contains local mockup/session artifacts; it is not application code and should not be committed.
