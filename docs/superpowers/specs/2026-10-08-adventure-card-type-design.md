# Adventure Card Type — Design

**Date:** 2026-10-08
**Status:** Proposed

## Goal

Add an **Adventure** card type. In this app Adventure is one card type among
others (it goes in the card's type list), and it also selects a dedicated
**Adventure layout** — a per-color adventure mainframe, pinline, and a
left-hand rules box — whose frame assets are already generated under
`mainframes/adventure/`, `parts/adventurePinline/`, `parts/adventureRulesLeft/`
and `crown/adventure/`.

To support Adventure cleanly — and to allow a card to be, e.g., an Adventure
*and* a Creature, or an Artifact *and* a Creature — we refactor the card's type
model from a single flattened `CardMainType` to a **list of atomic card types**
plus **supertype/modifier flags**.

**Scope note (decorative layout first):** this change wires the Adventure
layout *visually* only. The left rules box is rendered empty/placeholder — there
is **no** adventure-half content (second name/cost/type/text) in this iteration.
Structured half-content fields are deferred to a follow-up.

## Background / current model

Today each card *face* (`CardFaceInterface`) carries a single
`cardMainType: CardMainType`. `CardMainType` flattens two orthogonal ideas into
single members:

- combined base types: `Enchantment Creature`, `Artifact Creature`
- token-ness: `Token Creature`, `Token Artifact`, `Token Land`
- basic-ness: `Basic Land`

`cardMainType` is read in many places:

- `src/components/TemplatingCardRender/TemplatingCardRender.tsx` — derives
  `isLand / isEnchantment / isArtifact / isCreature / isToken`, early-returns to
  `BasicLandCardRender` / `PlaneswalkerCardRender`, prints the type line,
  suppresses mana cost for lands/tokens.
- `src/components/TemplatingCardRender/InvocationCardRender.tsx`,
  `PlaneswalkerCardRender.tsx` — same boolean derivations + type line.
- `src/utils/cardToColor.ts` — token/land color special-casing.
- `src/components/CardEditor/CardEditor.tsx` — the `cardMainType` select, a
  duplicate BasicLand-specific select, field-visibility helpers,
  `isArtStyleAvailableForType`, type-change side effects, defaults.
- `src/components/CollectionFilterControls/CollectionFilterControls.tsx` +
  `src/App.tsx` — filter options/counts and the per-card filter check.
- `src/components/CollectionStats/CollectionStats.tsx` — one column per type.
- `src/actions/cardActions.ts` — `EMPTY_CARD` default.

The type line color/frame *shape* comes from the booleans above; the frame
*color* comes from `ColorType` via `cardToColor` / `getColor`.

## New type model

### `CardType` enum (replaces `CardMainType`)

Atomic MTG card types only:

```
Creature, Instant, Sorcery, Enchantment, Artifact,
Land, Planeswalker, Emblem, Adventure
```

String values match the existing single-type strings (`'Creature'`,
`'Land'`, …) so legacy data maps directly. `Adventure = 'Adventure'` is new.

### Supertype / modifier flags on `CardFaceInterface`

Join the existing `legendary?` / `vehicle?`:

- `token?: boolean` — replaces `Token Creature|Artifact|Land`
- `basic?: boolean` — replaces `Basic Land` (works together with the existing
  `basicLandType`)

### `CardFaceInterface` changes

```ts
// before
cardMainType: CardMainType;
// after
cardTypes: CardType[];
token?: boolean;
basic?: boolean;
```

`CardType[]` satisfies the existing `[key: string]: … | string[]` index
signature. `cardSubTypes`, `vehicle`, `legendary`, `basicLandType` are unchanged.

### Mapping (old → new)

| Legacy `cardMainType` | `cardTypes`            | flags           |
|-----------------------|------------------------|-----------------|
| Creature              | [Creature]             | —               |
| Instant               | [Instant]              | —               |
| Sorcery               | [Sorcery]              | —               |
| Enchantment           | [Enchantment]          | —               |
| Enchantment Creature  | [Enchantment, Creature]| —               |
| Artifact              | [Artifact]             | —               |
| Artifact Creature     | [Artifact, Creature]   | —               |
| Token Creature        | [Creature]             | token           |
| Token Artifact        | [Artifact]             | token           |
| Token Land            | [Land]                 | token           |
| Land                  | [Land]                 | —               |
| Basic Land            | [Land]                 | basic           |
| Planeswalker          | [Planeswalker]         | —               |
| Emblem                | [Emblem]               | —               |

## Backward-compatible read/write

- **Read:** a pure helper `legacyMainTypeToTypes(main: string)` returns
  `{ cardTypes: CardType[]; token?: boolean; basic?: boolean }`. A
  `normalizeCardFace(face)` applies it whenever a face arrives from the API and
  has no `cardTypes` but a legacy `cardMainType`. Applied at the `cardActions`
  boundary (where cards are fetched) so the rest of the app only ever sees the
  new shape.
- **Write:** the editor saves the new shape (`cardTypes` + flags). We also
  **derive and persist a legacy `cardMainType` string** (best-effort inverse of
  the table above) on save, so older app builds / external tooling keep working
  and rollback stays safe. The legacy string is advisory only; the new shape is
  source of truth.

## Rendering

`TemplatingCardRender` (and `InvocationCardRender`, `PlaneswalkerCardRender`):

- Boolean derivations become set checks, each independently true:
  - `isCreature = cardTypes.includes(Creature)`
  - `isEnchantment = cardTypes.includes(Enchantment)`
  - `isArtifact = cardTypes.includes(Artifact)`
  - `isLand = cardTypes.includes(Land)`
  - `isPlaneswalker = cardTypes.includes(Planeswalker)`
  - `isAdventure = cardTypes.includes(Adventure)`  ← new
  - `isToken = !!token`
  - `isBasicLand = !!basic && isLand`
  - So a `[Artifact, Creature]` card is both `isArtifact` and `isCreature`.
- Early returns rekeyed: BasicLand path → `isBasicLand`; Planeswalker path →
  `isPlaneswalker`.
- Mana-cost suppression: suppress when `isLand || isToken` (same net behavior as
  today's `Land`/`TokenLand`/token exclusions).
- **Type line:** replace the single-enum print with a `formatTypeLine(face)`
  helper producing MTG order:
  `"[Legendary ][Basic ][Token ]<types joined by space>[ – <extra subtypes>]"`,
  where extra subtypes still include the injected `Vehicle` (when
  `vehicle && isArtifact`) and `cardSubTypes`.

### Adventure layout (decorative)

When `isAdventure`, the card renders the Adventure frame set instead of the
normal color mainframe. The adventure frame takes precedence over the plain
`getColorMainframe` branch, but **not** over the existing special layouts
(BasicLand / Planeswalker early returns, and the Invocation/Invention/Borderless
/Extended/Token/Land art-style branches still win — an Adventure in one of those
art styles keeps that art style's frame). Concretely, in the mainframe `if/else`
chain Adventure slots in as a new `else if (isAdventure)` branch *before* the
final `else → getColorMainframe` fallback.

Frame pieces, all keyed by the card's resolved color (single-color and
two-color combos already exist on disk):

- **Mainframe:** `getAdventureMainframe(color)` → `mainframes/adventure/<color>.png`.
- **Pinline:** `getAdventurePinline(colors)` → `parts/adventurePinline/<combo>.png`,
  used in place of the normal `getPinline` when `isAdventure`.
- **Left rules box:** `getAdventureRulesLeft(colors)` →
  `parts/adventureRulesLeft/<combo>.png`, rendered as an extra overlay image
  (new element + CSS class in `TemplatingCardRender.module.*`). **No text is
  rendered into it in this iteration** — it is purely decorative.

`assetLoader.tsx` imports these three asset groups (single + combo, full-res +
`Thumb`) mirroring the existing mainframe/pinline/rulespart import blocks, and
exposes the three getters above. `assetLoader.test.ts` gets cases asserting each
getter returns a color-appropriate asset and that combos are order-independent
(e.g. `wu === uw`).

### Adventure crown

Crowns still render **only when `legendary && !isInvention`** (unchanged
condition). When a legendary card is also an Adventure, `getCrown` selects the
adventure crown style instead of the base style.

- `assetLoader.tsx`: import the `crown/adventure/*.png` (+ two-color combo)
  images mirroring the existing `nickname` / `floating` imports.
- `getCrown(...)`: add an adventure style selector returning the adventure crown
  assets. Precedence when a legendary card is also nickname/adventure:
  **adventure wins** (open point 2).
- `assetLoader.test.ts`: add a case asserting the adventure style differs from
  base/nickname/floating for the same color pair.

## Editor (`CardEditor.tsx`)

- Replace the single `cardMainType` select with a **multi-select** bound to
  `cardTypes` (options = all `CardType` values). Requires a `multiselect`
  field type in `EditField.tsx` (antd `Select mode="multiple"`), or reuse an
  existing multi-value control.
- Add `token` and `basic` toggles (`basic` only meaningful when `Land` is in
  `cardTypes`; drives the `basicLandType` sub-form).
- Update field-visibility helpers (`isCreature`, `isArtifact`, `isVehicle`,
  `isPlaneswalker`, `hasMana`, `isColoredToken`, `hasStats`) to read the array +
  flags.
- Update `isArtStyleAvailableForType` to take `cardTypes` (+ flags).
- Update `saveValue` side effects (the `Basic Land` branch that seeds
  `basicLandType` → trigger on `basic && Land`).
- Defaults → `cardTypes: [CardType.Creature]` in `EMPTY_CARD` (cardActions),
  `dummyCard`, `addBackFace`.

## Filters / stats / sort

- `CollectionFilterControls`: build type options from `CardType`
  (`mapEnum(CardType, …)`); per-type counts increment for **each** of a card's
  `cardTypes`.
- `App.tsx` filter check: a card is shown if **any** of `front.cardTypes` is
  enabled (open point — see below).
- `CollectionStats`: columns per `CardType`; a card contributes to each of its
  types.
- `cardToColor(...)`: change signature to accept the face (or `cardTypes` +
  `token`); token color special-casing keys off the `token` flag, land color
  off `cardTypes.includes(Land)`. Update call sites in `TemplatingCardRender`
  and `sortAccessors.ts`.

## Tests

- New unit tests: `legacyMainTypeToTypes` (full mapping table) and
  `formatTypeLine` (ordering, legendary/basic/token prefixes, subtypes).
- Update existing `CardEditor` and `TemplatingCardRender` tests that reference
  `cardMainType` to the new shape.
- Update `assetLoader.test.ts` for the adventure crown style and the three new
  adventure frame getters.

## Files touched

- `src/interfaces/enums.ts` — `CardType` (rename/replace `CardMainType`).
- `src/interfaces/CardFaceInterface.ts` — `cardTypes`, `token`, `basic`.
- `src/utils/` — new `legacyMainTypeToTypes` + `formatTypeLine` helpers
  (+ a `normalizeCardFace`/`normalizeCard`).
- `src/actions/cardActions.ts` — normalize on fetch; `EMPTY_CARD` default;
  derive legacy `cardMainType` on save.
- `src/components/TemplatingCardRender/TemplatingCardRender.tsx`,
  `InvocationCardRender.tsx`, `PlaneswalkerCardRender.tsx` — type-set booleans,
  Adventure mainframe/pinline/left-box branch, adventure crown.
- `src/components/TemplatingCardRender/assetLoader.tsx` (+ `assetLoader.test.ts`)
  — adventure mainframe/pinline/rulesLeft/crown imports + getters.
- `src/components/TemplatingCardRender/TemplatingCardRender.module.*` — CSS class
  for the decorative adventure left-rules-box overlay.
- `src/utils/cardToColor.ts`, `src/utils/sortAccessors.ts`.
- `src/components/CardEditor/CardEditor.tsx`, `EditField.tsx`.
- `src/components/CollectionFilterControls/CollectionFilterControls.tsx`,
  `src/App.tsx`, `src/MobileApp.tsx` (if it filters), `CollectionStats.tsx`.
- Tests mirroring the above.

## Open points to confirm at review

1. **Filter semantics** — assuming "show if *any* enabled type matches". If you
   want "*all* types must be enabled", that's a one-line change.
2. **Crown style precedence** — when a card is legendary + nickname + adventure,
   which crown wins? Default assumption: adventure.
3. **`CardMainType` rename** — plan renames the enum to `CardType`. If you'd
   rather keep the name `CardMainType` (now holding atomic values) to reduce
   import churn, say so.

## Non-goals

- **No adventure-half content this iteration.** The `adventureRulesLeft` box is
  decorative/empty; no second name/cost/type/text fields are added. Structured
  half-content is a deferred follow-up.
- No general supertype system beyond the `token` / `basic` / `legendary` /
  `vehicle` flags needed here (Snow etc. out of scope).
- No one-time MongoDB migration (handled by backward-compatible read).
- Unrelated in-progress work in the tree (e.g. saga frames) is out of scope.
