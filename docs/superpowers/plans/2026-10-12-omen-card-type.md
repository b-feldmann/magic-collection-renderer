# Omen Card Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render and edit the Omen card type (a split-textbox card like Adventure: an Omen spell — OmenName, OmenCost, OmenType (Instant/Sorcery), OmenText — in the frame's left box, the card's standard rule text on the right), backed by the new omen mainframes and per-color parts carved from the user-supplied masks.

**Architecture:** Mirror the Adventure implementation end-to-end: carve `omenPinline` / `omenRulesLeft` parts out of `mainframes/omen/regular` with `scripts/generate-parts.cjs`, expose them plus omen mainframes (regular + nyx) through `assetLoader.tsx`, branch on `CardType.Omen` in `TemplatingCardRender.tsx` reusing the Adventure left-box SCSS geometry (the measured mask geometry is identical), and add an Omen section to `CardEditor`.

**Tech Stack:** React 19, antd 6, TypeScript, Vitest (jsdom), SCSS modules, jimp 1.6 (parts script). No new dependencies.

**Spec:** Chat spec with BJennWare (2026-10-12): Omen is akin to Adventure — additional fields OmenName, OmenType (Instant or Sorcery), OmenCost, and OmenText (confirmed); the standard rule text renders on the right side; masks `parts/omenPinline.png` + `parts/omenRulesLeft.png` and mainframes `mainframes/omen/{regular,nyx}/` were supplied by the user; all four omen fields must be shown in the CardEditor.

## Global Constraints

- Use npm; never `npm install` new packages (jimp and @resvg/resvg-js are already devDependencies).
- All frame-part images share the 5:7 card aspect and render into the 1500×2100 design space (`CARD_WIDTH`/`CARD_HEIGHT` in `src/utils/constants.ts`); images are never rescaled in markup.
- Omen and Adventure are mutually exclusive per face (`MUTUALLY_EXCLUSIVE_CARD_TYPES` in `src/utils/cardTypes.ts`) — the renderer never has to render both spell boxes for sane data.
- **Commit discipline: the working tree contains unrelated in-progress user work (LogRocket removal, `src/**` modifications) and staged asset moves. Every commit must be pathspec-scoped** — `git add <explicit paths>` then `git commit -m "..." -- <explicit paths>`. Never `git add -A`, never a bare `git commit`.
- The omen masks (`parts/omenPinline.png`, `parts/omenRulesLeft.png`) are pure-color alpha masks; only their alpha channel matters (same convention as every other mask in `scripts/generate-parts.cjs`).
- Test commands: `npm test <pattern>` (Vitest). Type-check via `npm run build`.

## Review Focus

1. **No omenCost set** — left box must fall back to the card's own manaCost colors, not render uncolored/blank (render test, Task 4).
2. **3+ color or colorless omenCost / manaCost** — 3+ colors fold to the gold (`m`) part; colorless folds to the `a` mainframe; empty color set yields no part (assetLoader tests, Task 3).
3. **Omen fields present but `CardType.Omen` not selected** — stale face data must not render the omen box (render control test, Task 4).
4. **Enchantment Omen** — nyx mainframe while pinline/rules-left stay regular-carved (render test, Task 4).
5. **Art styles** — Omen supports only Regular (no Extended/Borderless/ELD Alternate Art assets exist); the editor must not offer them and must auto-fall-back to Regular when Omen is added (editor tests, Task 5).

Open question flagged to the user (not implemented): `mainframes/omen/regular/{l,v}.png` (land/vehicle omen frames) stay unused — mirroring Adventure, a Land+Omen face renders the land mainframe chain first. Follow-up if omen lands/vehicles should use them.

---

### Task 1: Data model — OmenType enum, omen face fields, type-line filter

**Files:**
- Modify: `src/interfaces/enums.ts` (after `AdventureType`, ~line 55)
- Modify: `src/interfaces/CardFaceInterface.ts` (after the adventure fields, ~line 25)
- Modify: `src/utils/cardTypes.ts` (`formatTypeLine`, line 102-105)
- Test: `src/utils/cardTypes.test.ts` (`formatTypeLine` describe, ~line 146)

