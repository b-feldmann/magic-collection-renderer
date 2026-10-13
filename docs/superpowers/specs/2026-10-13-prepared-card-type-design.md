# Prepared Card Type — Design

**Date:** 2026-10-13
**Status:** Approved in chat (BJennWare)
**Prior art:** Adventure card type (`2026-10-08-adventure-card-type-design.md`) and Omen card type (`docs/superpowers/plans/2026-10-12-omen-card-type.md`) — Prepared mirrors both, with the spell box mirrored to the right half of the frame.

## Intent

Render and edit the **Prepared** card type: a split-textbox card like Adventure and
Omen, but mirrored — the Prepared spell (its own name, cost, type, and text) renders
into the frame's **right** box, and the card's standard rules text renders into the
**left** box. Backed by the user-supplied `mainframes/prepare/{regular,nyx}` frames
and the `parts/preparePinline.png` / `parts/prepareRulesRight.png` masks (all already
on disk and committed).

## Decisions (all confirmed by the user in chat)

1. **Card type name**: `Prepared` — added to `CardType` in `src/interfaces/enums.ts`.
2. **Mutual exclusivity**: `CardType.Prepared` joins `MUTUALLY_EXCLUSIVE_CARD_TYPES`
   in `src/utils/cardTypes.ts` — a face can carry at most one of
   Adventure / Omen / Prepared / Split Card / Aftermath / Planeswalker / Token.
3. **Face field names** (user-approved): `prepareName`, `prepareCost`, `prepareType`,
   `prepareText` — on `CardFaceInterface`, mirroring the adventure/omen fields.
4. **Spell-box type line** (user decision, differs from adventure/omen): renders
   only `Instant` or `Sorcery` — **no** `– Prepared` suffix.
5. **Editor**: a "Prepared" section with the four fields (Name, Cost, Type
   single-select of `PreparedType`, Text list without Add Mechanic), exactly like
   the Omen section.
6. **Art style**: only `Regular` is available for Prepared cards — the editor
   offers no Extended/Borderless/ELD Alternate Art and auto-falls back to Regular
   when the Prepared type is added (same mechanism as omens).
7. **Nyx**: `mainframes/prepare/nyx/` is used for enchantment Prepared faces
   (Enchantment + Prepared), exactly like omen nyx. "Only the regular artstyle"
   refers to the card art style, not the nyx enchantment variant.

## Measured geometry (2010×2814 masks → 1500×2100 design space)

Measured from the masks with a jimp script (same method as the omen planning):

- `preparePinline.png`: full-frame pinline, x 78–1422, y 90–1948 — the same
  footprint as the omen/adventure pinline.
