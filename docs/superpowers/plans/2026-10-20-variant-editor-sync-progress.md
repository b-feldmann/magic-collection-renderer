# Variant/editor synchronization

User requests: selecting a variant also selects it in the editor; place modal variant controls below the card.

- [x] Regressions: desktop/mobile app wiring, controlled collection/modal selection, unsaved-change confirmation, canceled editor debounce, below-card placement — initial 14 expected failures before implementation; focused 36/36 passed after implementation.
- [x] Implement shared selection through existing app state without opening a hidden modal. Await confirmation before changing either view. Cancel pending old-card editor timers on selection changes. Move modal navigation below faces.
- [x] Run focused/full tests, build, lint, and diff checks — 54 files / 493 tests pass, build succeeds, lint has 0 errors and one pre-existing warning in CardEditor.evolution.test.tsx:81. Existing jsdom and build chunk-size warnings remain.

Keep previous uncommitted feature work and the existing SVG change untouched. No branch or commit operations.

Independent review identified a genuine timing gap: parent preview state is debounced 600 ms, so a very recent edit could otherwise be lost when the new navigation cancels its timers. Fixed with immediate onDraftChange tracking into app refs without making the expensive collection preview synchronous. Both variant navigation and ordinary editor navigation consult that immediate draft. Five added regressions RED→GREEN cover this callback and desktop/mobile collection/modal paths. Two more RED→GREEN regressions protect newer draft tracking from earlier back-face save completions using the existing generation guard.

One intermediate full run caught a test expectation using a single-face full name after adding a back face; changed the assertion to verify the edited front-face name (the full name correctly includes the back-face separator). Final full run is green.

Logs: local temp `opencode/variant-editor-sync-{red,green,full-tests,build,lint}.log`, `opencode/variant-editor-fresh-draft-{red,green}.log`, and `opencode/variant-editor-draft-generation-red.log`.

This supersedes the earlier modal extension's choice to browse independently of the editor. No persistence/API changes were needed. Changes remain uncommitted in the existing workspace.