**Interfaces:**
- Produces: `enum OmenType { Instant = 'Instant', Sorcery = 'Sorcery' }` in `src/interfaces/enums.ts`
- Produces (on `CardFaceInterface`): `omenName?: string; omenCost?: string; omenText?: string[]; omenType?: OmenType;`
- Produces: `formatTypeLine` filters `CardType.Omen` out of the main type line, exactly as it filters `CardType.Adventure`

- [ ] **Step 1: Write the failing tests** in `src/utils/cardTypes.test.ts`, inside the `formatTypeLine` describe:

```ts
it('strips the Omen marker from the type line like Adventure', () => {
  expect(formatTypeLine(face({ cardTypes: [CardType.Creature, CardType.Omen] }))).toBe('Creature');
  // Pins the existing Adventure behavior next to it.
  expect(formatTypeLine(face({ cardTypes: [CardType.Creature, CardType.Adventure] }))).toBe('Creature');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test cardTypes.test`
Expected: FAIL — the new Omen case returns `'Creature Omen'`.

- [ ] **Step 3: Implement**

- `enums.ts`: add `OmenType` directly after `AdventureType`, same two-value shape and a comment mirroring the AdventureType one ("The spell half of an Omen card...").
- `CardFaceInterface.ts`: import `OmenType`; add the four omen fields after the adventure fields with a matching comment ("The spell half of an Omen card (the small left box on the frame).").
- `cardTypes.ts` `formatTypeLine`: change the filter to `cardType => cardType !== CardType.Adventure && cardType !== CardType.Omen`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test cardTypes.test`
Expected: PASS (all cardTypes tests).

- [ ] **Step 5: Commit**

```bash
git add src/interfaces/enums.ts src/interfaces/CardFaceInterface.ts src/utils/cardTypes.ts src/utils/cardTypes.test.ts
git commit -m "feat: add OmenType enum and omen face fields" -- src/interfaces/enums.ts src/interfaces/CardFaceInterface.ts src/utils/cardTypes.ts src/utils/cardTypes.test.ts
```

---

### Task 2: Parts generation — omen generator in generate-parts.cjs + run it

**Files:**
- Modify: `scripts/generate-parts.cjs` (new `generateOmenParts()` + CLI subset filter in `run()`)
- Create (generated): `src/components/TemplatingCardRender/images/parts/omenPinline/{w,u,b,r,g,m,wu,ub,br,rg,gw,wb,ur,bg,rw,gu}.png` (16 files)
- Create (generated): `src/components/TemplatingCardRender/images/parts/omenRulesLeft/` (same 16 files)
- Also committed here: the user's staged asset reorg — masks moved to `parts/omenPinline.png` / `parts/omenRulesLeft.png` and deletions of the superseded files under `mainframes/omen/regular/` (`omenRight.png`, `omenTypeTitle*.png`, `rules*.png`, `pinlineThumb.png`, `rulesRight.png`).

**Interfaces:**
- Consumes: masks `parts/omenPinline.png` + `parts/omenRulesLeft.png` (2010×2814, alpha masks) and frames `mainframes/omen/regular/<color>.png` (2010×2814) — all already on disk.
- Produces: on-disk assets consumed by Task 3; script entry point `npm run generate:parts -- omen`.

- [ ] **Step 1: Add `generateOmenParts()` mirroring `generateAdventureParts()`** (script lines ~493-607)

- `OMEN_DIR = path.join(MAINFRAMES_DIR, 'omen')`; `OMEN_SINGLE_COLORS` = `VARIANT_COLORS + ['m']` (w,u,b,r,g,m — the l/v frames stay unused, see Review Focus note).
- `OMEN_PART_TYPES = [{ type: 'omenPinline', mask: 'omenPinline.png', style: 'regular' }, { type: 'omenRulesLeft', mask: 'omenRulesLeft.png', style: 'regular' }]`.
- Body mirrors `generateAdventureParts` exactly: per color load `mainframes/omen/regular/<color>.png` (resize to mask size only if sizes differ — they match at 2010×2814), `carveSingle` for singles, `writeCombos` for the ten combos, and `blendCenterX = /Rules/.test(type) ? visiblePixelCentroidX(mask) : undefined` (the rules-left box sits off-centre on the left half).
- Update the script's header comment block with a short omen paragraph.

- [ ] **Step 2: Add a CLI subset filter to `run()`**

`run()` reads `const only = process.argv.slice(2);` — when args are given, only the named generators run (keys: `m15`, `variants`, `adventure`, `omen`, `planeswalker`, `planeswalkerNickname`, `token`, `nickname`, `crown`); no args runs all (unchanged default). Add `await generateOmenParts();` to the sequence. This lets the omen parts be generated without rewriting the 100+ existing generated PNGs.

- [ ] **Step 3: Run the generator**

Run: `npm run generate:parts -- omen`
Expected: logs `omenPinline  ✓ <color>.png` and `omenRulesLeft  ✓ <color>.png` for 6 singles + 10 combos each; no `Skipped` lines; exit 0.

- [ ] **Step 4: Verify the outputs and that nothing else changed**

Run: `git status --porcelain`
Expected: new untracked `parts/omenPinline/` + `parts/omenRulesLeft/` directories only; **no modifications** to any existing part/mainframe PNG (proves the subset filter worked).

Run (spot-check, 2 files): `Get-ChildItem` the two new parts dirs — 16 PNGs each; pick `omenPinline/w.png` and confirm 2010×2814 and non-transparent pixels (System.Drawing one-liner, as used during planning).

- [ ] **Step 5: Commit (pathspec-scoped, includes the user's staged omen asset reorg)**

```bash
git add scripts/generate-parts.cjs "src/components/TemplatingCardRender/images/parts/omenPinline" "src/components/TemplatingCardRender/images/parts/omenRulesLeft" "src/components/TemplatingCardRender/images/parts/omenPinline.png" "src/components/TemplatingCardRender/images/parts/omenRulesLeft.png" "src/components/TemplatingCardRender/images/mainframes/omen"
git commit -m "feat: generate per-color omen pinline and rules-left parts" -- scripts/generate-parts.cjs "src/components/TemplatingCardRender/images/parts/omenPinline" "src/components/TemplatingCardRender/images/parts/omenRulesLeft" "src/components/TemplatingCardRender/images/parts/omenPinline.png" "src/components/TemplatingCardRender/images/parts/omenRulesLeft.png" "src/components/TemplatingCardRender/images/mainframes/omen"
```

---

### Task 3: assetLoader — omen imports and getters

**Files:**
- Modify: `src/components/TemplatingCardRender/assetLoader.tsx`
- Test: `src/components/TemplatingCardRender/assetLoader.test.ts`

**Interfaces:**
- Consumes: the PNGs from Task 2 and `mainframes/omen/{regular,nyx}/<color>.png` (+ `<color>Thumb.png`).
- Produces (used by Task 4):
  - `getOmenMainframe(color: ColorType, isEnchantment = false): ImageResData`
  - `getOmenPinline(colors: ColorType[]): string`
  - `getOmenRulesLeft(colors: ColorType[]): string`
  - internal `getSpellBoxVariant(colors: ColorType[]): PartVariant` (renamed from `getAdventureVariant`, same body)

- [ ] **Step 1: Write the failing tests** in `assetLoader.test.ts` — new `describe('omen frames')` mirroring the adventure ones:

```ts
it('returns a color-specific omen mainframe', () => { /* w vs u highRes differ, both truthy */ });
it('returns the nyx omen mainframe for an enchantment omen', () => { /* highRes contains 'omen/nyx/w', differs from regular */ });
it('folds a colorless enchantment omen to the nyx frame', () => { /* contains 'omen/nyx/a', differs from Gold nyx */ });
it('folds a colorless omen to the regular a frame', () => { /* getOmenMainframe(ColorType.Colorless) truthy, differs from White */ });
it('returns combo-order-independent pinline and rules-left', () => { /* [W,U] === [U,W], truthy, both getters */ });
it('folds 3+ colors to the gold part and the empty set to no asset', () => { /* === [Gold] variant for both getters; ([]) === '' */ });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test assetLoader.test`
Expected: FAIL — imports `getOmenMainframe` etc. do not exist.

- [ ] **Step 3: Implement in `assetLoader.tsx`**

- Imports (after the adventure blocks): omen mainframes regular w/u/b/r/g/m/a + Thumbs (from `./images/mainframes/omen/regular/`), omen mainframes nyx w/u/b/r/g/m/a + Thumbs (from `./images/mainframes/omen/nyx/`), and 16 `OmenPinline<Variant>` + 16 `OmenRulesLeft<Variant>` imports (from `./images/parts/omenPinline/` and `./images/parts/omenRulesLeft/`, keys `W,U,B,R,G,M,Wu,Ub,Br,Rg,Gw,Wb,Ur,Bg,Rw,Gu`).
- Rename `getAdventureVariant` → `getSpellBoxVariant` (not exported; update its 4 adventure call sites) with a comment noting it is shared by adventures and omens.
- `OMEN_PINLINE_BY_KEY` / `OMEN_RULES_LEFT_BY_KEY` records (`Partial<Record<PartVariant, string>>`, same 16 keys as the adventure maps) + the two getters using `getSpellBoxVariant`.
- `getOmenMainframe(color, isEnchantment)` — mirror `getAdventureMainframe` structure exactly (same switch, nyx for enchantment, default → the `a` frame).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test assetLoader.test`
Expected: PASS (existing adventure tests unaffected by the rename — it is internal).

