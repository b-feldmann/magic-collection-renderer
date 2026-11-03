# Collection statistics bottom sheet

## Intent and approved direction

Implement the interactive mockup approved in this conversation: a compact statistics preview at the bottom of the collection, sliding upward over the cards to reveal readable individual mana curves. Preserve the taller preview charts, compact header, shared-scale descriptions, and stacked/individual view switch.

Reference prototype: `C:/Users/benja_y92m506/AppData/Local/Temp/opencode/collection-statistics-designs/content/bottom-sheet-taller-previews.html`. This document is the durable specification; the temporary prototype is illustrative, not application source.

## User requirements

- Collapsed preview contains stacked curves for Color, Card Type, and Tags; Rarity is expanded-only.
- Below 1400px viewport width, omit Tags from the preview and let Color/Card Type share the available row. At 1400px and above show all three. Tags remain available in the expanded view at every width.
- Expansion defaults to individual charts; expanded controls can switch back to stacked charts.
- Individual color charts include White, Blue, Black, Red, Green, Colorless, and Multicolor.
- Individual type charts show creature counts and other card types at each mana value, not only total counts.
- Include rarity and tag curves in both expanded layouts.
- Display explicit shared-scale information for individual-chart sections: identical axes within each section, dynamically derived from current data.
- Keep preview chart plots approximately 120px tall on desktop, within an approximately 270px collapsed panel, with a compact header.
- Show average nonland mana value and the percentage/count of nonland cards with mana value 2–3.
- Support upward/downward handle gestures and explicit Expand/Collapse controls; animate the panel above the collection without changing the grid's size when expanded.

## Data rules

- Use the existing filtered collection and canonical-first-variant family counting, preserving `getVariantGroups(collection, allCards)` semantics.
- Include lands (including Basic Land and creature lands) in the color curves at mana value 0. Other curves and average/2–3 statistics exclude lands; report their count separately.
- Use existing `cardToColor` and `getConvertedManaCost` utilities. Multicolor is exclusive, not counted in each constituent color.
- Deduplicate repeated tags on one canonical card. Label aggregate tag counts as **tag matches**, never unique cards. Untagged cards contribute no tag matches.
- Use eight aligned display buckets: 0, 1, 2, 3, 4, 5, 6, 7+. Compute average from actual mana values before grouping 7+.
- Every individual chart within a section uses one shared count maximum; never independently normalize charts.
- Empty sections must remain readable with no division by zero, NaN, or invented tag names. Values update when filters/tabs change, including while expanded.

## Implementation calls (builder decisions, not previously specified by the user)

- Use dependency-free React/CSS charts, consistent with the existing component; do not add a charting or gesture library.
- Put the desktop sheet absolutely inside the collection column, not across the entire viewport/editor. Reserve collapsed-height space so the last cards remain reachable. Expanded height overlays cards instead of reducing the virtualized grid.
- Keep the existing mobile Stats drawer and its uncommitted changes. `fillHeight` renders the shared expanded contents directly inside that drawer, without a second sheet or duplicate collapse controls.
- Primary type classification is exclusive for truthful stacked totals: Creature, Instant, Sorcery, Enchantment, Artifact, Planeswalker, then Other. A creature-artifact counts as Creature. Always show the five mockup types; include Planeswalker/Other when present. Land detection takes precedence.
- Expanded height is bounded by the collection container; its content scrolls independently. Nonmodal desktop presentation does not trap focus or obstruct the editor. Escape collapses the sheet; handle keyboard arrows and Enter/Space provide gesture alternatives.
- Use pointer capture and a release threshold of 35px for directional gestures, ignoring horizontal drags/cancelled gestures and suppressing the subsequent click after a drag.
- Respect reduced-motion preferences. Keep labels and hit targets readable on narrow screens and support horizontal preview scrolling rather than squeezing charts indefinitely.

## Non-goals and constraints

- No backend/API, card editing, filter, or variant membership changes.
- No global state-management additions or new dependencies.
- Preserve all pre-existing uncommitted user changes, especially mobile drawer behavior and `fillHeight` support.
- Tests cover behavior, semantics, accessibility, meaningful layout outcomes, and arithmetic, not exact decorative pixel values.

## Verification

### Follow-up: closed states and grid geometry

- Closed modes are Hidden (compact header, 48px) and Preview (300px), with the preferred closed mode saved in local storage. Expanded is never persisted as that preference.
- Reserve the closed panel's height outside the virtualized card viewport: Hidden leaves more visible grid space, Preview less. This must initialize correctly on reload and update when switching modes.
- Do not simulate viewport height with extra blank grid rows. The card scrollbar ends above the closed statistics card, so a side gutter is unnecessary.
- Expansion continues to overlay the viewport sized for the preferred closed mode, preserving grid height and scroll position.

Test aggregation, empty/all-land data, variants, repeated/overlapping tags, unknown types, large mana values, shared scales, filters while expanded, keyboard/drag transitions, hidden preview rarity, expanded rarity, view switching, and existing mobile drawer integration. Run focused tests, the full suite, lint, and production build. Verify desktop overlay geometry in the browser; if middleware/authentication is unavailable, use a temporary deterministic fixture without committing mock data into the app.
