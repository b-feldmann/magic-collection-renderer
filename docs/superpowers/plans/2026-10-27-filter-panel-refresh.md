# Compact Filter Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the user-approved, narrow, vertically compact filter mockup to the collection sidebar.

**Architecture:** Keep the existing React filter state, callbacks, and collection-derived options. Refresh the component markup and scoped SCSS; align the surrounding sort controls and sidebar width with the approved layout. No new dependencies or state library.

**Tech Stack:** React 19, TypeScript, antd 6, SCSS modules, Vitest, Testing Library.

**Spec:** User-approved design in this conversation; final visual reference: `.superpowers/brainstorm/139-1793137425/content/filter-panel-clean-footer.html` (local ignored artifact).

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
- Work directly on `master`, as explicitly requested; do not commit or change branches.
- Pin Create card, Edit mechanics, and the current-user selector below the independently scrolling filters.
- Subtle top/bottom shadows appear only when more filter content exists in that direction.
- Do not display the removed “All filters included” / “Live filtering” status row.
- Preserve JSON export and Reload in a compact overflow menu beside the user selector.
- Reset restores actual defaults: types/colors/rarities/creators enabled; tags unselected.

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
- Create: `src/components/CollectionFilterControls/FilterScrollRegion.tsx`
- Test: `src/components/CollectionFilterControls/FilterScrollRegion.test.tsx`

**Interfaces:** Preserve existing props and `CollectionFilterInterface`. Add optional `sortControls: React.ReactNode` to position desktop sort controls after search. The component owns its header, search value, reset action, and scroll region; mobile remains search-only when optional callbacks are absent.

- [ ] Add tests for section headings, labeled search, collapsed groups, readable rarity labels/counts, and checkbox dispatch behavior. Update old icon-only rarity expectations to match the approved visible-label layout.
- [ ] Add tests for reset after search and deselection, empty collections, omitted optional callbacks, dynamic creator/tag changes, and long option labels. Use real input props in the antd mock and keyboard-accessible native disclosure elements.
- [ ] Run `npm test -- --run src/components/CollectionFilterControls/CollectionFilterControls.test.tsx`; confirm new assertions fail for the intended missing UI/behavior.
- [ ] Implement compact section markup, two-column option rows, muted counts, collapsed secondary groups, Reset all, and conditional scroll shadows without a status footer. Test top/middle/bottom/non-overflow shadows and resize/content-change cleanup. Keep existing filtering logic and public callbacks unchanged.
- [ ] Replace legacy broad child styling with scoped layout classes. Ensure long labels wrap or truncate with an accessible full name, and counts remain visible.
- [ ] Rerun the focused tests; expect all to pass.

### Task 2: Integrate the approved sidebar layout

**Files:**
- Modify: `src/App.tsx`
- Modify carefully: `src/App.module.scss`
- Add: `src/App.filterPanel.test.tsx`

**Interfaces:** Keep existing sort state and callbacks. The desktop shell supplies the numbered Sort & order section through `sortControls`; the filter component owns the Filters header and reset action.

- [ ] Add regression assertions for the 288px sidebar, matching collection offset, labeled Sort by/Then by controls, and unchanged sort callbacks; confirm they fail before implementation.
- [ ] Apply sort styling, 288px desktop width, and matching collection offset without disturbing existing editor-width changes. Keep the existing below-900px sidebar hiding behavior. Pin Create card, Edit mechanics, and a real-user selector to the bottom; retain switch confirmation and preserve JSON/Reload in an overflow menu. Add tests for creation, mechanics, user switching confirmation/cancellation, and overflow actions.
- [ ] Run focused component and shell tests, then `npm test -- --run`, `npm run lint`, and `npm run build`; record failures separately if they originate in unrelated existing work.
- [ ] Inspect the rendered desktop panel against the approved mockup, including expanded groups, long labels, all rarity names, keyboard focus, mobile search, and no horizontal overflow.
- [ ] Review only the task's diff. Do not commit unrelated files; make no commit unless the user requests one.

### Task 3: Reuse the approved actions on mobile (user-requested follow-up)

**Files:**
- Create: `src/components/CollectionActions/CollectionActions.tsx` and `styles.module.scss`
- Modify: `src/App.tsx`, `src/App.module.scss`, `src/MobileApp.tsx`
- Test: `src/App.filterPanel.test.tsx`, `src/MobileApp.editor.test.tsx`

**Interfaces:** Shared presentational `CollectionActions` accepts current user, available users, create/edit/switch/reload callbacks, optional download callback, and a mobile layout flag. Confirmation gates user switching in both layouts. Existing mobile creation automatically opens the card editor.

- [ ] Add failing mobile tests for Create card, Edit mechanics, confirmed real-user switching, and Reload overflow. Update existing mobile creation tests to the approved Create card label.
- [ ] Extract the desktop actions and their styles into the shared component without changing desktop behavior. Use it on mobile and add the existing mechanics modal to mobile, closing any card modal before opening mechanics.
- [ ] Use two touch-friendly 44px buttons side by side on narrow portrait mobile, with the account row below. Retain stacked actions on the narrow tablet sidebar. Remove legacy descendant-margin overrides that distort the new controls.
- [ ] Run mobile editing/variant and action tests, full suite, scoped lint and build; inspect mobile geometry and desktop parity; request a final read-only review of this follow-up.

## Execution result

Implemented directly on `master`, without commits or changes to unrelated work.

- Shared `CollectionActions` now serves desktop and mobile; mobile retains its real creation/editor flow and gains mechanics access.
- Tablet fix: `MobileApp` explicitly uses `Row wrap={false}`. Its collection can shrink (`min-width: 0; flex: 1 1 0`) while retaining full width in portrait, rather than pushing controls below the collection.
- Verified actual phone/tablet geometry at390×844 and768×1024: no horizontal overflow; actions remain within the viewport. Further manual checks stopped when the user requested it.
- Latest tablet/action regressions:11/11 pass. Earlier mobile editor/variant/action run:45/45 pass. Filter/shadow/layout tests also pass.
- Final changed-file ESLint check and `npm run build`: pass. Build retains existing Tailwind/CSS and chunk-size warnings.
- Full suite was run:728 passed,1 failed. The failure is unrelated concurrent Symbol Guide work: `src/components/CardEditor/EditField.symbols.test.tsx` → `Card Text symbol toolbar > hides the guide link on mobile while retaining quick inserts and manual code entry`. No unrelated fix was attempted.
- Independent read-only desktop/mobile reviews found no Critical or Important issues. Deferred minor: the inherited tag-reconciliation comment incorrectly says newly available tags default checked; actual defaults and tests correctly use unselected tags.

### Implementation decisions

- Current master checkout rather than a worktree: explicitly requested; concurrent edits remain possible.
- Final mockup supersedes the initial status-footer design: no “All filters included”/“Live filtering” row; a visual revision would be needed to restore it.
- Reset uses real tag defaults (false), not prototype sample checks: avoids excluding untagged cards.
- JSON and Reload use overflow: retains functionality with one extra discovery click; mobile still has no JSON export, matching its previous behavior.
- Filter controls own header/reset and accept an optional sort-controls slot: avoids imperative reset refs; adds one optional prop.
- Shared mobile/desktop actions avoid duplicated switching/styling; changes require both layouts' regression checks.
- Tablet sizing and no-wrap changes are narrowly scoped to the mobile shell; layout regressions are protected by tests.
- Reviewer set aside independent browser/backend/full-suite verification and existing mechanics-modal responsiveness. Executor checked real geometry, ran automated verification, and stopped further manual checks on user request; live creation/editing was not performed solely for verification.
