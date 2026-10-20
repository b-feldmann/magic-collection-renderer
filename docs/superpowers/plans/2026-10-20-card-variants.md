# Card Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create independently editable card variants stored as reciprocal ID lists and displayed as one collection carousel.

**Architecture:** Pure utilities construct variant families; axios actions persist copies and membership through existing endpoints. The collection groups before virtualization and keeps selected slides outside recycled cells. The editor creates a variant from its current contents while preserving membership during later saves.

**Tech Stack:** React 19, TypeScript, antd 6, context/useReducer, axios, Vitest, npm.

**Spec:** `docs/superpowers/specs/2026-10-20-card-variants-design.md`

## Global Constraints

- Keep React context/reducer state, axios actions, existing server endpoints, and npm tooling. Add no dependencies or middleware changes.
- Obtain new IDs through POST `/cards`; PUT persists the copied card and reciprocal membership. Do not generate UUIDs for persisted Mongo-backed cards.
- Leave existing unrelated workspace changes untouched.
- Do not add linking/unlinking of existing cards, synchronized editing, variant labels, or changes to PDF/export/deck/statistics semantics.

## Review Focus

- Unloaded uploaded art must be copied by data, not just by its source-card image reference.
- Creating a third member from a variant must update all three lists without self-links or duplicates.
- Failed writes must not select an incomplete variant or silently claim success; recovery failures must be visible.
- Recycled grid cells and changing filters must not apply the wrong selected variant to another family.
- Pending editor autosave or undo must not erase updated family links.

---

### Task 1: Family model and grouping

**Files:** Modify `src/interfaces/CardInterface.ts`; create `src/utils/cardVariants.ts` and `src/utils/cardVariants.test.ts`.

**Interfaces:** Produce `getVariantGroups(cards: CardInterface[], allCards?: CardInterface[]): CardInterface[][]` and `getVariantFamily(card: CardInterface, cards: CardInterface[]): CardInterface[]`.

- [ ] Write tests asserting ordinary cards remain separate; reciprocal, one-way, and transitive links form one family; self/duplicate/missing IDs do not create phantom tiles; group ordering is deterministic; filtered members admit their full family.
- [ ] Run `npm test -- --run src/utils/cardVariants.test.ts`; confirm failures indicate missing grouping behavior.
- [ ] Add optional `variantIds?: string[]`. Implement connected-family grouping with ID maps and deterministic member ordering by `meta.createdAt`, then UUID. Preserve first matching family position in the filtered list.
- [ ] Re-run utility tests and confirm all assertions pass.
- [ ] Review the diff and commit only this task's files if commits are requested.

### Task 2: Persist creation, art, and deletion

**Files:** Modify `src/actions/cardActions.ts`, `src/actions/cardActions.test.ts`, and, if needed for awaited image persistence, `src/actions/imageActions.ts` and its tests. Modify `src/reducer.ts`; add reducer regression tests beside existing reducer tests.

**Interfaces:** Consume Task 1 utilities. Produce `createCardVariant(dispatch: (value: Action) => void, source: CardInterface, cards: CardInterface[], creator: UserInterface): Promise<void>`. Extend `deleteCard` with optional collection argument for family cleanup, preserving existing two-argument callers.

- [ ] Write tests for new-card allocation, copied nested face contents, default metadata, two/three-way reciprocal lists, and existing source immutability. Assert that `CreateCard` is dispatched only after successful persistence and identifies the new card.
- [ ] Write art tests covering both faces, external URLs, base64 covers, and unloaded uploaded covers; assert new image writes use the new ID and preserve filenames.
- [ ] Write failure tests for allocation, image copy, copied-card save, and sibling saves; assert rejection, attempted rollback, no success selection, and visible recovery errors.
- [ ] Write deletion tests asserting remaining links are persisted and removed locally, including transition to a single ordinary card; cover failed deletion and cleanup writes.
- [ ] Run `npm test -- --run src/actions/cardActions.test.ts` and reducer/image tests; confirm expected failures before implementation.
- [ ] Implement creation using server allocation, deep copying, awaited image persistence, reciprocal updates, and best-effort rollback. Publish local creation only after successful storage writes. Implement deletion cleanup with explicit error propagation; strip deleted IDs in reducer state without mutating original cards.
- [ ] Re-run action, reducer, and image tests; confirm passing.
- [ ] Review the diff and commit only this task's files if commits are requested.

### Task 3: Collection carousel and grouped counts

**Files:** Modify `src/components/CardCollection/CardCollection.tsx`, `src/components/CardCollection/Cell.tsx`, `src/components/CardCollection/styles.module.scss`, `src/App.tsx`, and `src/MobileApp.tsx`; create collection component tests.

**Interfaces:** Consume `getVariantGroups`. Add optional `allCards?: CardInterface[]` to `CardCollectionInterface`. Pass grouped membership and stable selected IDs from the collection to cells; retain existing selected-card action signatures.

- [ ] Write tests asserting a family takes one grid position, an ordinary card has no controls, next/previous update the rendered UUID and position, and edit/seen/face actions target the selected member.
- [ ] Write tests covering filtered matching variants, selected-member image loading, complete final-row loading, persistent selection after reordering, and fallback after selected-member deletion.
- [ ] Run `npm test -- --run src/components/CardCollection`; confirm failures are for missing carousel/group behavior.
- [ ] Group before computing grid rows; keep family selection outside cells. Add accessible previous/next buttons and position indicator with no auto-rotation. Render only the active member and load its images. Supply full merged collections from desktop/mobile and use grouped counts in tab badges.
- [ ] Re-run collection tests and utility tests; confirm passing.
- [ ] Review the diff and commit only this task's files if commits are requested.

### Task 4: Editor creation and verification

**Files:** Modify `src/components/CardEditor/CardEditor.tsx`; create `src/components/CardEditor/CardEditor.variants.test.tsx`; adjust existing action mocks only where necessary.

**Interfaces:** Consume `createCardVariant` and the store's latest `cards`. Use the existing reducer `newUuid` flow to open the new variant.

- [ ] Write tests asserting **Create Variant** is absent for the dummy card, copies current unsaved editor contents for a saved card, disables duplicate submissions, handles rejection without unhandled promises, and uses current collection membership for autosave/undo after family changes.
- [ ] Run `npm test -- --run src/components/CardEditor/CardEditor.variants.test.tsx`; confirm expected failures.
- [ ] Add creation button/pending state and guarded async handler. Cancel stale pending saves as needed, preserve unsaved source edits, and merge latest family membership into editor save snapshots. Pass collection to deletion for link cleanup.
- [ ] Re-run editor/action/collection tests; confirm passing.
- [ ] Run `npm test -- --run`, `npm run lint`, and `npm run build`. Record exact failures if any; distinguish pre-existing issues without discarding user work.
- [ ] Review the whole diff against the spec, update this checklist with verification outcomes, and report remaining server-transaction limitations.

## Execution

Approved for native execution in the current workspace. All four tasks and the independent final review are complete; see `2026-10-20-card-variants-progress.md` for RED→GREEN evidence and the final fix pass. Final verification: 460/460 tests, production build, and lint pass (one pre-existing lint warning). Changes remain uncommitted; no branch integration was requested.
