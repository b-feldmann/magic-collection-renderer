# Concurrent Card Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent stale card snapshots from overwriting unrelated edits or concurrent ratings, while returning the complete server card to refresh client state.

**Architecture:** Add an authenticated `PATCH /cards/:uuid` endpoint that atomically applies changed Mongo paths and responds with the full updated card. Add an authenticated rating operation endpoint that atomically moves/removes one voter UUID between `meta.likes` and `meta.dislikes`. The renderer sends ordinary edits as path-level diffs, retains the existing full replacement path for variant/create recovery operations, and dispatches full server responses.

**Tech Stack:** Express, MongoDB Node driver, TypeScript, Jest/Supertest; React, Axios, Vitest.

**Spec:** Approved scope in the conversation on 2026-10-28.

## Global Constraints

- Keep the current renderer and middleware workspaces; do not move the session.
- Authenticate all new middleware endpoints using `ACCESS_KEY` and the established API response shape.
- Preserve the existing full-card `PUT /cards` behavior for variant persistence and recovery.
- Use Mongo atomic updates for patches and ratings; never replace rating arrays from a stale client snapshot.
- Preserve existing base64 image upload/loading-cover behavior during ordinary card updates.
- No new dependencies.

## Review Focus

- Two stale clients editing different fields must retain both changes: middleware patch test applies independent paths to the latest document.
- Two voters acting on the same stale card must both remain in the vote arrays: middleware rating test applies concurrent-style operations sequentially to shared state.
- Invalid keys, malformed IDs/paths/rating inputs, and missing cards must not write: route tests cover validation and status codes.
- Image uploads and variant creation must retain existing behavior: renderer action/variant tests cover the existing persistence route.
- A successful patch/rating response must refresh the complete local card: renderer action tests assert the full response is dispatched and cached.

---

### Task 1: Add atomic partial card updates to middleware

**Files:**
- Modify: `C:\Users\benja_y92m506\OneDrive\Dokumente\repos\magic-collection-middleware\src\routes\cards.ts`
- Create: `C:\Users\benja_y92m506\OneDrive\Dokumente\repos\magic-collection-middleware\tests\cards.patch.test.ts`

**Interfaces:**
- `PATCH /cards/:uuid` body: `{ accessKey: string, set: Record<string, unknown>, unset?: string[] }`.
- Response: `{ card: CardInterface }` containing the complete post-update document with `uuid` mapped from Mongo `_id`.
- Use `findOneAndUpdate` with `$set`, `$unset`, and `meta.lastUpdated`; return the document after update.

- [ ] **Step 1: Write failing route tests** for patching selected nested paths while preserving unrelated current fields, applying unsets, returning the full card, rejecting bad access keys/IDs/paths, and returning 404 for missing cards.
- [ ] **Step 2: Run `npm test -- --runInBand tests/cards.patch.test.ts`** in the middleware workspace; confirm expected route failures.
- [ ] **Step 3: Implement the authenticated patch route** with safe path validation (reject `_id`, `uuid`, empty/dotted-invalid paths, and Mongo operator paths), atomic update operators, and full-card response.
- [ ] **Step 4: Re-run the focused test** and confirm all route tests pass.

### Task 2: Add atomic rating operations to middleware

**Files:**
- Modify: `C:\Users\benja_y92m506\OneDrive\Dokumente\repos\magic-collection-middleware\src\routes\cards.ts`
- Modify: `C:\Users\benja_y92m506\OneDrive\Dokumente\repos\magic-collection-middleware\tests\cards.patch.test.ts`

**Interfaces:**
- `PUT /cards/:uuid/rating` body: `{ accessKey: string, userUuid: string, rating: 'like' | 'dislike' | null }`.
- Response: `{ card: CardInterface }` containing the complete post-update document.
- `like` adds the voter to likes and removes them from dislikes; `dislike` does the inverse; `null` removes the voter from both arrays.

- [ ] **Step 1: Write failing tests** for preserving two distinct users' votes from the same initial state, switching/removing one user's vote without affecting others, validating inputs/auth, and missing cards.
- [ ] **Step 2: Run the focused middleware test** and confirm the new route is missing/failing.
- [ ] **Step 3: Implement the rating route** using an atomic aggregation update with `$setUnion`/`$setDifference` and return the full card.
- [ ] **Step 4: Re-run middleware card route tests** and confirm they pass.

### Task 3: Send frontend diffs and rating intents; reconcile full responses

**Files:**
- Modify: `src/actions/cardActions.ts`
- Modify: `src/actions/cardActions.test.ts`
- Modify: `src/components/BigCardRenderModal/BigCardRenderModal.tsx`
- Modify: `src/components/BigCardRenderModal/BigCardRenderModal.variants.test.tsx`
- Modify: `src/MobileApp.editor.test.tsx`

**Interfaces:**
- `updateCard(dispatch, updated)` computes changed Mongo paths against the latest locally saved card, sends `PATCH /cards/:uuid`, caches and dispatches the full returned card, and preserves image preparation behavior.
- Add `updateCardRating(dispatch, cardUuid, userUuid, rating)` sending `PUT /cards/:uuid/rating`, then caching and dispatching the complete returned card.

- [ ] **Step 1: Write failing renderer tests** proving ordinary edits send only changed paths and merge returned full cards, mobile autosaves use the patch route, and rating intent sends the dedicated request and dispatches its complete response.
- [ ] **Step 2: Run focused renderer tests** and confirm failures are caused by the missing patch/rating client behavior.
- [ ] **Step 3: Implement client diffing and response reconciliation**, keeping full `persistCard` for variant/recovery paths and preserving uploaded-image transformation.
- [ ] **Step 4: Update rating controls** to submit the desired per-user rating rather than full stale `likes`/`dislikes` arrays.
- [ ] **Step 5: Run focused renderer tests**, then the complete renderer and middleware test suites plus both builds/lints.
