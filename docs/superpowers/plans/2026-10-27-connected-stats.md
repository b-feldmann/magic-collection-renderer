# Connected power/toughness inputs

- [x] Confirm joined control with independently editable values and slash separator.
- [x] Inspect shared split-input rendering and existing editor tests.
- [x] Add and run failing accessibility/editing regression tests.
- [x] Join the existing Ant Design inputs without changing saved values.
- [x] Run tests, type check, and review the scoped diff.

Verification: new stats tests pass; production build passes; scoped lint has no
errors (one existing unused-helper warning in the evolution test). Full suite
rerun: 591/592 passed, with MobileBigCardRenderModal.editor.test.tsx failing to
find the Hide editor button. A later focused run also failed two evolution
tests because level fields were absent; stats, vehicle, and enchantment tests
passed. These other failures remain unresolved. Automated review could not run
because the configured reviewer model was unavailable.
