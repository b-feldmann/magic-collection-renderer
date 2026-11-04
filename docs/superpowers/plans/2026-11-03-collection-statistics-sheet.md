# Collection Statistics Bottom Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved expandable statistics preview above the card collection, including shared-scale individual charts and expanded-only rarity.

**Architecture:** Extract testable curve aggregation and reusable stacked/individual chart rendering from CollectionStats. Keep sheet interaction state local to CollectionStats; anchor the desktop sheet to the collection column and reuse expanded contents in the existing mobile drawer through `fillHeight`.

**Tech Stack:** React 19, TypeScript, SCSS modules, existing mana/color/variant helpers, Vitest and Testing Library. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-03-collection-statistics-sheet-design.md`

**Execution status:** All four tasks implemented and verified. Final verification: 863 tests pass across 92 files, production build passes, lint has no errors (two pre-existing warnings). Fresh-context review's contrast finding fixed with a failing-then-passing accessibility test. Execution ledger/logs are in the ignored `.superpowers/sdd/2026-11-03-collection-statistics-sheet/` directory. The collapsed panel is 300px instead of approximately 270px so real app fonts/legends fit without reducing the approved plot height. Changes remain uncommitted; existing unrelated edits were preserved.

## Global Constraints

- No backend/API, card editing, filter, or variant membership changes.
- No global state-management additions or new dependencies.
- Preserve all pre-existing uncommitted user changes, especially mobile drawer behavior and `fillHeight` support.
- Tests cover behavior, semantics, accessibility, meaningful layout outcomes, and arithmetic, not exact decorative pixel values.
- Follow-up requirement: include lands (including Basic Land and creature lands) in color curves at mana value 0; other curves and average/2–3 statistics continue to exclude lands.
- Use eight aligned display buckets: 0, 1, 2, 3, 4, 5, 6, 7+. Compute average from actual mana values before grouping 7+.
- Every individual chart within a section uses one shared count maximum; never independently normalize charts.

## Review Focus

- Empty/all-land filtered collections: totals stay finite, shared scales remain meaningful, and empty tags show an explicit state (Task 1/2).
- Variant-only filter matches: retain canonical first-variant values, never duplicate family counts (Task 1).
- Overlapping tags and multi-type cards: tag matches may exceed card counts; exclusive primary types keep type stacks truthful (Task 1).
- Pointer cancellation, diagonal gestures, and drag-followed-by-click: expansion changes only on valid input and never immediately reverses (Task 3).
- Existing mobile drawer and desktop editor: no nested sheet, clipped bottom cards, overlay across the editor, or grid resize when opening (Task 4).

---

## File map

- Create `src/components/CollectionStats/collectionStatsData.ts` and `.test.ts`: data types, categories, aggregation and scales.
- Create `src/components/CollectionStats/ManaCurveChart.tsx` and `.test.tsx`: stacked/single chart rendering, count labels, axis descriptions, empty states.
- Modify `src/components/CollectionStats/CollectionStats.tsx` and `.test.tsx`: preview/expanded sections, metrics, interaction, mobile embedded mode; preserve old named data-builder import via re-export.
- Modify `src/components/CollectionStats/collectionStats.module.scss`: approved visual styling, responsive charts, overlay transitions, reduced motion.
- Modify `src/App.module.scss`: collection positioning and constant preview-height reserve, leaving editor positioning unchanged.
- Modify `src/App.filterPanel.test.tsx`: preserve filtered/tabbed statistics integration under the new data/preview semantics.
- Inspect/preserve `src/MobileApp.tsx` and `src/MobileApp.editor.test.tsx`; change only if necessary for compatibility, not to replace the existing drawer.

### Task 1: Canonical nonland curve model

**Files:** Create `collectionStatsData.ts` and `collectionStatsData.test.ts` under `src/components/CollectionStats/`; modify existing CollectionStats data tests/imports.

**Interfaces:**
- Consumes `CardInterface`, `getVariantGroups`, `cardToColor`, `getConvertedManaCost`.
- Produces `ChartCategory = { key: string; label: string; color: string }`, `ManaCurvePoint = { cmc: number } & Record<string, number>` and `ManaCurveData` containing `colors`, `rarities`, `types`, `tags`, `tagCategories`, and `summary`.
- `summary: { cardCount: number; nonlandCount: number; landCount: number; averageManaValue: number; twoToThreeCount: number; twoToThreePercent: number }`.
- Export `buildManaCurveData(collection: CardInterface[], allCards?: CardInterface[]): ManaCurveData`, category constants, and `getSharedCountMaximum(data: ManaCurvePoint[], categories: ChartCategory[], layout: 'stacked' | 'individual'): number`. Return at least 1 for empty scales.

- [ ] **Step 1:** Write arithmetic tests: costs 2, 3, 8 plus a land produce nonlandCount 3, landCount 1, actual average 13/3, twoToThreeCount 2, rounded percent 67, and a 7+ bucket containing the eight-drop.
- [ ] **Step 2:** Add tests for all seven exclusive color groups, all rarity groups, separate Instant/Sorcery, Creature precedence on artifact creatures, land precedence, Other/Planeswalker, canonical variants matched through an alternate, duplicate tags, and overlapping tag totals.
- [ ] **Step 3:** Add empty/all-land tests and assert all four section arrays use cmc keys `[0,1,2,3,4,5,6,7]`. Shared maximum distinguishes largest segment from largest stack and is at least 1.
- [ ] **Step 4:** Run `npm test -- --run src/components/CollectionStats/collectionStatsData.test.ts`; confirm tests fail for missing/new behavior.
- [ ] **Step 5:** Extract the aggregation, implement the specified model and stable primary-type categories, and re-export `buildManaCurveData` from CollectionStats for existing import compatibility. Avoid changing shared mana/color utilities.
- [ ] **Step 6:** Run the data tests; expect all pass. Update old builder tests to the approved eight-bucket/nonland/separate-type semantics without dropping variant/tag regressions.

### Task 2: Readable charts and expanded sections

**Files:** Create `ManaCurveChart.tsx` and `.test.tsx`; modify CollectionStats and its SCSS/tests.

**Interfaces:**
- Consumes Task 1 types/categories and `getSharedCountMaximum`.
- Produces `ManaCurveChart({ title, data, categories, maxCount, layout, compact?, countUnit? }): React.JSX.Element`, where layout is `'stacked' | 'individual'`, compact is boolean, and countUnit is `'cards' | 'tag matches'`.
- Single charts pass a one-category array and the section's shared maximum. All charts retain accessible figures/descriptions and visible mana-value ticks.

- [ ] **Step 1:** Write failing tests for eight aligned ticks (last displayed `7+`), exact per-category counts, tag-match copy, total stack count, readable empty state, and a supplied shared scale being applied equally to two charts with unequal maxima.
- [ ] **Step 2:** Run `npm test -- --run src/components/CollectionStats/ManaCurveChart.test.tsx`; expect missing behavior to fail.
- [ ] **Step 3:** Implement the chart and section rendering, using the approved subdued panels/category colors and approximately 120px desktop preview plots. Keep compact previews uncluttered; full charts show counts and accessible bucket detail. Escape tag labels through React, never raw HTML.
- [ ] **Step 4:** Add expanded sections for Color, Card Type, Tags, Rarity with explicit `Shared scale: 0–{maximum} {cards|tag matches} · mana values 0–7+` copy. Display summary metrics, zero-safe values, and overlapping-tag explanations.
- [ ] **Step 5:** Test seven color charts, the five default type charts plus present extra types, all four rarity charts, dynamic tag charts, and changed shared-scale/metrics after rerendering with filtered input.
- [ ] **Step 6:** Run chart/data tests; expect all pass.

### Task 3: Bottom sheet interaction

**Files:** Modify `CollectionStats.tsx`, `CollectionStats.test.tsx`, `collectionStats.module.scss`.

**Interfaces:**
- Preserve `CollectionStats({ collection, allCards?, fillHeight? })`.
- Desktop local state: `expanded: boolean` initially false and `layout: 'stacked' | 'individual'`. Expansion selects individual layout; collapse restores compact stacked previews.
- `fillHeight: true` starts in expanded individual content inside the existing drawer, with layout switching but no second sheet/drag/collapse controls.

- [ ] **Step 1:** Write failing tests for three collapsed previews (Color, Card Type, Tags), no collapsed Rarity, Expand selecting Individual, layout switching across all four expanded groups, Collapse, Escape, and handle Enter/Space/ArrowUp/ArrowDown.
- [ ] **Step 2:** Add pointer tests for upward/downward release beyond 35px, short/horizontal/cancelled drags not changing state, pointer capture release, and suppression of the click following a drag. Use a minimal jsdom pointer-capture stub if needed.
- [ ] **Step 3:** Run `npm test -- --run src/components/CollectionStats/CollectionStats.test.tsx`; expect new interaction tests to fail.
- [ ] **Step 4:** Implement semantic buttons with `aria-expanded`/`aria-controls`, local state and pointer handling; restore focus on Escape. Preserve the existing `Collection mana curves` region label for integration compatibility.
- [ ] **Step 5:** Implement the compact header, drag handle, animated bounded sheet, scrollable expanded body, responsive horizontal preview overflow, and reduced-motion override. Separate presentation classes for embedded mobile expanded content.
- [ ] **Step 6:** Test `fillHeight` renders expanded charts directly, includes Rarity, supports layout switching, and has no nested expansion controls. Run all CollectionStats tests; expect pass.

### Task 4: Collection overlay integration and final verification

**Files:** Modify `src/App.module.scss`, `src/App.filterPanel.test.tsx`; preserve/test mobile call sites and existing user changes.

**Interfaces:**
- Desktop `.collection` establishes the sheet positioning context; reserve one constant collapsed panel footprint. Opening the sheet changes only its overlay height, not tab/grid height.
- Existing desktop props and mobile `fillHeight` contract remain unchanged.

- [ ] **Step 1:** Update App integration tests to verify filtered counts, reset, canonical tab data, and filters while expanded under the new mana-value/type labels. Preserve meaningful assertions from the old tests.
- [ ] **Step 2:** Run `npm test -- --run src/App.filterPanel.test.tsx src/MobileApp.editor.test.tsx`; record failures before integration changes if any.
- [ ] **Step 3:** Add collection-local overlay anchoring and constant space reservation in `App.module.scss`, preserving the editor width and all existing mobile rules. Avoid modifying unrelated dirty files.
- [ ] **Step 4:** Run focused tests, then `npm test -- --run`, `npm run lint`, and `npm run build`; record pre-existing failures separately from introduced failures. Capture large command output to a temporary log and report only failures/summaries.
- [ ] **Step 5:** In the browser verify preview chart readability, shared-scale labels, pointer/keyboard expansion, Rarity visibility, tag-match copy, scroll-to-last-chart, last card reachability, reduced motion, and narrow layouts. Compare collection/editor bounding boxes before/after expansion: grid/editor dimensions stay stable and sheet stays inside the collection area.
- [ ] **Step 6:** Review the final diff against the initial dirty-file list. Do not commit or revert unrelated changes; provide the changed files, verification results, and any remaining environment limitations.

## Execution/workspace notes

The current workspace already has uncommitted changes in MobileApp, CollectionStats, changelog, and templating files. A fresh worktree would omit the user's active statistics/mobile work; do not switch away or copy/revert changes implicitly. At execution time follow the worktree skill's safety check and choose an explicitly agreed workspace strategy. No commits are planned without separate authorization.

## Self-review

- All approved preview/expanded groups, shared-scale labels, metrics, and overlay/gesture behavior map to Tasks 1–4.
- Task interface names and signatures agree; the public component and builder import remain compatible.
- All five review-focus risks have explicit test/verification steps.
- Changes are confined to the statistics feature, collection positioning, related tests and these documents; backend and editing behavior are out of scope.
