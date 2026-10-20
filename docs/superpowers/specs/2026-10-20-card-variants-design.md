# Card variants

## Intent

Create independently editable versions of a card without giving every version a separate collection tile. Each card in a variant family stores the IDs of every other member.

## Behavior

- Add **Create Variant** to the editor for a saved card. Creating from any member extends the same family.
- Copy the current editor contents, including both faces, tags, and art, into a new card owned by the current user. Give it a fresh server-generated ID and creation timestamp; reset votes, favorite, comment, and workflow state to new-card defaults. These reset choices are implementation defaults, not explicit user requirements.
- Existing family members change only their membership lists during creation. Current draft contents are carried into the new variant; they do not overwrite the original card's saved content or art.
- Open the new variant in the editor after successful creation, using the existing new-card selection flow.
- Persist an optional `variantIds: string[]` on every member. It contains every other family member exactly once, never its own ID. Cards without the field remain ordinary cards.
- Display one tile per family, with previous/next carousel controls and a position indicator. No automatic rotation. The selected slide retains the existing edit, favorite indicator, loading, seen, and face-switch behavior.
- Also allow previous/next switching in the card modal, with arrows and indicator below the rendered card faces on desktop and mobile. Switching variants in either the collection or modal selects that variant in the editor too, without opening a hidden modal. Confirm unsaved edits before changing either selection, including edits still waiting for the debounced preview.
- Use deterministic family ordering by creation time and UUID, so ordinary saves do not reorder carousel slides. Preserve the selected member while it still exists; fall back safely after deletion.
- Filters determine whether a family appears: at least one member must match. Its carousel exposes all available members, including members not matching the filter. Collection tab badges count tiles/families, not individual variants.
- Deleting a member deletes only that card and removes its ID from remaining members in storage and local state. A one-member family returns to a plain tile.

## Constraints and boundaries

- Keep React context/reducer state, axios actions, existing server endpoints, and npm tooling. Add no dependencies or middleware changes.
- Obtain new IDs through POST `/cards`; PUT persists the copied card and reciprocal membership. Do not generate UUIDs for persisted Mongo-backed cards.
- Uploaded images are keyed by card ID and face: copy their actual image data under the new ID before considering creation successful. Resolve unloaded image references from the source first.
- Existing endpoints cannot provide a transaction across cards. On failure, do not report success or select an incomplete variant; attempt restoration of changed links and removal of a newly allocated card. Report failures, including incomplete recovery, rather than silently leaving the UI in a success state.
- Ignore missing family members when rendering; tolerate old cards, empty arrays, duplicate IDs, self-links, and incomplete reciprocal links without hiding unrelated cards or crashing.
- Do not add linking/unlinking of existing cards, synchronized editing, variant labels, or changes to PDF/export/deck/statistics semantics.
- Leave existing unrelated workspace changes untouched.

## Implementation choices

Use a pure family/grouping utility shared by the collection and badge counts. Render only the selected member inside a small carousel wrapper rather than mounting every expensive card render. Keep variant selection outside recycled grid cells. Read family membership from the latest collection when editor snapshots are saved, so stale autosave/undo snapshots cannot erase newly added links. Serialize card mutations per store, including modal saves and refreshes, and retain authoritative persisted membership for queued stale snapshots. This coordinates one app session, not writes from independent clients.

## Verification

Cover family construction and malformed links, copying and reciprocal persistence for two and three members, independent nested data and art, deletion cleanup, API failures/recovery, carousel selection/actions, grouping after filtering, and editor creation behavior. Run the full test suite, lint, and production build.
