# Card Editor Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved compact visual design to the real card editor without changing persistence or card-specific behavior.

**Architecture:** Preserve CardEditor state and action handlers and EditField control implementations. Group existing field configurations into semantic sections, add accessible header actions and footer, and scope all new styling to the editor CSS module and its local antd theme.

**Tech Stack:** React 19, TypeScript, antd 6, SCSS modules, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-27-card-editor-refresh-design.md`

## Global Constraints

- Keep React, antd, existing CSS modules, and existing handlers; add no dependency.
- Field labels and input text: 13px. Section headings: 16px, dark green and semibold.
- No Save Changes button; show “Changes save automatically” as explanatory copy, not a successful-save indicator.
- No extra mana symbols beside the mana-cost input and no “Mana symbols are rendered automatically in the preview.” helper copy.
- Leave all pre-existing working-tree changes intact.
- Preserve existing labels queried by tests, persistence timing, permission checks, type restrictions, and all specialized fields.

## Review Focus

- Hidden controls must not consume grid space or become keyboard-focusable; exercise basic lands and back faces.
- Overflow actions must remain keyboard-accessible and honor variant-in-progress disabling; exercise variant and back-face suites.
- Collapsed organization controls must retain their values without changing autosave/undo; exercise tags and creator after reopening.
- Long art-style names and uploaded file names must wrap without horizontal overflow; check narrow browser viewport and upload tests.
- Existing editor controls and any EditField consumers must retain correct accessible names and paired-field behavior; run textarea, stats, and specialized-type suites.

---

### Task 1: Sectioned form and accessible controls

**Files:**
- Modify: `src/components/CardEditor/CardEditor.tsx`
- Modify: `src/components/CardEditor/EditField.tsx`
- Create: `src/components/CardEditor/CardEditor.layout.test.tsx`
- Update existing editor tests only where actions intentionally move into the overflow menu.

**Interfaces:**
- Consumes: existing `CardEditorInterface`, `InputConfigInterface`, `EditFieldInterface`, and persistence handlers.
- Produces: unchanged CardEditor public props; semantic named sections; labeled controls; optional organization disclosure; accessible favorite and overflow actions.

- [ ] **Step 1: Write failing layout tests.** Follow the Store fixture and jsdom polyfills in `CardEditor.favorite.test.tsx`. Assert headings for the three main sections; no tabs or Save Changes action; automatic-saving copy; field DOM order `name`, `nickname`, `manaCost`, `rarity`, `cardTypes`, `cardSubTypes`; half-width name and subtype wrappers; organization disclosure contains tags and creator when opened. Assert the favorite button keeps its existing accessible name and pressed state, and Create Variant / back-face actions are usable through the overflow trigger. Add tests for a basic land and back face retaining their conditional fields, organization edits surviving collapse/reopen, and labels targeting their controls.
- [ ] **Step 2: Run `npm test -- --run src/components/CardEditor/CardEditor.layout.test.tsx`.** Confirm failures correspond to the missing layout and accessible labeling.
- [ ] **Step 3: Implement grouped rendering in CardEditor.** Keep `inputConfig` and its conditional logic; group by field key into essentials, words/abilities (including specialty dividers), artwork/frame, and organization. Filter zero-width fields before rendering. Keep name half-width even without nickname; set type/subtype half-width. Keep mana immediately before rarity when present. Move stats and boolean fields into essentials; creator/tags into organization. Preserve a single instance of each field and keep stable React keys.
- [ ] **Step 4: Implement header/footer actions.** Use antd Dropdown and accessible icon buttons with existing action names and handlers; preserve loading, permissions, face switching, and deletion confirmation. Keep Undo Changes neutral and Delete Card dangerous in the footer. Do not modify saving logic or show an unverified “saved” state.
- [ ] **Step 5: Label EditField controls.** Use stable instance-safe IDs with `useId` and associated labels for simple controls, accessible group names for compound/radio controls, and semantic section headings for specialty dividers. Preserve upload handling and multiline/list serialization. Add an accessible upload-button label; do not add sample-only symbol controls.
- [ ] **Step 6: Run `npm test -- --run src/components/CardEditor`.** Update tests for intentional menu navigation, not weaker behavior. Run tags-related tests if outside that directory. Expect all editor regressions to pass.
- [ ] **Step 7: Review the diff.** Confirm no action, type condition, persistence behavior, or unrelated user work was removed. Commit only if the user requests commits.

### Task 2: Compact scoped styling and verification

**Files:**
- Modify: `src/components/CardEditor/styles.module.scss`
- Modify: `src/components/CardEditor/CardEditor.tsx` only for local antd theme tokens and presentation classes.
- Test: `src/components/CardEditor/CardEditor.layout.test.tsx` and existing editor suites.

**Interfaces:**
- Consumes: Task 1 semantic sections and stable field wrappers.
- Produces: compact responsive styling matching the spec, without application-wide CSS changes.

- [ ] **Step 1: Apply the approved visual values.** White surface; subtle green-gray border; approximately 14–16px outer radius; unaccented header; 13px labels/input text; 16px semibold section headings; 10px field row gap, 14px column gap, 15px vertical section padding. Use 20px horizontal padding (16px narrow), soft 8px input corners, restrained green selected/focus states, neutral Undo, red-outline Delete. Style local antd controls through scoped selectors/tokens; retain auto-growing textareas.
- [ ] **Step 2: Handle specialized controls.** Preserve split-input proportions and separators, list actions, tooltip positioning, upload filename wrapping, and selectable art-style options. Make optional-control rows reflow without empty slots or overflow; do not impose fixed textarea heights that truncate existing content.
- [ ] **Step 3: Run `npm test -- --run src/components/CardEditor`, then `npm test -- --run`, `npm run lint`, and `npm run build`.** Record exact results and separate pre-existing failures from introduced ones. Use existing formatter on changed source files only if needed.
- [ ] **Step 4: Inspect in-browser at narrow and desktop editor widths.** Use the real app and middleware when available; otherwise use isolated representative fixtures without committing a mock backend. Verify all three headings, organization disclosure, long art styles/upload names, overflow menu keyboard operation, no horizontal scrolling, and readable labels. Confirm existing external live preview still updates.
- [ ] **Step 5: Review the final diff and provide a concise outcome.** Identify files changed and verification results. Do not commit unrelated changes or claim unavailable backend checks passed.
