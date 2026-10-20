# SDD ledger — plan: docs/superpowers/plans/2026-10-20-card-variants.md

Execution: native, in the current workspace, explicitly approved by the user. No commits or branch changes requested. Existing staged/deleted SVG is out of scope.

Baseline: `npm test -- --run` — 47 files, 419 tests passed. Existing jsdom canvas/pseudo-style warnings. Full output: local temp `opencode/card-variants-baseline.log`.

Pre-flight: Tasks 1 → 2/3 share `getVariantFamily` and `getVariantGroups`; signatures agree.
Pre-flight: Tasks 2 → 4 share `createCardVariant` and optional collection parameter on `deleteCard`; signatures agree.
Pre-flight: Tasks 3 → 4 require unfiltered lookup of carousel members in desktop/mobile; include this in Task 3.

Execution adaptation: use this persistent Markdown ledger and native tools instead of POSIX-only skill bookkeeping scripts on Windows. Context-mode tools are not exposed in this session's catalog; keep fallback command output bounded in temp logs.

## Tasks

- [x] Task 1: complete — 6/6 utility tests, RED (five grouping assertions) → GREEN.
- [x] Task 2: complete — action/image/reducer tests RED (17 failures) → GREEN; 24/24 tests across Tasks 1–2.
- [x] Task 3: complete — six carousel tests RED → GREEN; collection + utility tests 13/13. Full-collection lookups now allow editing filtered-out family members.
- [x] Task 4: complete — editor/membership tests RED (five failures) → GREEN, 12/12. Full suite: 52 files, 454 tests pass. `npm run build` passes (existing chunk-size warning). `npm run lint` passes with one pre-existing unused-variable warning in `CardEditor.evolution.test.tsx:81`.
- [x] Independent final review — fresh general reviewer completed the review after the dedicated reviewer could not launch (configured model unavailable). Both Important findings verified and fixed. Selection finding upgraded from Minor to Important because the spec requires preserving surviving selections; fixed as well. No deferred minors.

Debugging: antd's exiting loading icon briefly changed the create button's accessible name; an explicit stable aria-label fixed both accessibility and the two affected tests. Type-checking caught test fixtures missing required `cardTypes` and an unsupported `Array.at`; fixed fixtures and used ES-target-compatible indexing.

Verification logs: local temp `opencode/card-variants-full-tests.log`, `opencode/card-variants-build.log`, `opencode/card-variants-lint.log`.

## Final review fix pass

- Final: fixed modal/editor write race — regression tests for pending uploaded-art saves before creation and stale saves during creation RED→GREEN. Mutations now serialize per store; cached persisted membership overrides stale snapshots. Refresh replaces that cache, and deleted IDs reject late saves/creation attempts; two additional regressions RED→GREEN.
- Final: fixed source-art rollback gap — `never overwrites original uploaded art while persisting or rolling back family links` RED→GREEN. Membership writes use stored original content and never upload existing members' art. The draft is copied only to the new card.
- Final: fixed surviving selection after anchor deletion — `preserves a surviving selection when the first family member is deleted` RED→GREEN. Selections can be recovered by surviving member ID when the family anchor changes.
- Final verification after the fix pass: `npm test -- --run` → 52 files, 460/460 tests pass; `npm run build` → success with existing chunk-size warning; `npm run lint` → 0 errors, one pre-existing warning. Logs: local temp `opencode/card-variants-final-{tests,build,lint}.log`.
- Review scope exclusions stand: existing SVG, PDF/export/deck/statistics changes, and server-wide atomicity are outside this task. Rollback remains best-effort across existing endpoints; errors explicitly tell the user to refresh when recovery is incomplete. Reviewer did not rerun checks; the fresh full verification above is from the implementer.
- Workspace retained in place on `master`; all feature changes remain uncommitted. No merge, push, branch change, or user-file cleanup performed. `git diff --check` also passes.