- `prepareRulesRight.png`: the spell box, **x 745.5–1419.4, y 1313.4–1878.4** —
  a mirror of the omen left box (x 81–754.5) in width (both 674 wide), but shorter
  (ends at y 1878 vs the omen box's y 1937).
- `mainframes/prepare/regular/rules.png`: reference for the **left** main-text box,
  x 110–745, y 1313–1937 — superseded reference file (the box is baked into the
  mainframes; `.text` only needs an SCSS constraint). Verified by pixel comparison:
  the left half of the prepare mainframe is near-identical to the standard m15
  frame (mean RGB diff 18.7), while the right half differs heavily (191.7).
- The spell-box text SCSS mirrors the adventure/omen classes across the card's
  vertical centerline; exact pixel values are the builder's to tune, confirmed in a
  visual smoke check with the user (see Open Items).

## Goals

- `CardType.Prepared` selectable in the CardEditor's Card Types multi-select, and
  saved/loaded round-trip on the face's `cardTypes`.
- The Prepared spell box renders on the right half: prepare name (top-left of the
  box), prepare cost (top-right), type line (`Instant`/`Sorcery` only), text.
- The card's own rules text/flavour renders constrained to the left box.
- The spell box's rules part color derives from `prepareCost` when set, falling back
  to the card's own mana cost colors (exactly like adventure/omen); the pinline
  always derives from the card's mana cost colors; 3+ colors fold to gold (`m`),
  colorless folds to the `a` mainframe, empty color set → no part.
- Stale data safety: prepare fields present on a face **without** `CardType.Prepared`
  render nothing (same control the omen renderer has).
- `formatTypeLine` filters `Prepared` out of the main type line (like Adventure and
  Omen markers).

## Non-goals

- No Extended/Borderless/ELD Alternate Art assets for prepare (none exist, none are
  offered).
- `mainframes/prepare/regular/{l,v}.png` (land/vehicle frames) stay unused, exactly
  like omen — a Land+Prepared face renders the land mainframe chain first. Follow-up
  if prepared lands/vehicles should use them.
- No changes to the mobile app beyond what flows automatically (face props already
  spread through `Cell.tsx` / `BigCardRenderModal.tsx`).
- The middleware/backend is untouched; the new fields ride the existing flexible
  card schema (same as adventure/omen fields did).

## Anti-goals

- Prepared must not render its spell box on the left, and must not coexist with
  Adventure or Omen on the same face.
- The editor must not offer non-Regular art styles for Prepared cards.

## Constraints

- React 19 + antd 6 + TypeScript; vanilla `useContext`/`useReducer` state; no new
  dependencies (jimp 1.6 is already a devDependency for the parts script).
- All frame-part images share the 5:7 aspect and render into the 1500×2100 design
  space; images are never rescaled in markup.
- npm only; `legacy-peer-deps=true` via `.npmrc`.
- Tests: Vitest (jsdom), `npm test <pattern>`; type-check via `npm run build`;
  lint via `npm run lint`.

## The how (as it will be built)

Mirrors the omen implementation end-to-end, in the same order the omen plan used:

1. **Data model** — `CardType.Prepared`, `PreparedType { Instant, Sorcery }`,
   the four face fields, `MUTUALLY_EXCLUSIVE_CARD_TYPES` + `formatTypeLine`
   updates, with tests in `cardTypes.test.ts`.
2. **Parts generation** — `generatePrepareParts()` in
   `scripts/generate-parts.cjs`: carve `preparePinline` + `prepareRulesRight`
   parts (6 singles w/u/b/r/g/m + 10 two-color combos each) from
   `mainframes/prepare/regular/<color>.png` with the two masks;
   `blendCenterX = visiblePixelCentroidX(mask)` for the rules-right box (it sits
   off-centre, on the right half). New CLI subset key `prepare`. Delete the
   superseded reference files `mainframes/prepare/regular/{rules,rulesRight}.png`
   (same cleanup as the omen commit did for its superseded files).
3. **assetLoader** — prepare mainframe imports (regular + nyx, w/u/b/r/g/m/a +
   Thumbs), 16 + 16 part imports, `PREPARE_PINLINE_BY_KEY` /
   `PREPARE_RULES_RIGHT_BY_KEY` records, and getters `getPrepareMainframe(color,
   isEnchantment)`, `getPreparePinline(colors)`, `getPrepareRulesRight(colors)`
   (reusing the shared `getSpellBoxVariant`), with assetLoader tests mirroring the
   omen ones.
4. **TemplatingCardRender** — props `prepareName/prepareCost/prepareType/prepareText`
   (flow automatically from the face), `isPrepared` branch: pinline chain, rules
   part overlay on the right, prepare mainframe (nyx when enchantment), spell-box
   JSX with **new mirrored SCSS classes** (`.prepareName`, `.prepareCost`,
   `.prepareTypeLine`, `.prepareText`, `.prepareRulesRight`) — the spell box classes
   cannot reuse the adventure ones because the geometry is mirrored to the right
   half and the box is shorter. The main `.text` gets a `.prepareLeftText`
   constraint (like `adventureRightText`/`omenRightText` but on the left).
   Render tests mirroring `TemplatingCardRender.omen.test.tsx` (color derivation,
   nyx, no-prepare control, text constrained to the left box).
5. **CardEditor** — "Prepared" card type option, `prepareSectionConfig` (divider
   'Prepared'; Name 50, Cost 50, Type select 100, Text list 100 without
   mechanics), `isPrepared()` splice, `prepareType` defaulting to Instant when the
   type is added (mirroring the omenType defaulting), and
   `isArtStyleAvailableForType` extended so Prepared (like Adventure/Omen) supports
   no non-Regular style. Editor tests mirroring `CardEditor.omen.test.tsx`.
6. **Verification** — full `npm test`, `npm run lint`, `npm run build`, then a
   visual smoke check with the user (the mirrored SCSS pixel values are derived
   from measured geometry; only eyes can confirm they sit right on the art).

## Open items (builder's call, flagged for the visual smoke check)

- Exact SCSS pixel values for the spell-box classes and `.prepareLeftText` —
  derived by mirroring the adventure/omen values across the 1500px centerline and
  clipping the spell text height to the measured y 1878 bottom edge; final values
  confirmed visually with the user in step 6 and adjusted if the text sits off.

## What the user supplied

- Masks: `parts/preparePinline.png`, `parts/prepareRulesRight.png` (2010×2814,
  alpha masks — only the alpha channel matters, the established convention).
- Mainframes: `mainframes/prepare/regular/{w,u,b,r,g,m,a,l,v}.png` (+ Thumbs, plus
  the two superseded reference files) and `mainframes/prepare/nyx/{w,u,b,r,g,m,a}.png`
  (+ Thumbs).
