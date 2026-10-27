# Symbol Guide Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing symbol-guide tables with the user-approved interactive guide.

**Architecture:** Keep `EditorTooltip` as the shared antd Popover integration for card text and legacy help triggers. Extract the guide content into a focused React component with scoped SCSS, using the existing `Mana` renderer and browser clipboard API. Do not alter card text insertion or parsing.

**Tech Stack:** React 19, TypeScript, antd 6, SCSS modules, mana-font, Vitest, Testing Library.

**Spec:** `docs/mockups/symbol-guide.html`, approved in this conversation with search removed, four common-symbol tiles half-width, and headings capitalized as below. The mockup's design-exploration banner/background are not part of the shipped guide.

## Global Constraints

- No search bar.
- Exact headings: `Symbol guide`, `Mana & Actions`, `Loyalty`, `Text & Mechanics`, `Hybrid & Phyrexian Mana`.
- Preserve numbered sections 01–03, sage accents, rounded white surfaces, explanations, and expandable advanced mana from the mockup.
- Tap, Untap, Generic mana, and Variable mana remain two equal-width tiles per row, including narrow screens.
- Preserve every existing supported code family, card-name shorthand, mechanic syntax, and loyalty variable examples.
- Click-to-copy must copy valid individual codes: generic copies `{1}`, variable copies `{x}`, not the displayed range/group.
- Use existing dependencies and React state only. Leave unrelated working-tree changes untouched.

## Review Focus

- Clipboard missing or rejected: show selectable code and a useful failure message, never false success.
- Hybrid symbols: retain `ms-cost` to avoid overlapping mana-font halves.
- Keyboard interaction: named buttons, expandable advanced section, close/Escape behavior, focus return.
- Narrow/short viewports: two-column common tiles, no horizontal overflow, vertically scrollable guide.
- Existing editor integration: both explicit and legacy help triggers still work; copying never edits the card or submits a form; disabled editor triggers remain disabled.

---

### Task 1: Build the approved guide content

**Files:**
- Create: `src/components/EditorTooltip/SymbolGuide.tsx`
- Create: `src/components/EditorTooltip/styles.module.scss`
- Create: `src/components/EditorTooltip/SymbolGuide.test.tsx`

**Interfaces:**
- Consumes: existing `Mana` component, `navigator.clipboard.writeText(text: string): Promise<void>`.
- Produces: default `SymbolGuide({ onClose }: { onClose: () => void }): React.JSX.Element`.

- [ ] **Step 1: Write failing content and interaction tests.** Assert all exact headings, absence of search, four named common-symbol buttons, six basic colors, advanced categories and all ten hybrids, four loyalty examples and variable hints, `~`, and all three mechanic forms. Assert the advanced section is initially collapsed and keyboard-operable. Test successful `{t}`, `{ut}`, `{1}`, `{x}`, hybrid, and loyalty copy values; missing/rejected clipboard feedback; close callback; and no form submission when a symbol is clicked inside a form.
- [ ] **Step 2: Run `npm test -- --run src/components/EditorTooltip/SymbolGuide.test.tsx`; confirm failures reflect the absent component.**
- [ ] **Step 3: Implement `SymbolGuide` and scoped styles.** Translate the approved mockup without its standalone page wrapper or prototype-only close behavior. Use immutable module-level symbol data, `Mana cost` for ordinary mana/hybrids and existing loyalty props for loyalty glyphs. Native buttons use `type="button"`, descriptive copy labels, and visible focus styles. Use an accessible live status region for copy results, with selectable code on failure; avoid timers if unnecessary. Use native `details/summary` for advanced mana. Keep two equal columns for common tiles and allow labels/codes to wrap. Make content fit the available viewport with vertical scrolling.
- [ ] **Step 4: Run the content tests again; expect all passing.**

### Task 2: Integrate and verify the popover

**Files:**
- Modify: `src/components/EditorTooltip/EditorTooltip.tsx`
- Modify: `src/components/EditorTooltip/EditorTooltip.test.tsx`
- Modify: `src/components/CardEditor/EditField.symbols.test.tsx`
- Reuse: `src/components/EditorTooltip/styles.module.scss`

**Interfaces:**
- Consumes: `SymbolGuide({ onClose })` from Task 1.
- Preserves: default `EditorTooltip({ className, children }: { className: string; children?: React.ReactNode })`.

- [ ] **Step 1: Update/write failing integration tests.** Replace assertions for `Icon & Mechanic Codes` and the old table range with the new guide heading and generic code reference. Verify the explicit Symbol guide trigger opens it; close and Escape dismiss it and return focus to the explicit trigger; legacy help supports hover and keyboard focus; disabled editor actions remain disabled. Retain the regression test that every hybrid glyph has `ms-cost`.
- [ ] **Step 2: Run `npm test -- --run src/components/EditorTooltip src/components/CardEditor/EditField.symbols.test.tsx`; confirm the new integration assertions fail against the old popover.**
- [ ] **Step 3: Replace the table-based popover content with `SymbolGuide`.** Use controlled open state, a single guide header (no duplicate antd title), and scoped antd 6 semantic root/body styles for radius, padding, width, and viewport limits. Preserve left placement with overflow adjustment. Preserve click behavior for supplied children; make the legacy help trigger focusable and support hover/focus. Respect antd disabled context, close on Escape and the close button, and return focus without trapping it. Do not change `CardTextInput` insertion behavior.
- [ ] **Step 4: Run the focused tests, `npm test -- --run`, `npm run build`, and `npm run lint`.** Record existing unrelated failures separately rather than modifying unrelated files.
- [ ] **Step 5: Verify in-browser at desktop and 360px widths.** Open from the editor, expand advanced mana, inspect hybrid glyphs, copy a code, close with button/Escape, and check common tiles occupy two equal columns. Check no horizontal overflow and that the close control/content remain reachable on a short viewport. If backend data is unavailable, use a local temporary component preview without committing test-only product routes.
- [ ] **Step 6: Review the final diff against the mockup and constraints.** Do not commit or discard unrelated work.

## Self-review

The two tasks cover the approved layout, all retained reference content, clipboard success/failure, hybrid rendering, responsive behavior, accessible dismissal, and existing entry points. No dependency, parser, API, or card-storage changes are needed. Browser verification supplements jsdom where layout and glyph rendering cannot be measured reliably.