- [ ] **Step 5: Commit**

```bash
git add src/components/TemplatingCardRender/assetLoader.tsx src/components/TemplatingCardRender/assetLoader.test.ts
git commit -m "feat: add omen mainframe and part getters to assetLoader" -- src/components/TemplatingCardRender/assetLoader.tsx src/components/TemplatingCardRender/assetLoader.test.ts
```

---

### Task 4: TemplatingCardRender — omen frame rendering

**Files:**
- Modify: `src/components/TemplatingCardRender/TemplatingCardRender.tsx`
- Test (create): `src/components/TemplatingCardRender/TemplatingCardRender.omen.test.tsx`

**Interfaces:**
- Consumes: `getOmenMainframe/getOmenPinline/getOmenRulesLeft` (Task 3), `OmenType` (Task 1), existing adventure SCSS classes.
- Produces: new optional props on `TemplatingCardRenderProps`: `omenName?: string; omenCost?: string; omenText?: string[]; omenType?: OmenType;` (they flow automatically from card faces — `Cell.tsx` / `BigCardRenderModal.tsx` spread the whole face).

- [ ] **Step 1: Write the failing tests** — new file mirroring `TemplatingCardRender.adventure.test.tsx` (same mock store, jsdom polyfills, `renderOmen` helper with `cardTypes: [Creature, ...(noOmen ? [] : [CardType.Omen]), ...(enchantment ? [Enchantment] : [])]`, default `manaCost '{1}{G}'`):

