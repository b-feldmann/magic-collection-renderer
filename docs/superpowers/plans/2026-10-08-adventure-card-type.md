# Adventure Card Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single flattened `CardMainType` on each card face with a list of atomic `CardType` values plus `token`/`basic` flags, add an `Adventure` card type that renders a dedicated (decorative) adventure layout + legendary adventure crown, and read legacy data backward-compatibly.

**Architecture:** A new `CardType` enum holds atomic MTG types; the old `CardMainType` enum is retained only as the *legacy* on-disk representation. A pure `legacyMainTypeToTypes` mapper + a `normalizeCard` function convert legacy faces to the new shape at the reducer boundary, so the rest of the app only ever sees `cardTypes`. Rendering, the editor, filters, stats, sorting, and color derivation all switch from reading one enum to reading the type array + flags.

**Tech Stack:** Vite, React 19, TypeScript, antd 6, Vitest (jsdom). State is `useContext` + `useReducer` (`src/store.tsx`, `src/reducer.ts`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-08-adventure-card-type-design.md`

## Global Constraints

- **Path-scoped commits only.** The working tree contains unrelated in-progress asset work (omen/prepare/saga frames, adventure asset restructuring). Every commit MUST use an explicit pathspec — `git commit -m "<msg>" -- <paths>` — so no unrelated staged files are swept in. Never run a bare `git commit` or `git add -A`.
- Use `npm test` (Vitest) for tests; single file: `npm test <path>`. Type-check with `npm run build` (runs `tsc`). Lint: `npm run lint`.
- Keep the `CardMainType` enum (`src/interfaces/enums.ts`) intact — it is the legacy representation consumed only by the legacy mapper and the save-time derive function. Do NOT delete it.
- `CardType` string values MUST exactly equal the legacy single-type strings where they overlap (`'Creature'`, `'Instant'`, `'Sorcery'`, `'Enchantment'`, `'Artifact'`, `'Land'`, `'Planeswalker'`, `'Emblem'`) so legacy data round-trips. `Adventure = 'Adventure'` is new.
- Adventure layout is **decorative only** this iteration: render the frame/pinline/left-box, but render NO text into the left box and add NO adventure-half data fields.
- Do not introduce redux/mobx; keep the `useReducer` pattern.

---

## File Structure

New files:
- `src/utils/cardTypes.ts` — `legacyMainTypeToTypes`, `deriveLegacyMainType`, `normalizeCardFace`, `normalizeCard`, `formatTypeLine`, and small `hasType` helpers. Single home for all type-model logic.
- `src/utils/cardTypes.test.ts` — unit tests for the above.

Modified files (one responsibility each, in dependency order):
- `src/interfaces/enums.ts` — add `CardType` enum.
- `src/interfaces/CardFaceInterface.ts` — `cardTypes: CardType[]` (Token/BasicLand are members); drop `cardMainType`.
- `src/reducer.ts` — run `normalizeCard` where cards enter state.
- `src/actions/cardActions.ts` — `EMPTY_CARD` default + derive legacy `cardMainType` on save.
- `src/utils/cardToColor.ts` — accept the face instead of a single enum.
- `src/components/TemplatingCardRender/assetLoader.tsx` (+ `assetLoader.test.ts`) — adventure frame getters + adventure crown style.
- `src/components/TemplatingCardRender/TemplatingCardRender.tsx` (+ `*.module.css`) — type-set booleans, adventure layout branch, adventure crown, type line via `formatTypeLine`.
- `src/components/TemplatingCardRender/InvocationCardRender.tsx`, `PlaneswalkerCardRender.tsx` — type-set reads + type line.
- `src/components/CardEditor/CardEditor.tsx` — `cardTypes` multi-select, `token`/`basic` toggles, helpers, side effects, defaults.
- `src/components/CollectionFilterControls/CollectionFilterControls.tsx`, `src/App.tsx` — type filter over the array.
- `src/components/CollectionStats/CollectionStats.tsx` — per-type columns/counts.
- `src/utils/sortAccessors.ts` — `cardToColor` call sites.
- Existing test files referencing `cardMainType` — update to new shape (final task).

---

## Task 1: Add `CardType` enum

**Files:**
- Modify: `src/interfaces/enums.ts` (after the `CardMainType` enum, lines 12-27)

**Interfaces:**
- Produces: `export enum CardType` with members `Creature, Instant, Sorcery, Enchantment, Artifact, Land, Planeswalker, Emblem, Adventure`.

- [ ] **Step 1: Add the enum**

In `src/interfaces/enums.ts`, immediately after the existing `CardMainType` enum (do not modify `CardMainType`), add:

```ts
// Atomic card types. A face holds a list of these (see CardFaceInterface.cardTypes).
// Token and BasicLand are their own types (combined with a base type in the list,
// e.g. [Token, Creature]); legendary/vehicle remain boolean flags on the face.
export enum CardType {
  Creature = 'Creature',
  Instant = 'Instant',
  Sorcery = 'Sorcery',
  Enchantment = 'Enchantment',
  Artifact = 'Artifact',
  Land = 'Land',
  Planeswalker = 'Planeswalker',
  Emblem = 'Emblem',
  Token = 'Token',
  BasicLand = 'Basic Land',
  Adventure = 'Adventure',
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: compiles (the enum is unused so far; no errors).

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add atomic CardType enum" -- src/interfaces/enums.ts
```

---

## Task 2: Type-model utilities (`legacyMainTypeToTypes`, `normalizeCard`, `deriveLegacyMainType`)

**Files:**
- Create: `src/utils/cardTypes.ts`
- Test: `src/utils/cardTypes.test.ts`

**Interfaces:**
- Consumes: `CardType`, `CardMainType` from `../interfaces/enums`; `CardFaceInterface` from `../interfaces/CardFaceInterface`; `CardInterface` from `../interfaces/CardInterface`.
- Produces:
  - `legacyMainTypeToTypes(main: string): { cardTypes: CardType[] }`
  - `normalizeCardFace(face: CardFaceInterface): CardFaceInterface`
  - `normalizeCard(card: CardInterface): CardInterface`
  - `deriveLegacyMainType(face: CardFaceInterface): CardMainType`
  - `hasType(face: CardFaceInterface, type: CardType): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/utils/cardTypes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  legacyMainTypeToTypes,
  normalizeCardFace,
  deriveLegacyMainType,
  hasType,
} from './cardTypes';
import { CardType, CardMainType } from '../interfaces/enums';
import CardFaceInterface from '../interfaces/CardFaceInterface';

const face = (over: Partial<CardFaceInterface>): CardFaceInterface =>
  ({ name: '', cardText: [], cardTypes: [], ...over } as CardFaceInterface);

describe('legacyMainTypeToTypes', () => {
  it('maps simple types one-to-one', () => {
    expect(legacyMainTypeToTypes('Creature')).toEqual({ cardTypes: [CardType.Creature] });
    expect(legacyMainTypeToTypes('Land')).toEqual({ cardTypes: [CardType.Land] });
    expect(legacyMainTypeToTypes('Instant')).toEqual({ cardTypes: [CardType.Instant] });
    expect(legacyMainTypeToTypes('Sorcery')).toEqual({ cardTypes: [CardType.Sorcery] });
    expect(legacyMainTypeToTypes('Enchantment')).toEqual({ cardTypes: [CardType.Enchantment] });
    expect(legacyMainTypeToTypes('Artifact')).toEqual({ cardTypes: [CardType.Artifact] });
    expect(legacyMainTypeToTypes('Planeswalker')).toEqual({ cardTypes: [CardType.Planeswalker] });
    expect(legacyMainTypeToTypes('Emblem')).toEqual({ cardTypes: [CardType.Emblem] });
  });

  it('decomposes combined types', () => {
    expect(legacyMainTypeToTypes('Enchantment Creature').cardTypes).toEqual([
      CardType.Enchantment,
      CardType.Creature,
    ]);
    expect(legacyMainTypeToTypes('Artifact Creature').cardTypes).toEqual([
      CardType.Artifact,
      CardType.Creature,
    ]);
  });

  it('models token-ness as the Token type combined with the base type', () => {
    expect(legacyMainTypeToTypes('Token Creature').cardTypes).toEqual([
      CardType.Token,
      CardType.Creature,
    ]);
    expect(legacyMainTypeToTypes('Token Artifact').cardTypes).toEqual([
      CardType.Token,
      CardType.Artifact,
    ]);
    expect(legacyMainTypeToTypes('Token Land').cardTypes).toEqual([
      CardType.Token,
      CardType.Land,
    ]);
  });

  it('models a basic land as the standalone BasicLand type', () => {
    expect(legacyMainTypeToTypes('Basic Land').cardTypes).toEqual([CardType.BasicLand]);
  });

  it('falls back to Creature for unknown input', () => {
    expect(legacyMainTypeToTypes('Nonsense').cardTypes).toEqual([CardType.Creature]);
  });
});

describe('normalizeCardFace', () => {
  it('fills cardTypes from legacy cardMainType when missing', () => {
    const f = normalizeCardFace(face({ cardTypes: undefined as never, cardMainType: 'Token Land' }));
    expect(f.cardTypes).toEqual([CardType.Token, CardType.Land]);
  });

  it('leaves an already-new face untouched', () => {
    const f = normalizeCardFace(face({ cardTypes: [CardType.Artifact, CardType.Creature] }));
    expect(f.cardTypes).toEqual([CardType.Artifact, CardType.Creature]);
  });
});

describe('deriveLegacyMainType', () => {
  it('round-trips the combined and token/basic shapes', () => {
    expect(
      deriveLegacyMainType(face({ cardTypes: [CardType.Enchantment, CardType.Creature] })),
    ).toBe(CardMainType.EnchantmentCreature);
    expect(
      deriveLegacyMainType(face({ cardTypes: [CardType.Artifact, CardType.Creature] })),
    ).toBe(CardMainType.ArtifactCreature);
    expect(deriveLegacyMainType(face({ cardTypes: [CardType.Token, CardType.Creature] }))).toBe(
      CardMainType.CreatureToken,
    );
    expect(deriveLegacyMainType(face({ cardTypes: [CardType.Token, CardType.Artifact] }))).toBe(
      CardMainType.ArtifactToken,
    );
    expect(deriveLegacyMainType(face({ cardTypes: [CardType.Token, CardType.Land] }))).toBe(
      CardMainType.TokenLand,
    );
    expect(deriveLegacyMainType(face({ cardTypes: [CardType.BasicLand] }))).toBe(
      CardMainType.BasicLand,
    );
    expect(deriveLegacyMainType(face({ cardTypes: [CardType.Creature] }))).toBe(
      CardMainType.Creature,
    );
  });
});

describe('hasType', () => {
  it('reports membership', () => {
    const f = face({ cardTypes: [CardType.Artifact, CardType.Creature] });
    expect(hasType(f, CardType.Artifact)).toBe(true);
    expect(hasType(f, CardType.Land)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/utils/cardTypes.test.ts`
Expected: FAIL — module `./cardTypes` does not exist.

- [ ] **Step 3: Implement `src/utils/cardTypes.ts`**

```ts
import { CardType, CardMainType } from '../interfaces/enums';
import CardFaceInterface from '../interfaces/CardFaceInterface';
import CardInterface from '../interfaces/CardInterface';

interface DecomposedType {
  cardTypes: CardType[];
}

// Legacy CardMainType string -> new atomic cardTypes list. Token and BasicLand
// are themselves CardType members (token combined with its base type).
const LEGACY_MAP: Record<string, DecomposedType> = {
  [CardMainType.Creature]: { cardTypes: [CardType.Creature] },
  [CardMainType.Instant]: { cardTypes: [CardType.Instant] },
  [CardMainType.Sorcery]: { cardTypes: [CardType.Sorcery] },
  [CardMainType.Enchantment]: { cardTypes: [CardType.Enchantment] },
  [CardMainType.EnchantmentCreature]: { cardTypes: [CardType.Enchantment, CardType.Creature] },
  [CardMainType.Artifact]: { cardTypes: [CardType.Artifact] },
  [CardMainType.ArtifactCreature]: { cardTypes: [CardType.Artifact, CardType.Creature] },
  [CardMainType.CreatureToken]: { cardTypes: [CardType.Token, CardType.Creature] },
  [CardMainType.ArtifactToken]: { cardTypes: [CardType.Token, CardType.Artifact] },
  [CardMainType.TokenLand]: { cardTypes: [CardType.Token, CardType.Land] },
  [CardMainType.Land]: { cardTypes: [CardType.Land] },
  [CardMainType.BasicLand]: { cardTypes: [CardType.BasicLand] },
  [CardMainType.Planeswalker]: { cardTypes: [CardType.Planeswalker] },
  [CardMainType.Emblem]: { cardTypes: [CardType.Emblem] },
};

export const legacyMainTypeToTypes = (main: string): DecomposedType =>
  LEGACY_MAP[main] ?? { cardTypes: [CardType.Creature] };

export const hasType = (face: CardFaceInterface, type: CardType): boolean =>
  Array.isArray(face.cardTypes) && face.cardTypes.includes(type);

// Ensure a face carries the new shape. If it already has a cardTypes array we
// leave it alone; otherwise we derive it from the legacy cardMainType string.
export const normalizeCardFace = (face: CardFaceInterface): CardFaceInterface => {
  if (Array.isArray(face.cardTypes) && face.cardTypes.length > 0) return face;
  const legacyMain = (face as Record<string, unknown>).cardMainType;
  const decomposed = legacyMainTypeToTypes(
    typeof legacyMain === 'string' ? legacyMain : CardMainType.Creature,
  );
  return { ...face, cardTypes: decomposed.cardTypes };
};

export const normalizeCard = (card: CardInterface): CardInterface => ({
  ...card,
  front: normalizeCardFace(card.front),
  back: card.back ? normalizeCardFace(card.back) : card.back,
});

// Best-effort inverse: pick the legacy single enum that best represents the
// new shape, so older app builds / external tooling keep working after a save.
export const deriveLegacyMainType = (face: CardFaceInterface): CardMainType => {
  const types = Array.isArray(face.cardTypes) ? face.cardTypes : [];
  const has = (t: CardType) => types.includes(t);
  if (has(CardType.BasicLand)) return CardMainType.BasicLand;
  if (has(CardType.Token)) {
    if (has(CardType.Land)) return CardMainType.TokenLand;
    if (has(CardType.Artifact)) return CardMainType.ArtifactToken;
    return CardMainType.CreatureToken;
  }
  if (has(CardType.Land)) return CardMainType.Land;
  if (has(CardType.Creature)) {
    if (has(CardType.Enchantment)) return CardMainType.EnchantmentCreature;
    if (has(CardType.Artifact)) return CardMainType.ArtifactCreature;
    return CardMainType.Creature;
  }
  if (has(CardType.Artifact)) return CardMainType.Artifact;
  if (has(CardType.Enchantment)) return CardMainType.Enchantment;
  if (has(CardType.Planeswalker)) return CardMainType.Planeswalker;
  if (has(CardType.Instant)) return CardMainType.Instant;
  if (has(CardType.Sorcery)) return CardMainType.Sorcery;
  if (has(CardType.Emblem)) return CardMainType.Emblem;
  return CardMainType.Creature;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test src/utils/cardTypes.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add card-type model utilities (legacy mapping, normalize, derive)" -- src/utils/cardTypes.ts src/utils/cardTypes.test.ts
```

---

## Task 3: `formatTypeLine` helper

**Files:**
- Modify: `src/utils/cardTypes.ts`
- Test: `src/utils/cardTypes.test.ts`

**Interfaces:**
- Produces: `formatTypeLine(face: CardFaceInterface): string` — the full printed type line (without the leading `Legendary ` which callers still prepend, OR including it — see test; this plan includes it in the helper).

- [ ] **Step 1: Write the failing test** (append to `src/utils/cardTypes.test.ts`)

```ts
import { formatTypeLine } from './cardTypes';

describe('formatTypeLine', () => {
  it('joins multiple types in order', () => {
    expect(
      formatTypeLine(face({ cardTypes: [CardType.Enchantment, CardType.Creature] })),
    ).toBe('Enchantment Creature');
  });

  it('prefixes legendary and prints Token/BasicLand from the type list', () => {
    expect(formatTypeLine(face({ cardTypes: [CardType.BasicLand], legendary: true }))).toBe(
      'Legendary Basic Land',
    );
    expect(formatTypeLine(face({ cardTypes: [CardType.Token, CardType.Creature] }))).toBe(
      'Token Creature',
    );
  });

  it('appends subtypes after an en dash', () => {
    expect(
      formatTypeLine(face({ cardTypes: [CardType.Creature], cardSubTypes: 'Elf Warrior' })),
    ).toBe('Creature – Elf Warrior');
  });

  it('injects Vehicle for artifact vehicles', () => {
    expect(
      formatTypeLine(face({ cardTypes: [CardType.Artifact], vehicle: true })),
    ).toBe('Artifact – Vehicle');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/utils/cardTypes.test.ts`
Expected: FAIL — `formatTypeLine` not exported.

- [ ] **Step 3: Implement** (append to `src/utils/cardTypes.ts`)

```ts
export const formatTypeLine = (face: CardFaceInterface): string => {
  const types = Array.isArray(face.cardTypes) ? face.cardTypes : [];

  // Token and BasicLand are CardType members already in `types`; only
  // legendary remains a boolean supertype to prefix.
  const left = [face.legendary ? 'Legendary' : '', ...types].filter(Boolean).join(' ');

  const isArtifact = types.includes(CardType.Artifact);
  const subtypes = [face.vehicle && isArtifact ? 'Vehicle' : '', face.cardSubTypes]
    .filter(Boolean)
    .join(' ');

  return subtypes ? `${left} – ${subtypes}` : left;
};
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test src/utils/cardTypes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add formatTypeLine helper" -- src/utils/cardTypes.ts src/utils/cardTypes.test.ts
```

---

## Task 4: Update `CardFaceInterface`

**Files:**
- Modify: `src/interfaces/CardFaceInterface.ts`

**Interfaces:**
- Produces: `CardFaceInterface.cardTypes: CardType[]` (required); `cardMainType` removed from the interface. `legendary`/`vehicle` stay; no `token`/`basic` flags (Token/BasicLand are `CardType` members).

- [ ] **Step 1: Edit the interface**

Replace line 1 import and the `cardMainType` line:

```ts
import { BasicLandType, CardType, ColorType, CoverFit } from './enums';

export default interface CardFaceInterface {
  [key: string]: number | string | boolean | undefined | string[];

  name: string;
  nickname?: string;
  legendary?: boolean;
  vehicle?: boolean;
  cardTypes: CardType[];
  cardSubTypes?: string;
  basicLandType?: BasicLandType;
  cardText: string[];
  cardStats?: string;
  flavourText?: string;
  flavourAuthor?: string;
  cover?: string;
  coverFit?: CoverFit;
  tokenColors?: ColorType[];
  backFace?: boolean;
}
```

- [ ] **Step 2: Type-check to see the blast radius**

Run: `npm run build`
Expected: FAIL with errors at every `cardMainType` usage (reducer, cardActions, cardToColor, renderers, editor, filters, stats, sort). This is expected — the following tasks fix them in order.

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor: cardTypes list + token/basic flags on CardFaceInterface" -- src/interfaces/CardFaceInterface.ts
```

> Note: the tree will not type-check cleanly again until Task 12. That is acceptable for these interface-churn tasks; each still commits its own slice.

---

## Task 5: Normalize cards at the reducer boundary + defaults + save-time legacy derive

**Files:**
- Modify: `src/reducer.ts` (card-writing cases, lines 87-123)
- Modify: `src/actions/cardActions.ts` (`EMPTY_CARD` lines 19-38; `updateCard` parsed block lines 114-134)

**Interfaces:**
- Consumes: `normalizeCard`, `deriveLegacyMainType` from `../utils/cardTypes`.

- [ ] **Step 1: Normalize in the reducer**

In `src/reducer.ts`, import at top:

```ts
import { normalizeCard } from './utils/cardTypes';
```

Wrap each incoming card in the four write cases:

```ts
    case CardActionType.CreateCard:
      return {
        ...state,
        cards: [...state.cards, normalizeCard(action.payload.card)],
        newUuid: action.payload.card.uuid,
      };
    case CardActionType.ReadCard:
      return {
        ...state,
        cards: [
          ...state.cards.filter(card => card.uuid !== action.payload.card.uuid),
          normalizeCard(action.payload.card),
        ],
      };
    case CardActionType.BulkReadCard:
      return {
        ...state,
        cards: [
          ...state.cards.filter(
            card => !action.payload.cards.find(newCard => newCard.uuid === card.uuid),
          ),
          ...action.payload.cards.map(normalizeCard),
        ],
      };
    case CardActionType.UpdateCard:
      return {
        ...state,
        cards: [
          ...state.cards.filter(card => card.uuid !== action.payload.card.uuid),
          normalizeCard(action.payload.card),
        ],
      };
```

- [ ] **Step 2: Fix `EMPTY_CARD` default**

In `src/actions/cardActions.ts`, change the import on line 7 to include `CardType`:

```ts
import { CardType, CardState, RarityType } from '../interfaces/enums';
```

and the `front` default (line 22-26):

```ts
  front: {
    name: '',
    cardTypes: [CardType.Creature],
    cardText: [],
  },
```

- [ ] **Step 3: Derive legacy `cardMainType` on save**

In `updateCard`, after `const parsed = { ...updated };` (line 114) and the `_id`/`__v` deletes, add (import `deriveLegacyMainType` from `../utils/cardTypes`):

```ts
  parsed.front = { ...parsed.front, cardMainType: deriveLegacyMainType(parsed.front) };
  if (parsed.back) {
    parsed.back = { ...parsed.back, cardMainType: deriveLegacyMainType(parsed.back) };
  }
```

- [ ] **Step 4: Type-check this slice**

Run: `npm run build`
Expected: the reducer/cardActions errors for `cardMainType` are gone; remaining errors are only in cardToColor/renderers/editor/filters/stats/sort (fixed in later tasks).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: normalize cards to cardTypes on load, derive legacy type on save" -- src/reducer.ts src/actions/cardActions.ts
```

---

## Task 6: `cardToColor` reads the face

**Files:**
- Modify: `src/utils/cardToColor.ts` (signature + `cardToColor` body, lines 145-177)
- Test: `src/utils/cardToColor.test.ts` if present (otherwise skip test edits; verify via callers)

**Interfaces:**
- Produces: `cardToColor(face: CardFaceInterface, manaCost?: string): { color: ColorType; allColors: ColorType[] }`.
- Consumes: `CardType` from enums; `CardFaceInterface`.

- [ ] **Step 1: Change the signature and token/land branches**

Edit the import (line 1) to add `CardType` and the interface:

```ts
import { BasicLandType, CardType, ColorType } from '../interfaces/enums';
import CardFaceInterface from '../interfaces/CardFaceInterface';
```

Replace the `cardToColor` declaration (lines 145-177) head:

```ts
const cardToColor = (
  face: CardFaceInterface,
  manaCost?: string,
): { color: ColorType; allColors: ColorType[] } => {
  let color: ColorType = ColorType.Colorless;
  const allColors: ColorType[] = [];

  const cardText = face.cardText ?? [];
  const tokenColors = face.tokenColors;
  const types = Array.isArray(face.cardTypes) ? face.cardTypes : [];

  // Non-land tokens take their colors from the explicit tokenColors selection.
  const isToken = types.includes(CardType.Token) && !types.includes(CardType.Land);

  if (isToken) {
    if (tokenColors && tokenColors.length > 0) {
      const selected = tokenColors.filter(t =>
        (Object.values(ColorType) as string[]).includes(t),
      ) as ColorType[];
      if (selected.length >= 2) return { color: ColorType.Gold, allColors: selected };
      if (selected.length === 1) return { color: selected[0], allColors: selected };
    }
    return { color: ColorType.Colorless, allColors: [] };
  }

  if (types.includes(CardType.Land)) {
    const identity = getLandColor(cardText);
    if (identity.length === 1) return { color: identity[0], allColors: identity };
    if (identity.length >= 2) return { color: ColorType.Gold, allColors: identity };
    return { color: ColorType.Colorless, allColors: [ColorType.Colorless] };
  }

  if (!manaCost) return { color: ColorType.Colorless, allColors: [ColorType.Colorless] };
```

Leave the rest of the function body (the `setColor` closure and mana-cost switch, lines 181-259) unchanged.

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: errors now only at `cardToColor(...)` call sites (filters/stats/sort/renderer) that still pass the old args — fixed in Tasks 10-12 and 7.

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor: cardToColor consumes the card face" -- src/utils/cardToColor.ts
```

---

## Task 7: Adventure frame + crown assets in `assetLoader`

**Files:**
- Modify: `src/components/TemplatingCardRender/assetLoader.tsx`
- Test: `src/components/TemplatingCardRender/assetLoader.test.ts`

**Interfaces:**
- Produces:
  - `getAdventureMainframe(color: ColorType): ImageResData`
  - `getAdventurePinline(colors: ColorType[]): string`
  - `getAdventureRulesLeft(colors: ColorType[]): string`
  - `getCrown(..., isAdventure = false)` — adventure crown style; adventure wins over nickname/floating.

- [ ] **Step 1: Confirm the on-disk asset layout** (the tree is mid-restructure)

Run (PowerShell):
```powershell
Get-ChildItem src/components/TemplatingCardRender/images/mainframes/adventure -Recurse -Name
Get-ChildItem src/components/TemplatingCardRender/images/parts/adventurePinline -Name
Get-ChildItem src/components/TemplatingCardRender/images/parts/adventureRulesLeft -Name
Get-ChildItem src/components/TemplatingCardRender/images/crown/adventure -Name
```
Record the exact filenames (single color `w/u/b/r/g/m/c/l/a` + `*Thumb`, and two-color combos `wu`, `ub`, …). Use these in the imports below; adjust the subdirectory (`regular/`) to match what exists.

- [ ] **Step 2: Add imports** mirroring the existing crown/mainframe import blocks

At the top of `assetLoader.tsx`, add import groups for the adventure mainframes (single color, full-res + Thumb), adventure pinline (single + combos), adventure rules-left (single + combos), and adventure crowns (single + combos), following the exact naming style already used for `crown/nickname/*` and `mainframes/*`. Example shape (adapt names/paths to Step 1 findings):

```tsx
import AdventureMainframeW from './images/mainframes/adventureEld/regular/w.png';
import AdventureMainframeWLowRes from './images/mainframes/adventureEld/regular/wThumb.png';
// … u, b, r, g, m (gold), c (colorless), l (land), a (artifact) as present …

import AdventurePinlineW from './images/parts/adventurePinline/w.png';
import AdventurePinlineWu from './images/parts/adventurePinline/wu.png';
// … all single colors + WUBRG two-color combos …

import AdventureRulesLeftW from './images/parts/adventureRulesLeft/w.png';
import AdventureRulesLeftWu from './images/parts/adventureRulesLeft/wu.png';
// … all single colors + combos …

import CrownAdventureW from './images/crown/adventureEld/w.png';
import CrownAdventureWLowRes from './images/crown/adventureEld/wThumb.png';
// … u, b, r, g, m, l, a + combos (wu, ub, …) …
```

- [ ] **Step 3: Write the failing test** (append to `assetLoader.test.ts`)

```ts
import {
  getAdventureMainframe,
  getAdventurePinline,
  getAdventureRulesLeft,
  getCrown,
} from './assetLoader';
import { ColorType } from '../../interfaces/enums';

describe('adventureEld frames', () => {
  it('returns a color-specific adventureEld mainframe', () => {
    const w = getAdventureMainframe(ColorType.White);
    const u = getAdventureMainframe(ColorType.Blue);
    expect(w.highRes).toBeTruthy();
    expect(w.highRes).not.toBe(u.highRes);
  });

  it('returns combo-order-independent pinline and rules-left', () => {
    expect(getAdventurePinline([ColorType.White, ColorType.Blue])).toBe(
      getAdventurePinline([ColorType.Blue, ColorType.White]),
    );
    expect(getAdventureRulesLeft([ColorType.White, ColorType.Blue])).toBe(
      getAdventureRulesLeft([ColorType.Blue, ColorType.White]),
    );
  });

  it('selects a distinct adventureEld crown style', () => {
    const highResOf = (c: ReturnType<typeof getCrown>) =>
      typeof c === 'string' ? c : c.highRes;
    const base = getCrown(ColorType.White, false, false, false, false, [ColorType.White]);
    const adventure = getCrown(
      ColorType.White,
      false,
      false,
      false,
      false,
      [ColorType.White],
      true,
    );
    expect(highResOf(adventure)).not.toBe(highResOf(base));
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm test src/components/TemplatingCardRender/assetLoader.test.ts`
Expected: FAIL — new getters not exported / `getCrown` has no 7th param.

- [ ] **Step 5: Implement the getters**

Add near the other mainframe getters. Reuse the existing combo-key helper the file already uses for two-color crowns (find how `getTwoColorCrown` orders colors into a `wu`-style key) and apply the same ordering for pinline/rules-left. Example skeleton (adapt to the real combo-key util + imported names):

```tsx
export const getAdventureMainframe = (color: ColorType): ImageResData => {
  switch (color) {
    case ColorType.White: return { highRes: AdventureMainframeW, lowRes: AdventureMainframeWLowRes };
    case ColorType.Blue:  return { highRes: AdventureMainframeU, lowRes: AdventureMainframeULowRes };
    case ColorType.Black: return { highRes: AdventureMainframeB, lowRes: AdventureMainframeBLowRes };
    case ColorType.Red:   return { highRes: AdventureMainframeR, lowRes: AdventureMainframeRLowRes };
    case ColorType.Green: return { highRes: AdventureMainframeG, lowRes: AdventureMainframeGLowRes };
    case ColorType.Gold:  return { highRes: AdventureMainframeM, lowRes: AdventureMainframeMLowRes };
    default:              return { highRes: AdventureMainframeC, lowRes: AdventureMainframeCLowRes };
  }
};

// colorsToComboKey: reuse the same ordering the file already uses for crowns.
export const getAdventurePinline = (colors: ColorType[]): string =>
  ADVENTURE_PINLINE_BY_KEY[colorsToComboKey(colors)] ?? '';

export const getAdventureRulesLeft = (colors: ColorType[]): string =>
  ADVENTURE_RULES_LEFT_BY_KEY[colorsToComboKey(colors)] ?? '';
```

where `ADVENTURE_PINLINE_BY_KEY` / `ADVENTURE_RULES_LEFT_BY_KEY` are plain maps from combo key (`'w'`, `'wu'`, …) to the imported asset, built once at module scope.

- [ ] **Step 6: Extend `getCrown`** (lines 1039-1104)

Add a 7th parameter and short-circuit to the adventure style before the existing branches:

```tsx
export const getCrown = (
  color: ColorType,
  isFullart = false,
  isLand = false,
  isArtefact = false,
  isNickname = false,
  colors: ColorType[] = [],
  isAdventure = false,
): ImageResData | string => {
  if (isAdventure) {
    return ADVENTURE_CROWN_BY_KEY[colorsToComboKey(colors.length ? colors : [color])] ??
      { highRes: CrownAdventureC, lowRes: CrownAdventureCLowRes };
  }
  // … existing body unchanged …
```

where `ADVENTURE_CROWN_BY_KEY` maps combo key → `{ highRes, lowRes }`.

- [ ] **Step 7: Run tests to verify pass**

Run: `npm test src/components/TemplatingCardRender/assetLoader.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git commit -m "feat: adventure mainframe/pinline/rules-left getters + adventure crown style" -- src/components/TemplatingCardRender/assetLoader.tsx src/components/TemplatingCardRender/assetLoader.test.ts
```

---

## Task 8: `TemplatingCardRender` — type-set booleans, adventure layout, crown, type line

**Files:**
- Modify: `src/components/TemplatingCardRender/TemplatingCardRender.tsx` (props type ~72-73; booleans 108-175; mainframe chain 222-235; crown 243-296; type line 376-393)
- Modify: `src/components/TemplatingCardRender/TemplatingCardRender.module.css` (new `.adventureRulesLeft` overlay class)

**Interfaces:**
- Consumes: `getAdventureMainframe`, `getAdventurePinline`, `getAdventureRulesLeft`, `getCrown` (7-arg) from `./assetLoader`; `formatTypeLine`, `hasType` from `../../utils/cardTypes`; `CardType` from enums.

- [ ] **Step 1: Props + booleans**

Change the props type fields (around 72-73) from `cardMainType: CardMainType; cardSubTypes?: string;` to `cardTypes: CardType[]; cardSubTypes?: string;` and update destructuring (89-90) accordingly (`cardTypes`).

Replace the boolean block (108-175) with type-set reads:

```tsx
  const isLand = cardTypes.includes(CardType.Land);
  const isBasicLand = cardTypes.includes(CardType.BasicLand);
  const isPlaneswalker = cardTypes.includes(CardType.Planeswalker);
  const isEnchantment = cardTypes.includes(CardType.Enchantment);
  const isArtifact = cardTypes.includes(CardType.Artifact);
  const isCreature = cardTypes.includes(CardType.Creature);
  const isAdventure = cardTypes.includes(CardType.Adventure);
  const isToken = cardTypes.includes(CardType.Token);
  const isInvention = artStyle === CardArtStyles.Invention;
```

Update the two early-return guards: BasicLand branch (113) condition → `if (isBasicLand) {`; Planeswalker branch (149) → `if (isPlaneswalker) {`. (The `BasicLandCardRender` still needs `basicLandType`; pass as before.)

- [ ] **Step 2: Mainframe chain + adventure pinline/rules-left**

In the mainframe `if/else` (222-235), add an adventure branch before the final `else`:

```tsx
  } else if (isToken) {
    mainframe = getTokenMainframe(color, isArtifact, isLand);
  } else if (isLand) {
    mainframe = getLandMainframe(color, artStyle);
  } else if (isAdventure) {
    mainframe = getAdventureMainframe(color);
  } else {
    mainframe = getColorMainframe(color, isEnchantment, isArtifact, vehicle);
  }
```

Override the pinline for adventure (after line 202):

```tsx
  const pinline = isAdventure
    ? getAdventurePinline(isLand ? landColors : allColors)
    : getPinline(isLand ? landColors : allColors, isArtifact, artStyle, isToken);
  const adventureRulesLeft = isAdventure
    ? getAdventureRulesLeft(isLand ? landColors : allColors)
    : '';
```

Render the decorative left box as an overlay image (JSX, after the `rulesPart` image at line 359):

```tsx
          {adventureRulesLeft ? (
            <img className={styles.adventureRulesLeft} src={adventureRulesLeft} alt="" />
          ) : null}
```

- [ ] **Step 3: Adventure crown**

In the crown block (243-296), pass the adventure flag to the first `getCrown` call (246-253):

```tsx
    const crownImagePath = getCrown(
      color,
      isFullArt,
      isLand,
      isArtifact,
      isNickname,
      isLand ? landColors : allColors,
      isAdventure,
    );
```

(Leave the `legendary && !isInvention` guard unchanged — crowns, including the adventure crown, still only show on legendary cards.)

- [ ] **Step 4: Type line via helper**

Replace the type-line JSX (387-393) with:

```tsx
          <div className={`${styles.type} ${isToken ? styles.tokenType : ''}`}>
            {formatTypeLine(cardRenderProps as unknown as CardFaceInterface)}
          </div>
```

(Import `CardFaceInterface` if not already. `cardRenderProps` already carries `cardTypes`/`legendary`/`vehicle`/`cardSubTypes`. `formatTypeLine` prepends `Legendary` and prints Token/BasicLand from the type list, so remove the inline `legendary ? 'Legendary ' : ''` logic here.)

Also update the mana-cost suppression (376-383): replace the `cardMainType !== Land && cardMainType !== TokenLand && !isToken` condition with `!isLand && !isToken && !backFace`.

- [ ] **Step 5: CSS for the decorative left box**

In `TemplatingCardRender.module.css`, add an `.adventureRulesLeft` rule positioned over the left column (mirror the existing `.rulesPart`/`.pinline` absolute-position pattern; exact coordinates can be tuned later — decorative). Example:

```css
.adventureRulesLeft {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
```

- [ ] **Step 6: Type-check + run renderer tests**

Run: `npm run build` then `npm test src/components/TemplatingCardRender`
Expected: this component's `cardMainType` errors are gone. Some existing renderer tests may still fail where they pass `cardMainType` props — fixed in Task 12.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: render Adventure layout + crown; drive TemplatingCardRender from cardTypes" -- src/components/TemplatingCardRender/TemplatingCardRender.tsx src/components/TemplatingCardRender/TemplatingCardRender.module.css
```

---

## Task 9: `InvocationCardRender` + `PlaneswalkerCardRender`

**Files:**
- Modify: `src/components/TemplatingCardRender/InvocationCardRender.tsx` (props ~36-37; destructure 51; isCreature/isArtifact 67-72; type line 117-122)
- Modify: `src/components/TemplatingCardRender/PlaneswalkerCardRender.tsx` (props ~48-49; destructure 63; type line 155-158)

**Interfaces:**
- Consumes: `formatTypeLine` from `../../utils/cardTypes`; `CardType`.

- [ ] **Step 1: Invocation**

Change props/destructure from `cardMainType` to `cardTypes`/`token`/`basic`. Replace `isCreature`/`isArtifact` (67-72):

```tsx
  const isCreature = cardTypes.includes(CardType.Creature);
  const isArtifact = cardTypes.includes(CardType.Artifact);
```

Replace the type-line body (117-122) with `{formatTypeLine(cardRender)}` (pass the face object the component already has).

- [ ] **Step 2: Planeswalker**

Change props/destructure to `cardTypes`. Replace the type-line body (155-158) with `{formatTypeLine(cardRender)}`.

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: these two files' `cardMainType` errors are gone.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: Invocation/Planeswalker renders read cardTypes" -- src/components/TemplatingCardRender/InvocationCardRender.tsx src/components/TemplatingCardRender/PlaneswalkerCardRender.tsx
```

---

## Task 10: `CardEditor` — cardTypes multi-select, token/basic toggles, helpers

**Files:**
- Modify: `src/components/CardEditor/CardEditor.tsx` (imports; `isArtStyleAvailableForType` 41-65; `dummyCard` 67-86; `saveValue` 159-180; helpers 263-286; inputConfig 353-362; BasicLand duplicate 418-427; `addBackFace` 456-475)

**Interfaces:**
- Consumes: `CardType`, `BasicLandType`, `CardArtStyles`, `BasicLandArtStyles` from enums; `hasType` optional.

- [ ] **Step 1: Replace the main `cardMainType` select with a `cardTypes` multi-select + flags**

Change the `cardMainType` inputConfig entry (353-362) to:

```tsx
    {
      key: 'cardTypes',
      type: 'multi-select',
      name: 'Card Types',
      data: (Object.keys(CardType) as (keyof typeof CardType)[]).map(type => ({
        key: CardType[type],
        value: CardType[type],
      })),
      width: 100,
    },
```

`Token` and `Basic Land` are now options inside this multi-select — do NOT add separate `token`/`basic` boolean toggles. Remove the duplicate BasicLand-specific `cardMainType` select (418-427); the existing `basicLandType` config entry stays and should render when `getValue('cardTypes')?.includes(CardType.BasicLand)`.

- [ ] **Step 2: Rewrite the field-visibility helpers** (263-286)

```tsx
  const types = (): string[] => getValue('cardTypes') || [];
  const isCreature = () => types().includes(CardType.Creature);
  const isArtifact = () => types().includes(CardType.Artifact);
  const isVehicle = () => isArtifact() && !!getValue('vehicle');
  const isPlaneswalker = () => types().includes(CardType.Planeswalker);
  const isLand = () =>
    types().includes(CardType.Land) || types().includes(CardType.BasicLand);
  const hasMana = () =>
    !types().includes(CardType.Token) &&
    !isLand() &&
    !types().includes(CardType.Emblem);
  const showManaCost = () => hasMana() && !editBack;
  const isColoredToken = () =>
    types().includes(CardType.Token) && !types().includes(CardType.Land);
  const hasStats = () => isCreature() || isPlaneswalker() || isVehicle();
```

- [ ] **Step 3: Rewrite `isArtStyleAvailableForType`** (41-65) to take the face/flags

```tsx
const isArtStyleAvailableForType = (artStyle: string, cardTypes: CardType[] = []): boolean => {
  if (cardTypes.includes(CardType.BasicLand)) {
    return (Object.values(BasicLandArtStyles) as string[]).includes(artStyle);
  }
  if (artStyle === CardArtStyles.Invocation) return false;
  if (artStyle === CardArtStyles.Invention) return cardTypes.includes(CardType.Artifact);
  if (artStyle !== CardArtStyles.Regular) {
    if (cardTypes.includes(CardType.Token)) return false;
    if (cardTypes.includes(CardType.Planeswalker)) return artStyle === CardArtStyles.Borderless;
    return true;
  }
  return true;
};
```

- [ ] **Step 4: Update the `saveValue` side-effects** (159-180)

```tsx
    if (key === 'cardTypes') {
      const nextTypes: CardType[] = value || [];

      if (nextTypes.includes(CardType.BasicLand)) {
        const bl = getValue('basicLandType');
        if (![BasicLandType.Plains, BasicLandType.Island, BasicLandType.Swamp,
              BasicLandType.Mountain, BasicLandType.Forest].includes(bl)) {
          saveValue('basicLandType', BasicLandType.Plains);
        }
      }

      if (!isArtStyleAvailableForType(getValue('artStyle'), nextTypes)) {
        saveValue(
          'artStyle',
          nextTypes.includes(CardType.BasicLand)
            ? BasicLandArtStyles.Regular
            : CardArtStyles.Regular,
        );
      }
    }
```

- [ ] **Step 5: Update defaults** — `dummyCard` front (line 74) and `addBackFace` (461) from `cardMainType: CardMainType.Creature` to `cardTypes: [CardType.Creature]`. Update the enums import to include `CardType` (keep `BasicLandType`).

- [ ] **Step 6: Type-check**

Run: `npm run build`
Expected: CardEditor errors gone. Remaining: filters/stats/sort (Tasks 11) and any tests (Task 12).

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: edit cardTypes as a multi-select with token/basic flags" -- src/components/CardEditor/CardEditor.tsx
```

---

## Task 11: Filters, stats, and sort call sites

**Files:**
- Modify: `src/components/CollectionFilterControls/CollectionFilterControls.tsx` (init 39-45 usage; stats 100-124; checkbox 202-214)
- Modify: `src/App.tsx` (filter 139-153)
- Modify: `src/components/CollectionStats/CollectionStats.tsx` (10-14, 27-40, 60)
- Modify: `src/utils/sortAccessors.ts` (34-50)

**Interfaces:**
- Consumes: `CardType`, `mapEnum` from enums; updated `cardToColor(face, manaCost)`.

- [ ] **Step 1: CollectionFilterControls**

- Where `types` is initialised, use `createEnumInitState(Object.values(CardType))`.
- In the stats `useMemo` (100-124): seed with `Object.values(CardType)`; change the color line to `cardToColor(card.front, card.manaCost).color`; replace `stats[card.front.cardMainType] += 1;` with:

```tsx
    card.front.cardTypes.forEach(t => {
      stats[t] += 1;
    });
```

- Checkbox render (202-214): `mapEnum(CardType, (key: string) => …)` (unchanged otherwise).
- Update the `CardMainType` import to `CardType`.

- [ ] **Step 2: App.tsx filter** (139-153)

Replace the color arg and the type check:

```tsx
          collectionFilter.colors[cardToColor(o.front, o.manaCost).color] &&
          collectionFilter.rarity[o.rarity] &&
          o.front.cardTypes.some(t => collectionFilter.types[t]) &&
          collectionFilter.creators[o.creator.uuid] !== false,
```

(A card shows if ANY of its types is enabled — see spec open point 1.)

- [ ] **Step 3: CollectionStats** (10-14, 27-40, 60)

- Seed `cardTypes` object with `Object.values(CardType)`.
- Color line → `cardToColor(card.front, card.manaCost)`.
- Replace `stats[color][card.front.cardMainType] += 1;` with `card.front.cardTypes.forEach(t => { stats[color][t] += 1; });`.
- Columns: `Object.values(CardType).forEach(key => addColumn(key));`.
- Update the `CardMainType` import to `CardType`.

- [ ] **Step 4: sortAccessors** (34-50)

Replace both `cardToColor(o.front.cardMainType, o.manaCost, o.front.cardText, o.front.tokenColors)` calls with `cardToColor(o.front, o.manaCost)`.

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: compiles except possibly test files.

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor: filters, stats, and sort read cardTypes" -- src/components/CollectionFilterControls/CollectionFilterControls.tsx src/App.tsx src/components/CollectionStats/CollectionStats.tsx src/utils/sortAccessors.ts
```

---

## Task 12: Fix existing tests + full green build

**Files:**
- Modify: any `*.test.ts(x)` under `src/components/CardEditor/` and `src/components/TemplatingCardRender/` (and elsewhere) that construct cards/faces with `cardMainType` or call `cardToColor(cardMainType, …)`.

- [ ] **Step 1: Find every stale reference**

Run (Grep): search the `src` tree for `cardMainType` and for `cardToColor(` to list all remaining occurrences in test files.

- [ ] **Step 2: Update test fixtures**

For each hit, convert `cardMainType: CardMainType.X` to the new shape using the mapping in `src/utils/cardTypes.ts` (e.g. `cardMainType: CardMainType.EnchantmentCreature` → `cardTypes: [CardType.Enchantment, CardType.Creature]`; `CardMainType.CreatureToken` → `cardTypes: [CardType.Token, CardType.Creature]`; `CardMainType.TokenLand` → `cardTypes: [CardType.Token, CardType.Land]`; `CardMainType.BasicLand` → `cardTypes: [CardType.BasicLand]`). Convert `cardToColor(cardMainType, manaCost, text, tokenColors)` calls to `cardToColor(face, manaCost)` where `face` is a face object carrying `cardTypes`/`cardText`/`tokenColors`.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS. Fix any remaining failures by applying the same conversions.

- [ ] **Step 4: Type-check + lint**

Run: `npm run build` then `npm run lint`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git commit -m "test: update fixtures to cardTypes shape" -- <the test files you changed>
```

---

## Task 13: Manual smoke verification

- [ ] **Step 1:** `npm start`, open the app with the middleware running (per AGENTS.md), and confirm: existing cards render unchanged (legacy data normalized), the editor shows the multi-select + Token/Basic toggles, selecting multiple types works, and a legendary card with the `Adventure` type shows the adventure mainframe + left box + adventure crown.
- [ ] **Step 2:** Edit and save a card; reload; confirm it persists (new `cardTypes` read back, legacy `cardMainType` also written).

---

## Self-Review

**Spec coverage:**
- CardType enum + flags → Tasks 1, 4. ✓
- Backward-compatible read/write → Tasks 2, 5. ✓
- Rendering (booleans, adventure layout, crown, type line) → Tasks 7, 8, 9. ✓
- Editor → Task 10. ✓
- Filters/stats/sort + cardToColor → Tasks 6, 11. ✓
- Tests → Tasks 2, 3, 7, 12. ✓
- Adventure crown only on legendary → Task 8 Step 3 (guard unchanged). ✓
- Decorative left box, no half content → Task 8 Steps 2, 5. ✓

**Placeholder scan:** Asset import names in Task 7 are explicitly resolved against disk in Step 1 (the tree is mid-restructure); this is a real action, not a TODO. All logic/tests are concrete.

**Type consistency:** `cardToColor(face, manaCost?)`, `getCrown(…, isAdventure=false)`, `formatTypeLine(face)`, `legacyMainTypeToTypes/normalizeCard/deriveLegacyMainType` names used consistently across Tasks 2, 5, 6, 8, 9, 11.

## Open points carried from the spec (confirm during implementation)
1. Filter = match ANY enabled type (Task 11 Step 2).
2. Adventure crown wins over nickname/floating (Task 7 Step 6).
3. `CardMainType` kept as the legacy representation (not renamed); `CardType` is the new enum.
