# Emoji Mart Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the comment emoji picker and reaction picker from legacy `emoji-mart` v2 to the current v5 package split while preserving existing selection, focus, accessibility, and test behavior.

**Architecture:** Replace the v2 `NimblePicker` and bundled data import with the v5 React picker and data package. Keep picker configuration centralized in the existing annotation components/styles so both comment entry and reactions use the same behavior and visual overrides.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, `@emoji-mart/react`, `@emoji-mart/data`, SCSS modules.

**Spec:** Existing approved direction in chat: retain picker behavior and framework, modernize the implementation and visual layer without changing comment/reaction semantics.

## Global Constraints

- Use the current emoji-mart major release rather than the legacy v2 API.
- Use Google emoji artwork (`set="google"`) and preserve existing emoji selection output (`emoji.native` equivalent becomes the v5 selected emoji string).
- Preserve `showSkinTones={false}`, hidden preview, reaction `perLine={7}`, focus restoration, Escape handling, and accessible labels.
- Do not change backend actions, annotation data structures, or comment submission behavior.
- Update tests/mocks to assert user-visible behavior rather than the old package API.

## Review Focus

- Selecting an emoji from the composer still appends it to the existing draft.
- Selecting a reaction still sends the selected native emoji string and closes the picker.
- Opening and closing the reaction picker still restores focus correctly, including Escape.
- The picker remains usable in both the composer and reaction popover with the new package's rendering model.
- The dependency graph no longer imports legacy `emoji-mart` v2 CSS, data, or components.

---

### Task 1: Lock down the v5 picker integration behavior

**Files:**

- Modify: `src/components/AnnotationList/AnnotationList.test.tsx`
- Modify: `src/components/AnnotationList/AnnotationReactions.test.tsx`
- Modify: `src/components/AnnotationList/AnnotationReactions.keyboard.test.tsx`

**Interfaces:**

- Consumes: Existing composer and reaction user-facing behavior.
- Produces: Tests/mocks that model the v5 `Picker` callback (`onEmojiSelect`) and selected emoji shape.

- [ ] **Step 1: Update the composer test expectation/mocking boundary**

Mock `@emoji-mart/react` with a picker that invokes `onEmojiSelect` using a v5-shaped selected emoji (`{ native: '🔥' }`) and keep the assertion that selecting it updates/submits comment content.

- [ ] **Step 2: Update reaction picker tests to the v5 package boundary**

Replace legacy `emoji-mart` mocks/import assumptions with `@emoji-mart/react` and retain assertions for reaction saving, picker closing, and server-confirmed state.

- [ ] **Step 3: Run the focused tests and verify the expected RED failure**

Run: `npm test -- --run src/components/AnnotationList/AnnotationList.test.tsx src/components/AnnotationList/AnnotationReactions.test.tsx src/components/AnnotationList/AnnotationReactions.keyboard.test.tsx`

Expected: failures because production code still imports and renders the v2 package API.

---

### Task 2: Migrate dependencies and picker components

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/components/AnnotationList/AnnotationEditor.tsx`
- Modify: `src/components/AnnotationList/AnnotationReactions.tsx`
- Modify: `src/components/EmojiIcon.tsx`
- Modify: `src/components/EmojiIcon.test.tsx`

**Interfaces:**

- Consumes: The failing v5 behavior tests from Task 1.
- Produces: Both annotation pickers using `@emoji-mart/react` and `@emoji-mart/data`, with the same callback and accessibility contracts.

- [ ] **Step 1: Replace legacy dependencies**

Remove the legacy `@types/emoji-mart` dependency. Upgrade `emoji-mart` to v5.6.0 and add the v5 wrapper/data packages `@emoji-mart/react` and `@emoji-mart/data`, then regenerate the lockfile with npm. The v5 core package remains required by the React wrapper but no longer exposes the legacy v2 component API used by this app.

- [ ] **Step 2: Migrate `AnnotationEditor`**

Import `Picker` from `@emoji-mart/react` and the data object from `@emoji-mart/data`. Pass the v5 callback as `onEmojiSelect`, set `set="google"`, preserve the current native string append behavior, disable skin tones, hide preview, and provide the imported data through the v5 API.

- [ ] **Step 3: Migrate `AnnotationReactions`**

Use the v5 picker callback and data API with `set="google"` while retaining `perLine={7}`, `autoFocus`, reaction dialog labeling, close behavior, and native emoji extraction.

- [ ] **Step 4: Remove v2-only icon dependency usage**

Replace the v2-only `Emoji` wrapper with the existing icon library's smile icon (or an equivalent local trigger icon) and update its test. Google artwork applies to the picker itself; the trigger should remain lightweight and accessible without reintroducing a legacy emoji renderer.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the focused annotation and emoji icon tests. Expected: all pass with no imports from legacy `emoji-mart`.

---

### Task 3: Replace the legacy visual layer with the approved modern light theme

**Files:**

- Modify: `src/components/AnnotationList/Annotations.module.scss`

**Interfaces:**

- Consumes: The v5 picker DOM/classes rendered by both annotation pickers.
- Produces: Consistent light, modern picker styling without changing picker behavior.

- [ ] **Step 1: Add scoped picker overrides**

Style the picker surfaces, search field, category navigation, active state, scrollbar, and spacing under the existing `.reactionPicker` scope and add a matching editor-picker scope if needed. Avoid global rules that could affect unrelated emoji components.

- [ ] **Step 2: Run annotation tests and build checks**

Run: `npm test -- --run src/components/AnnotationList` and `npm run build`.

Expected: focused tests pass and TypeScript/Vite build completes successfully.

---

### Task 4: Full verification and dependency audit

**Files:**

- No additional files expected.

- [ ] **Step 1: Search for legacy imports**

Run a repository search for `from 'emoji-mart'`, `emoji-mart/css`, `emoji-mart/data`, and `NimblePicker`; expected result is no production references.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test -- --run`

Expected: all existing tests pass.

- [ ] **Step 3: Run lint and production build**

Run: `npm run lint` and `npm run build`.

Expected: both commands complete without errors.

- [ ] **Step 4: Review the final diff**

Confirm the change is limited to the dependency migration, picker API updates, tests, and picker styling; do not commit unrelated generated or user-authored changes.