```ts
describe('TemplatingCardRender - omen frame') {
  it('renders the omen left-box overlay', () => { /* img class includes 'adventureRulesLeft', src contains 'omenRulesLeft' */ });
  it('renders the omen mainframe and pinline assets', () => { /* mainframe src contains 'mainframes/omen', pinline src contains 'omenPinline' */ });
}
describe('TemplatingCardRender - omen left-box color derivation') {
  it('derives the left box color from the omenCost, not the manaCost', () => { /* omenCost '{2}{U}': src 'omenRulesLeft/u', not 'omenRulesLeft/g' */ });
  it('a two-color omenCost resolves the two-color combo left part', () => { /* '{W}{U}' → 'omenRulesLeft/wu' */ });
  it('the pinline still derives from the card manaCost', () => { /* omenCost '{2}{U}' → 'omenPinline/g' */ });
  it('falls back to the manaCost colors when no omenCost is set', () => { /* → 'omenRulesLeft/g' */ });
}
describe('TemplatingCardRender - enchantment omen (nyx mainframe)') {
  it('renders the nyx omen mainframe but keeps regular-carved parts', () => { /* mainframe 'mainframes/omen/nyx'; pinline src not containing 'nyx' */ });
  it('CONTROL: a non-enchantment omen renders no nyx omen mainframe', () => {});
}
describe('TemplatingCardRender - omen spell box') {
  it('renders the omen name, cost, type line, and text into the left box', () => { /* getByText name; cost box has .ms icons; getByText 'Instant – Omen'; omen text visible */ });
  it('a Sorcery omen renders a Sorcery type line', () => { /* 'Sorcery – Omen' */ });
  it('renders no omen spell elements for a card without the Omen type', () => { /* noOmen + omen fields still passed: no adventureName/adventureCost/adventureTypeLine/adventureText divs */ });
  it('constrains the creature text box to the right half of the frame', () => { /* div with class 'adventureRightText', cardText visible */ });
  it('CONTROL: a non-omen keeps the full-width text box', () => {});
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test TemplatingCardRender.omen.test`
Expected: FAIL — omen assets/branches don't exist; overlay undefined.

