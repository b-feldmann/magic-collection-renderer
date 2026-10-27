# Card editor visual refresh

## Approved direction

Implement the compact green-and-white form approved in this conversation, using the final mockup `card-editor-refresh-v11.html` as visual reference. Apply this to the existing CardEditor, not to the surrounding application or card renderer.

- White rounded editor surface, subtle border, unaccented “Card details” header.
- Continuous form without navigation tabs.
- Sections: “The essentials”, “Words & abilities”, “Artwork & frame”, and collapsible “Organization & credits”.
- Two-column essentials: Card Name / Nickname, Mana Cost / Rarity, Card Types / Subtypes. Card Name and Subtypes use half width. Preserve conditional visibility for each card type and face.
- Field labels and input text: 13px. Section headings: 16px, dark green and semibold. Compact spacing: 10px vertical field gap, 14px column gap, 15px section padding, approximately 7px vertical input padding.
- Footer retains Undo Changes and permission-controlled Delete Card with the existing confirmation. No Save Changes button; show “Changes save automatically” as explanatory copy, not a successful-save indicator.
- Favorite becomes an accessible icon button. Variant and back-face actions move into an accessible overflow menu, preserving their names, availability, and behavior.
- No extra mana symbols beside the mana-cost input and no “Mana symbols are rendered automatically in the preview.” helper copy.

## Implementation calls

Keep React, antd, existing CSS modules, and existing handlers; add no dependency. Preserve field labels used by existing tests, except remove question marks from boolean labels if accessibility queries remain compatible. Keep the existing card preview outside the form rather than adding the mockup’s sample artwork, application header, or marketing copy. Preserve current upload and text-editing capabilities rather than introducing nonfunctional mock controls.

Specialized fields (vehicles, token colors, planeswalker loyalty, evolution levels, Adventure, Omen, Prepared, basic lands, art-style restrictions) remain functional and grouped under the relevant section. Power/toughness belongs with essentials; creator and tags belong in organization. Specialized spell and evolution sections remain visible when applicable. Art-style options must wrap on narrow screens; the form must not overflow. Existing edit/save timing, ownership rules, metadata handling, variant synchronization, and undo semantics remain unchanged.

## Non-goals

No backend, reducer, card model, or application-wide theme changes. No replacement preview or unrelated cleanup. Leave all pre-existing working-tree changes intact.

## Acceptance

Verify section structure and field order, keyboard-accessible labels/actions, hidden conditional fields, autosave/undo/delete/favorite/variant/back-face regressions, and no horizontal overflow at mobile and desktop editor widths. Run editor tests, full tests, lint, and production build; report any pre-existing failures separately.
