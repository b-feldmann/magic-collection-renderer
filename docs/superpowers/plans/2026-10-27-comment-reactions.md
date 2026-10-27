# Comment Reactions and Chat Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the approved comment mockup throughout the comment area and support shared, persistent emoji reactions.

**Architecture:** Keep React context/reducer and the existing annotation API. Add an idempotent reaction endpoint in the neighboring middleware repository; update only the requesting user's membership in an emoji's reaction group atomically. Render the server-returned annotation through the existing update action, with an accessible emoji picker and reaction chips below each comment.

**Tech Stack:** React 19, TypeScript, antd 6, existing emoji-mart picker, SCSS modules, Express, MongoDB, Vitest/Testing Library, Jest/supertest.

**Spec:** Approved conversation design and `.superpowers/brainstorm/493-1793116481/content/comment-reactions.html`. User additionally approved changes in `../magic-collection-middleware` and requested matching styling for the rest of the chat.

## Global Constraints

- Preserve existing uncommitted work in both repositories; do not commit unrelated changes.
- Use the mock's white rounded panel, subtle shadow, author/time header, gray text, separators, spacing, rounded chips, and blue selected reactions; style the existing composer to match.
- Reveal the add-reaction button on comment hover, click, or keyboard focus; keep it discoverable on touch devices.
- Reactions remain visible under comments, show counts, and toggle the current user's participation. Allow multiple different emojis per user.
- Reuse existing libraries and user-selection/access-key conventions; no new state library or dependency.
- Legacy annotations without reactions must still work; reactions must not modify comment content, author, creation time, or edited status.
- Backend must be deployed alongside the frontend. No local-only fallback masquerading as saved reactions and no new real-time transport.

## Review Focus

- Old comments with no reaction data render and accept their first reaction.
- Duplicate submissions do not double-count; updates for one emoji/user do not overwrite other reactions.
- Unknown users cannot react; keyboard and touch users can open and dismiss the picker.
- Failed saves retain server-confirmed counts, show an error, and allow retry; pending saves prevent repeated clicks.
- Existing comment submission, mana symbols, multiline content, split layouts, header actions, and unread-comment timestamps remain intact.

---

### Task 1: Persistent reactions in middleware

**Files:** Modify `../magic-collection-middleware/src/routes/annotations.ts`; create `../magic-collection-middleware/tests/annotations.reactions.test.ts`.

**Interfaces:** `PUT /annotations/:uuid/reactions` accepts `{ accessKey: string, userUuid: string, emoji: string, active: boolean }`; returns `{ annotation }`. Store optional `reactions: { emoji: string; users: string[] }[]`. A successful request sets membership rather than blindly toggling it. Return 401 for bad access key, 400 for malformed input, 404 for missing comment/user, 500 for database errors.

- [ ] Write tests for authenticated add/remove, old documents, repeated add, counts across users, preservation of unrelated emojis/comment fields, missing user/comment, invalid identifiers/emoji/active, and database errors.
- [ ] Run `npm test -- --runInBand tests/annotations.reactions.test.ts` in middleware; confirm failures are missing endpoint behavior.
- [ ] Add the route with input validation, known-user lookup, atomic MongoDB update pipeline, and return the updated document. Remove empty reaction groups. Keep request parameters as literals inside aggregation expressions.
- [ ] Run the targeted tests, middleware full tests, build, and lint; record any pre-existing failures separately.

### Task 2: Renderer API and reaction UI

**Files:** Modify `src/interfaces/AnnotationInterface.ts`, `src/actions/annotationActions.ts`, `src/components/AnnotationList/Annotation.tsx`; create `src/components/AnnotationList/AnnotationReactions.tsx`, `src/actions/annotationActions.reactions.test.ts`, and `src/components/AnnotationList/AnnotationReactions.test.tsx`.

**Interfaces:** Optional `reactions: { emoji: string; users: string[] }[]` on `AnnotationInterface`. Add `setAnnotationReaction(dispatch, annotationUuid, userUuid, emoji, active): Promise<boolean>`; dispatch `AnnotationActionType.UpdateAnnotation` only after a valid successful response. `AnnotationReactions({ annotation }: { annotation: AnnotationInterface })` reads current user and dispatch from Store.

- [ ] Write API tests asserting request URL/body/access key, returned annotation dispatch, and no dispatch plus user feedback on HTTP/network/invalid-response failure.
- [ ] Write component tests asserting legacy comments, visible counts, selected state, add/remove payloads, pending-click prevention, failures/retry, unknown-user handling, and keyboard opening/dismissal. Mock the picker narrowly to select a known Unicode emoji.
- [ ] Run `npm test -- --run src/actions/annotationActions.reactions.test.ts src/components/AnnotationList/AnnotationReactions.test.tsx`; confirm missing behavior failures.
- [ ] Implement the type, action, and reaction component using the existing emoji-mart picker in an antd click Popover. Keep counts server-confirmed, disable changes while saving, and expose accessible labels/pressed state. Integrate under comment content; add keys to multiline spans.
- [ ] Rerun targeted tests and existing `AnnotationList` tests; confirm passing.

### Task 3: Match the approved chat design and verify integration

**Files:** Modify `src/components/AnnotationList/Annotations.module.scss`, `src/components/AnnotationList/AnnotationEditor.tsx`, and if needed `src/components/AnnotationList/AnnotationList.tsx`; extend component tests.

**Interfaces:** Preserve the existing `AnnotationList` and editor props. Styling applies to annotation comments/composer, not unrelated uses of the generic Comment shim.

- [ ] Add regression tests for author/time/content, multiple reaction chips, composer submit/draft behavior, and matching annotation layout hooks; run and confirm new behavior tests fail before implementation.
- [ ] Match the approved panel/comment/chip design with scoped SCSS. Remove blanket span coloring that would obscure selected chips. Use hover/focus/click hooks, touch-visible controls, and responsive wrapping. Retain split layout and header actions; keep the composer visibly part of the same design.
- [ ] Run frontend full tests, `npm run build`, and `npm run lint`; record pre-existing failures separately.
- [ ] Use the in-app browser to inspect representative comments and the composer, choose/remove reactions, check pending/failure states, and inspect narrow width. Use isolated demo data if a live database is unavailable; explicitly distinguish this from a live persistence check.
- [ ] Review the combined diff for preserved user work, backwards compatibility, and API agreement. Report verification results and deployment requirements. Do not commit without the user's request.

## Execution outcome

- [x] Task 1: middleware endpoint and persistence tests implemented; 24 reaction tests pass.
- [x] Task 2: renderer API and reaction controls implemented; interaction, error/retry, and keyboard tests pass.
- [x] Task 3: full comment-area styling implemented and spacing tightened per follow-up; browser verified narrow picker placement and compact message geometry.
- Final renderer feature checks: 23/23 passing. Both repository builds and lint commands pass (warnings remain).
- Full renderer suite: 606 passing, 3 pre-existing editor/evolution failures. Full middleware suite: 26 passing, 1 pre-existing root-route failure.
- User chose current folders. No commits or deployments; existing unrelated changes preserved. Existing authentication conventions retained; no real-time transport added. Live MongoDB smoke testing remains a deployment check.
- Fresh review findings on keyboard focus and canonical identity were fixed with RED→GREEN tests. Extra dedicated mana/timestamp/split-layout regression coverage is deferred.
- Detailed local verification record: `.superpowers/sdd/2026-10-27-comment-reactions/verification.md`.