- [ ] **Step 3: Implement in `TemplatingCardRender.tsx`** (mirroring the adventure code at the cited lines)

- Import `OmenType` (enums) and the three omen getters (assetLoader).
- Props (after the adventure block, ~line 94) + destructure (~line 108).
- `const isOmen = cardTypes.includes(CardType.Omen);` next to `isAdventure` (~line 167).
- After `adventureColors` (~line 234): `const omenColors = isOmen && omenCost ? getColor(omenCost).allColors : undefined;`
- Pinline chain (~line 255): insert an `isOmen ? getOmenPinline(isLand ? landColors : allColors)` branch between the alternate-art and adventure branches.
- After `adventureRulesLeft` (~line 264): `const omenRulesLeft = isOmen ? getOmenRulesLeft(isLand ? landColors : (omenColors ?? allColors)) : '';`
- `if (isAdventure) rulesPart = '';` (~line 282) → also clear for `isOmen`.
- Mainframe chain (~line 305): add `else if (isOmen) { mainframe = getOmenMainframe(color, isEnchantment); }` after the adventure branch.
- Left-box JSX after the adventure block (~line 463), with a comment that the omen left box shares the adventure frame geometry (measured masks align), so the adventure SCSS classes are reused: `{isOmen && omenName ? <div className={styles.adventureName}>{omenName}</div> : null}`; same for `omenCost` (`styles.adventureCost`, `injectManaIcons(getColor(omenCost).orderedCost, true)`), type line (`styles.adventureTypeLine`, `` `${omenType} – Omen` ``), and `omenText` (`styles.adventureText` + TextResize block with keys `omen-text-...`).
- Right text (~line 514-521): `adventureRightText` class and `maxFontSize 50` apply when `isAdventure || isOmen`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test TemplatingCardRender.omen.test`
Expected: PASS. Also run `npm test TemplatingCardRender` — all existing render tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/TemplatingCardRender/TemplatingCardRender.tsx src/components/TemplatingCardRender/TemplatingCardRender.omen.test.tsx
git commit -m "feat: render the Omen card type like Adventure" -- src/components/TemplatingCardRender/TemplatingCardRender.tsx src/components/TemplatingCardRender/TemplatingCardRender.omen.test.tsx
```

---

### Task 5: CardEditor — Omen type option, Omen section, art-style rules

**Files:**
- Modify: `src/components/CardEditor/CardEditor.tsx`
- Test: `src/components/CardEditor/CardEditor.omen.test.tsx` (update 1 existing test + add new ones)

**Interfaces:**
- Consumes: `OmenType` (Task 1), `MUTUALLY_EXCLUSIVE_CARD_TYPES` / `resolveExclusiveCardTypes` (existing), omen face fields (Task 1).
- Produces: editor edits `omenName/omenCost/omenType/omenText` on the current face; `CardType.Omen` selectable in the Card Types multi-select; art-style availability excludes every non-Regular style for Omen.

