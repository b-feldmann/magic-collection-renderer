# Modal variant switching

User request: allow switching variants inside the card modal; place Create Variant beside Mark as favorite and Add Back Face.

Small extension to the existing variant feature. Use the full store family, keep modal browsing independent of the editor, and target all rendered faces/comments/actions at the displayed variant. Start at the card opened by the user; reset on a new card/open session. Load uploaded art only for the visible selected card. No new dependencies or persistence changes.

Later request supersedes independent browsing: see `2026-10-20-variant-editor-sync-progress.md`. Modal and collection switching now also select the editor, and modal navigation is below the card.

- [x] Add failing desktop/mobile modal and editor placement regressions — 10 expected failures before implementation. jsdom's unsupported modal enter transitions were disabled in the test adapter while retaining real antd modal interactions.
- [x] Implement shared modal selection/navigation and art loading; move editor button — focused modal/editor tests 27/27 pass. Navigation starts at the clicked card, wraps, resets on reopen/new card, follows live data, handles deletion, and binds comments/workflow to the selected member. Create Variant now shares the top compact action group.
- [x] Verify focused tests, full suite, build, lint, and diff — full suite 53 files / 472 tests pass; build succeeds; lint has 0 errors and one pre-existing warning in CardEditor.evolution.test.tsx:81. Existing build chunk-size and jsdom warnings remain.

Leave all existing feature changes and the staged/deleted SVG intact. Work in place without committing or changing branches.

Independent read-only review: no blocking findings. Non-blocking coverage suggestion deferred: add a three-member navigation test to distinguish previous/next direction independently of two-member wraparound.

Logs: local temp `opencode/modal-variants-{red,green,full-tests,build,lint}.log`. No API/schema changes were needed. Existing work remains uncommitted.
