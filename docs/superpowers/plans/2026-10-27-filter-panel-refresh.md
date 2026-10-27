# Compact Filter Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the user-approved, narrow, vertically compact filter mockup to the collection sidebar.

**Architecture:** Keep the existing React filter state, callbacks, and collection-derived options. Refresh the component markup and scoped SCSS; align the surrounding sort controls and sidebar width with the approved layout. No new dependencies or state library.

**Tech Stack:** React 19, TypeScript, antd 6, SCSS modules, Vitest, Testing Library.

**Spec:** User-approved design in this conversation; visual reference: `.superpowers/brainstorm/139-1793137425/content/filter-panel-dense.html` (local ignored artifact).

## Global Constraints

- Approved desktop panel width: 288px, including its border.
- Match the Card Editor: rounded white surface, sage selections, muted counts, quiet dividers, numbered sections.
- Compact rows: approximately 30px; section padding: 14px; option gap: 5px.
- Two-column types, colors, and rarities, with readable labels and counts.
- Creators, Tags, and Display settings are initially collapsed and keyboard-operable.
- Preserve all actual options, dynamic counts, default selections, and filtering semantics; do not import sample mockup data.
- Add the mockup's Reset all action for filter selections and name search; do not reset sort or display preferences.
- Keep mobile's search-only rendering working when optional callbacks are absent.
- Do not overwrite unrelated work, especially existing changes to `src/App.module.scss`.

## Review Focus

- Empty collection and absent optional callbacks must not cause update loops or display nonfunctional filter controls.
- Long creator names and tags must not force the sidebar wider or hide counts.
- Changing tabs must preserve existing creator/tag reconciliation behavior.
- Reset must update both the search field and the parent callbacks without changing sort or density.
- Collapsible sections and checkbox selections must remain accessible by keyboard.

### Task 1: Refresh filter controls and preserve behavior

**Files:**
- Modify: `src/components/CollectionFilterControls/CollectionFilterControls.tsx`
- Modify: `src/components/CollectionFilterControls/styles.module.scss`
- Test: `src/components/CollectionFilterControls/CollectionFilterControls.test.tsx`

**Interfaces:** Preserve the existing `CollectionFilterControlsInterface` and `CollectionFilterInterface`. The component owns its search input value so Reset all can clear it.

- [ ] Add tests for section headings, labeled search, collapsed groups, readable rarity labels/counts, and checkbox dispatch behavior. Update old icon-only rarity expectations to match the approved visible-label layout.
- [ ] Add tests for reset after search and deselection, empty collections, omitted optional callbacks, dynamic creator/tag changes, and long option labels. Use real input props in the antd mock and keyboard-accessible native disclosure elements.
- [ ] Run `npm test -- --run src/components/CollectionFilterControls/CollectionFilterControls.test.tsx`; confirm new assertions fail for the intended missing UI/behavior.
- [ ] Implement compact section markup, two-column option rows, muted counts, collapsed secondary groups, Reset all, and a live filter-status footer. Keep existing filtering logic and public callbacks unchanged.
- [ ] Replace legacy broad child styling with scoped layout classes. Ensure long labels wrap or truncate with an accessible full name, and counts remain visible.
- [ ] Rerun the focused tests; expect all to pass.

### Task 2: Integrate the approved sidebar layout

**Files:**
- Modify: `src/App.tsx`
- Modify carefully: `src/App.module.scss`
- Add: `src/App.filterPanel.test.tsx`

**Interfaces:** Keep existing sort state, sort callbacks, and `CollectionFilterControls` props. The desktop shell supplies the Filters header and numbered Sort & order section; continue numbering filter sections consistently with the mockup.

- [ ] Add regression assertions for the 288px sidebar, matching collection offset, labeled Sort by/Then by controls, and unchanged sort callbacks; confirm they fail before implementation.
- [ ] Apply the shell header/sort styling, 288px desktop width, and matching collection offset without disturbing existing editor-width changes. Keep the existing below-900px sidebar hiding behavior and bottom action buttons.
- [ ] Run focused component and shell tests, then `npm test -- --run`, `npm run lint`, and `npm run build`; record failures separately if they originate in unrelated existing work.
- [ ] Inspect the rendered desktop panel against the approved mockup, including expanded groups, long labels, all rarity names, keyboard focus, mobile search, and no horizontal overflow.
- [ ] Review only the task's diff. Do not commit unrelated files; make no commit unless the user requests one.
