# Mechanics modal refresh

Scope: Match the existing card editor's white surface, green headings, rounded fields, numbered sections, and quiet autosave footer. Replace click-to-edit table cells with labeled name inputs and multiline descriptions, saving changed drafts on blur. Keep creation and closing available, with a responsive scrollable body.

- [x] Inspect the existing mechanic modal, actions, and card editor styling.
- [x] Add and run failing tests for direct editing, blur saves, unchanged fields, consecutive edits, creation, and closing.
- [x] Implement the scoped modal redesign without changing unrelated work.
- [x] Run focused tests, the full test suite, type checking/build, and scoped lint.
- [x] Review the diff and report verification results.

Follow-up: reduced section padding from 22px to 12px, shortened descriptions to two initial rows, and tightened header/footer/action spacing at the user's request. Review found failed-save retry and delayed store-update issues; regression tests now cover both. The mechanic update action returns a success boolean so drafts are only cleared after acknowledged persistence.

Verification: 14 focused tests passed; final full suite passed (81 files, 721 tests). Production build and scoped ESLint passed; build retains the bundle-size warning. `git diff --check` passed. Reviewer confirmed both save issues resolved. Browser fixture confirmed rounded modal styling, six visible fields across three mechanics, 12px section padding, and no horizontal overflow; screenshots were unavailable because the browser window was not visible. No live mechanic data was changed during the browser check.