- [ ] **Step 1: Write the failing tests** in `CardEditor.omen.test.tsx` (reuse its existing `makeCard`/`renderEditor`/`typeOption` helpers; add adventure-test-style helpers `omenDivider()` and `selectOmenType(label)` mirroring `selectAdventureType` in `CardEditor.adventure.test.tsx`):

```ts
describe('CardEditor - Omen section') {
  it('lists Omen among the card type options (Split Card and Aftermath stay hidden)', () => { /* UPDATE of the existing hidden-types test */ });
  it('shows the Omen section with its four fields for an Omen card', () => { /* divider text 'Omen'; Name/Cost/Type/Text fields for omenName/omenCost/omenType/omenText */ });
  it('CONTROL: renders no Omen section for a non-omen card', () => {});
  it('offers no Add Mechanic select on the Omen Text field', () => {});
  it('offers exactly Instant and Sorcery as omen types', () => {});
  it('persists edits to the omen fields on the face', () => { /* type values, select Sorcery, assert updateCard mock call face: omenName/omenCost/omenText/omenType */ });
  it('adding the Omen card type defaults the omen type to Instant', () => {});
  it('offers only the Regular art style for an Omen card', () => { /* Art Style radios: Regular present; Extended/Borderless/ELD Alternate Art absent */ });
  it('adding the Omen type switches a chosen Extended style to Regular', () => {});
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test CardEditor.omen.test`
Expected: FAIL — Omen still hidden, no section.

- [ ] **Step 3: Implement in `CardEditor.tsx`**

- `HIDDEN_CARD_TYPES` → `new Set([CardType.Aftermath, CardType.SplitCard])`.
- Import `OmenType`.
- `omenSectionConfig: InputConfigInterface[]` after `adventureSectionConfig` (~line 98): divider `'Omen'`; `omenName` input (width 50); `omenCost` input (width 50); `omenType` select with `OmenType` data (width 100); `omenText` text-list (width 100, `allowMechanics: false`).
- Helper `const isOmen = () => types().includes(CardType.Omen);` next to `isAdventure` (~line 342); splice `...(isOmen() ? omenSectionConfig : [])` after the adventure splice (~line 471).
- In `saveValue`'s `cardTypes` branch (~line 218): mirror the adventureType defaulting — when `nextTypes.includes(CardType.Omen)` and `getValue('omenType')` is neither `OmenType.Instant` nor `OmenType.Sorcery`, `saveValue('omenType', OmenType.Instant)`.
- `isArtStyleAvailableForType` (~line 73): final `return !cardTypes.includes(CardType.Adventure);` → `return !cardTypes.includes(CardType.Adventure) && !cardTypes.includes(CardType.Omen);` with a comment ("for now, omens support no non-regular art styles"). The existing generic art-style fallback in `saveValue` then switches an Omen card to Regular automatically.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test CardEditor.omen.test`
Expected: PASS. Also run `npm test CardEditor` — adventure/alternate-art editor tests unaffected.

- [ ] **Step 5: Commit**

```bash
git add src/components/CardEditor/CardEditor.tsx src/components/CardEditor/CardEditor.omen.test.tsx
git commit -m "feat: edit Omen cards in the CardEditor" -- src/components/CardEditor/CardEditor.tsx src/components/CardEditor/CardEditor.omen.test.tsx
```

---

### Task 6: Whole-branch verification

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all pass (no regression in adventure/editor/type tests).

- [ ] **Step 2: Lint + type-check**

Run: `npm run lint` then `npm run build`
Expected: no eslint errors; `tsc` clean; vite build succeeds.

- [ ] **Step 3: Visual smoke check with the user**

The user opens the app (`npm run dev`, backend middleware on `:8080`) and creates an Omen card in the editor to confirm the frame looks right (positions come from the shared adventure geometry; a visual check is the only way to confirm the omen art aligns with the text boxes).
