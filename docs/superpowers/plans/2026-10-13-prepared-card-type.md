# Prepared Card Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render and edit the Prepared card type — a split-textbox card like Adventure/Omen but mirrored: the Prepared spell (prepareName, prepareCost, prepareType (Instant/Sorcery), prepareText) renders into the frame's **right** box, the card's standard rules text into the **left** box — backed by the user-supplied `mainframes/prepare/{regular,nyx}` frames and parts carved from the `preparePinline` / `prepareRulesRight` masks.

**Architecture:** Mirror the Omen implementation end-to-end: `generatePrepareParts()` in `scripts/generate-parts.cjs` carves per-color `preparePinline` / `prepareRulesRight` parts from `mainframes/prepare/regular/<color>.png`; `assetLoader.tsx` exposes them plus the prepare mainframes (regular + nyx) through getters; `TemplatingCardRender.tsx` branches on `CardType.Prepared` with **new mirrored SCSS classes** (the spell box sits on the right half and is shorter than the adventure box, so the adventure classes cannot be reused); `CardEditor.tsx` gains a "Prepared" section and Regular-only art styles.

**Tech Stack:** React 19, antd 6, TypeScript, Vitest (jsdom), SCSS modules, jimp 1.6 (parts script). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-13-prepared-card-type-design.md` — the design this plan implements; read it first. Chat spec with BJennWare (2026-10-13): field names `prepareName`/`prepareCost`/`prepareType`/`prepareText` (approved); the spell-box type line renders **only** `Instant` or `Sorcery`, with **no** `– Prepared` suffix (differs from adventure/omen); only the Regular art style is available; the spell box is on the **right** side.

## Global Constraints

- Use npm; never install new packages (jimp 1.6 and @resvg/resvg-js are already devDependencies).
- All frame-part images share the 5:7 card aspect and render into the 1500×2100 design space (`CARD_WIDTH`/`CARD_HEIGHT` in `src/utils/constants.ts`); images are never rescaled in markup.
- Prepared, Adventure, and Omen are mutually exclusive per face (`MUTUALLY_EXCLUSIVE_CARD_TYPES` in `src/utils/cardTypes.ts`) — the renderer never renders two spell boxes for sane data.
- **Commit discipline: the working tree contains unrelated in-progress user work (`src/components/ChangeLogModal/updateLog.tsx` modified). Every commit must be pathspec-scoped** — `git add <explicit paths>` then `git commit -m "..." -- <explicit paths>`. Never `git add -A`, never a bare `git commit`.
- The prepare masks (`parts/preparePinline.png`, `parts/prepareRulesRight.png`) are pure alpha masks at 2010×2814 (same as the mainframes); only their alpha channel matters (same convention as every other mask in `scripts/generate-parts.cjs`).
- Test commands: `npm test <pattern>` (Vitest). Type-check via `npm run build`. Lint via `npm run lint`.

## Review Focus

1. **No prepareCost set** — the right spell box must fall back to the card's own manaCost colors, not render uncolored/blank (render test, Task 4).
2. **3+ color or colorless prepareCost / manaCost** — 3+ colors fold to the gold (`m`) part; colorless folds to the `a` mainframe; empty color set yields no part (assetLoader tests, Task 3).
3. **prepare fields present but `CardType.Prepared` not selected** — stale face data must not render the spell box (render control test, Task 4).
4. **Enchantment Prepared** — nyx mainframe while pinline/rules-right stay regular-carved (render test, Task 4).
5. **Art styles** — Prepared supports only Regular (no Extended/Borderless/ELD Alternate Art assets exist); the editor must not offer them and must auto-fall-back to Regular when Prepared is added (editor tests, Task 5).
6. **Type line without suffix** — the spell box type line renders exactly `Instant`/`Sorcery`, never `Instant – Prepared` (user decision, render test, Task 4).

Measured geometry (jimp, 2010×2814 masks → 1500×2100 design space), used in Task 4:

- `preparePinline.png`: full-frame pinline, x 78–1422, y 90–1948 (same footprint as the omen/adventure pinline).
- `prepareRulesRight.png` (the spell box): **x 745.5–1419.4, y 1313.4–1878.4** — mirror of the omen left box in width (both 674 wide) but shorter (bottom edge y 1878 vs the omen box's 1937).
- The left main-text box (measured from `mainframes/prepare/regular/rules.png`, a superseded reference): x 110–745, y 1313–1937 — same dimensions as the omen left box; it is baked into the prepare mainframes (verified by pixel comparison against the m15 frame: left half near-identical, right half heavily different).

---

### Task 1: Data model — CardType.Prepared, PreparedType enum, face fields, exclusivity

**Files:**
- Modify: `src/interfaces/enums.ts` (after `OmenType`, ~line 63)
- Modify: `src/interfaces/CardFaceInterface.ts` (after the omen fields, ~line 30)
- Modify: `src/utils/cardTypes.ts` (`MUTUALLY_EXCLUSIVE_CARD_TYPES` line 37, `formatTypeLine` line 102)
- Test: `src/utils/cardTypes.test.ts`

**Interfaces:**
- Produces: `CardType.Prepared = 'Prepared'`; `enum PreparedType { Instant = 'Instant', Sorcery = 'Sorcery' }` in `src/interfaces/enums.ts`
- Produces (on `CardFaceInterface`, imported from enums): `prepareName?: string; prepareCost?: string; prepareText?: string[]; prepareType?: PreparedType;`
- Produces: `MUTUALLY_EXCLUSIVE_CARD_TYPES` includes `CardType.Prepared`; `formatTypeLine` filters `CardType.Prepared` out of the main type line

- [ ] **Step 1: Write the failing tests** in `src/utils/cardTypes.test.ts` — inside the `formatTypeLine` describe mirror the Omen one, and in the exclusivity describes:

```ts
it('strips the Prepared marker from the type line like Adventure and Omen', () => {
  expect(formatTypeLine(face({ cardTypes: [CardType.Creature, CardType.Prepared] }))).toBe('Creature');
  expect(formatTypeLine(face({ cardTypes: [CardType.Creature, CardType.Omen] }))).toBe('Creature');
});
it('degrades a Prepared-only face to Creature (no legacy equivalent)', () => {
  expect(deriveLegacyMainType(face({ cardTypes: [CardType.Prepared] }))).toBe(CardMainType.Creature);
});
it('strips a newly added Prepared when Adventure already exists', () => {
  expect(resolveExclusiveCardTypes([CardType.Creature, CardType.Adventure, CardType.Prepared], [])).toEqual([
    CardType.Creature, CardType.Adventure,
  ]);
});
it('keeps Prepared when it was already present and Omen is the newcomer', () => {
  expect(resolveExclusiveCardTypes([CardType.Creature, CardType.Prepared, CardType.Omen], [CardType.Creature, CardType.Prepared])).toEqual([
    CardType.Creature, CardType.Prepared,
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test cardTypes.test`
Expected: FAIL — `CardType.Prepared` does not exist (compile error in the test).

- [ ] **Step 3: Implement**

- `enums.ts`: `Prepared = 'Prepared',` at the end of `CardType` (after `Aftermath`); add `PreparedType` directly after `OmenType`, same two-value shape with a comment mirroring the OmenType one ("The spell half of a Prepared card. ...").
- `CardFaceInterface.ts`: import `PreparedType`; add the four prepare fields after the omen fields with a matching comment ("The spell half of a Prepared card (the small right box on the frame).").
- `cardTypes.ts`: add `CardType.Prepared,` to `MUTUALLY_EXCLUSIVE_CARD_TYPES`; in `formatTypeLine` extend the filter to also drop `CardType.Prepared`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test cardTypes.test`
Expected: PASS (all cardTypes tests).

- [ ] **Step 5: Commit**

```bash
git add src/interfaces/enums.ts src/interfaces/CardFaceInterface.ts src/utils/cardTypes.ts src/utils/cardTypes.test.ts
git commit -m "feat: add CardType.Prepared, PreparedType enum and prepare face fields" -- src/interfaces/enums.ts src/interfaces/CardFaceInterface.ts src/utils/cardTypes.ts src/utils/cardTypes.test.ts
```

---

### Task 2: Parts generation — prepare generator in generate-parts.cjs + run it

**Files:**
- Modify: `scripts/generate-parts.cjs` (new `generatePrepareParts()` + CLI subset key in `run()`)
- Create (generated): `src/components/TemplatingCardRender/images/parts/preparePinline/{w,u,b,r,g,m,wu,ub,br,rg,gw,wb,ur,bg,rw,gu}.png` (16 files)
- Create (generated): `src/components/TemplatingCardRender/images/parts/prepareRulesRight/` (same 16 files)
- Delete (superseded references, committed here): `src/components/TemplatingCardRender/images/mainframes/prepare/regular/rules.png` and `.../rulesRight.png` (same cleanup the omen commit did for its superseded files)

**Interfaces:**
- Consumes: masks `parts/preparePinline.png` + `parts/prepareRulesRight.png` (2010×2814, alpha masks) and frames `mainframes/prepare/regular/<color>.png` (2010×2814) — all already on disk.
- Produces: on-disk parts consumed by Task 3; CLI entry `npm run generate:parts -- prepare`.

- [ ] **Step 1: Add `generatePrepareParts()` mirroring `generateOmenParts()`** (script lines ~643-719)

- `PREPARE_DIR = path.join(MAINFRAMES_DIR, 'prepare')`; `PREPARE_GOLD_COLOR = 'm'`; `PREPARE_SINGLE_COLORS = [...VARIANT_COLORS, PREPARE_GOLD_COLOR]` (w,u,b,r,g,m — the l/v frames stay unused, like omens).
- `PREPARE_PART_TYPES = [{ type: 'preparePinline', mask: 'preparePinline.png', style: 'regular' }, { type: 'prepareRulesRight', mask: 'prepareRulesRight.png', style: 'regular' }]`.
- Body mirrors `generateOmenParts` exactly (masks and frames are the same 2010×2814, so no resize happens). Keep `blendCenterX = /Rules/.test(type) ? visiblePixelCentroidX(mask) : undefined` — `prepareRulesRight` matches `/Rules/`, and its box sits off-centre on the right half.
- Update the script's header comment block with a short prepare paragraph.

- [ ] **Step 2: Add the CLI subset key in `run()`**

Next to `if (selected('omen')) await generateOmenParts();` (line ~317): `if (selected('prepare')) await generatePrepareParts();`.

- [ ] **Step 3: Run the generator**

Run: `npm run generate:parts -- prepare`
Expected: logs `preparePinline  ✓ <color>.png` and `prepareRulesRight  ✓ <color>.png` for 6 singles + 10 combos each; no `Skipped` lines; exit 0.

- [ ] **Step 4: Verify the outputs and that nothing else changed**

Run: `git status --porcelain`
Expected: new untracked `parts/preparePinline/` + `parts/prepareRulesRight/` directories only; **no modifications** to any existing part/mainframe PNG (proves the subset filter worked).

Spot-check (2 files): `Get-ChildItem` the two new parts dirs — 16 PNGs each; confirm `prepareRulesRight/w.png` is 2010×2814 with non-transparent pixels only in the right-half box region (jimp one-liner in the repo's node_modules, as used during planning).

- [ ] **Step 5: Commit (pathspec-scoped, includes the superseded-file deletions)**

```bash
git add scripts/generate-parts.cjs "src/components/TemplatingCardRender/images/parts/preparePinline" "src/components/TemplatingCardRender/images/parts/prepareRulesRight"
git rm "src/components/TemplatingCardRender/images/mainframes/prepare/regular/rules.png" "src/components/TemplatingCardRender/images/mainframes/prepare/regular/rulesRight.png"
git commit -m "feat: generate per-color prepare pinline and rules-right parts" -- scripts/generate-parts.cjs "src/components/TemplatingCardRender/images/parts/preparePinline" "src/components/TemplatingCardRender/images/parts/prepareRulesRight" "src/components/TemplatingCardRender/images/mainframes/prepare/regular/rules.png" "src/components/TemplatingCardRender/images/mainframes/prepare/regular/rulesRight.png"
```

---

### Task 3: assetLoader — prepare imports and getters

**Files:**
- Modify: `src/components/TemplatingCardRender/assetLoader.tsx`
- Test: `src/components/TemplatingCardRender/assetLoader.test.ts`

**Interfaces:**
- Consumes: the PNGs from Task 2 and `mainframes/prepare/{regular,nyx}/<color>.png` (+ `<color>Thumb.png`).
- Produces (used by Task 4):
  - `getPrepareMainframe(color: ColorType, isEnchantment = false): ImageResData`
  - `getPreparePinline(colors: ColorType[]): string`
  - `getPrepareRulesRight(colors: ColorType[]): string`

- [ ] **Step 1: Write the failing tests** in `assetLoader.test.ts` — new `describe('prepare frames')` mirroring the omen one:

```ts
it('returns a color-specific prepare mainframe');            // w vs u highRes differ, both truthy
it('returns the nyx prepare mainframe for an enchantment prepared');  // highRes contains 'prepare/nyx/w', differs from regular
it('folds a colorless enchantment prepared to the nyx frame');       // contains 'prepare/nyx/a', differs from Gold nyx
it('folds a colorless prepared to the regular a frame');             // truthy, differs from White
it('returns combo-order-independent pinline and rules-right');      // [W,U] === [U,W], truthy, both getters
it('folds 3+ colors to the gold part and the empty set to no asset'); // === [Gold] variant for both getters; ([]) === ''
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test assetLoader.test`
Expected: FAIL — imports `getPrepareMainframe` etc. do not exist.

- [ ] **Step 3: Implement in `assetLoader.tsx`** (mirroring the omen blocks at lines ~782-850 and ~1349-1430)

- Imports after the omen blocks: prepare mainframes regular w/u/b/r/g/m/a + Thumbs (from `./images/mainframes/prepare/regular/`), prepare mainframes nyx w/u/b/r/g/m/a + Thumbs (from `./images/mainframes/prepare/nyx/`), and 16 `PreparePinline<Variant>` + 16 `PrepareRulesRight<Variant>` imports (keys `W,U,B,R,G,M,Wu,Ub,Br,Rg,Gw,Wb,Ur,Bg,Rw,Gu`), with a comment noting the regular l/v frames stay unused like the omen ones.
- `PREPARE_PINLINE_BY_KEY` / `PREPARE_RULES_RIGHT_BY_KEY` records (`Partial<Record<PartVariant, string>>`, same 16 keys as the omen maps) + the two getters using the shared `getSpellBoxVariant`.
- `getPrepareMainframe(color, isEnchantment)` — mirror `getOmenMainframe` (line 1400) exactly: same switch, nyx for enchantment, default → the `a` frame.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test assetLoader.test`
Expected: PASS (all existing assetLoader tests unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/components/TemplatingCardRender/assetLoader.tsx src/components/TemplatingCardRender/assetLoader.test.ts
git commit -m "feat: add prepare mainframe and part getters to assetLoader" -- src/components/TemplatingCardRender/assetLoader.tsx src/components/TemplatingCardRender/assetLoader.test.ts
```

---

### Task 4: TemplatingCardRender — prepared frame rendering + mirrored SCSS

**Files:**
- Modify: `src/components/TemplatingCardRender/TemplatingCardRender.tsx`
- Modify: `src/components/TemplatingCardRender/TemplatingCardRender.module.scss`
- Test (create): `src/components/TemplatingCardRender/TemplatingCardRender.prepared.test.tsx`

**Interfaces:**
- Consumes: `getPrepareMainframe/getPreparePinline/getPrepareRulesRight` (Task 3), `PreparedType` (Task 1).
- Produces: new optional props on `TemplatingCardRenderProps`: `prepareName?: string; prepareCost?: string; prepareText?: string[]; prepareType?: PreparedType;` (they flow automatically from card faces — `Cell.tsx` / `BigCardRenderModal.tsx` spread the whole face).
- Produces (SCSS): `.prepareRulesRight` overlay class (same full-frame absolute geometry as `.adventureRulesRight`) and the mirrored spell-box classes `.prepareName`, `.prepareCost`, `.prepareTypeLine`, `.prepareText`, plus `.prepareLeftText` for the main text.

- [ ] **Step 1: Write the failing tests** — new file mirroring `TemplatingCardRender.omen.test.tsx` (same mock store, jsdom polyfills, `renderPrepared` helper with `cardTypes: [Creature, ...(noPrepared ? [] : [CardType.Prepared]), ...(enchantment ? [Enchantment] : [])]`, default `manaCost '{1}{G}'`):

```ts
describe('TemplatingCardRender - prepared frame') {
  it('renders the prepared right-box overlay');          // img class includes 'prepareRulesRight', src contains 'prepareRulesRight'
  it('renders the prepare mainframe and pinline assets'); // mainframe src contains 'mainframes/prepare', pinline src contains 'preparePinline'
}
describe('TemplatingCardRender - prepared right-box color derivation') {
  it('derives the right box color from the prepareCost, not the manaCost'); // prepareCost '{2}{U}': src 'prepareRulesRight/u', not 'prepareRulesRight/g'
  it('a two-color prepareCost resolves the two-color combo right part');    // '{W}{U}' → 'prepareRulesRight/wu'
  it('the pinline still derives from the card manaCost');                  // prepareCost '{2}{U}' → 'preparePinline/g'
  it('falls back to the manaCost colors when no prepareCost is set');      // → 'prepareRulesRight/g'
}
describe('TemplatingCardRender - enchantment prepared (nyx mainframe)') {
  it('renders the nyx prepare mainframe but keeps regular-carved parts');   // mainframe 'mainframes/prepare/nyx'; pinline src not containing 'nyx'
  it('CONTROL: a non-enchantment prepared renders no nyx prepare mainframe');
}
describe('TemplatingCardRender - prepared spell box') {
  it('renders the prepare name, cost, type line, and text into the right box'); // getByText name; cost box has .ms icons; getByText exactly 'Instant' (NOT 'Instant – Prepared'); prepare text visible
  it('a Sorcery prepared renders a Sorcery type line');                         // getByText exactly 'Sorcery'
  it('renders no prepare spell elements for a card without the Prepared type'); // noPrepared + prepare fields still passed: no prepareName/prepareCost/prepareTypeLine/prepareText divs, no rulesRight overlay
  it('constrains the main text box to the left half of the frame');             // div with class 'prepareLeftText', cardText visible
  it('CONTROL: a non-prepared keeps the full-width text box');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test TemplatingCardRender.prepared.test`
Expected: FAIL — prepare assets/branches don't exist; overlay undefined.

- [ ] **Step 3: Implement in `TemplatingCardRender.tsx`** (mirroring the omen code at the cited lines)

- Import `PreparedType` (enums) and the three prepare getters (assetLoader).
- Props (after the omen block, ~line 104) + destructure (~line 119).
- `const isPrepared = cardTypes.includes(CardType.Prepared);` next to `isOmen` (~line 179).
- After `omenColors` (~line 249): `const prepareColors = isPrepared && prepareCost ? getColor(prepareCost).allColors : undefined;`
- Pinline chain (~line 271): insert an `isPrepared ? getPreparePinline(isLand ? landColors : allColors)` branch next to the omen one.
- After `omenRulesLeft` (~line 282): `const prepareRulesRight = isPrepared ? getPrepareRulesRight(isLand ? landColors : (prepareColors ?? allColors)) : '';`
- `if (isAdventure || isOmen) rulesPart = '';` (~line 302) → also clear for `isPrepared` (the box is baked into the prepare mainframes).
- Mainframe chain (~line 325-331): add `else if (isPrepared) { mainframe = getPrepareMainframe(color, isEnchantment); }` after the omen branch (a Land+Prepared face already takes the land chain first — same as omens).
- Overlay after the `omenRulesLeft` img (~line 451): `{prepareRulesRight ? <img className={styles.prepareRulesRight} src={prepareRulesRight} alt="" /> : null}`.
- Spell-box JSX after the omen block (~line 513), with a comment noting the geometry is mirrored to the right half (so it needs its own SCSS classes): `prepareName` (`styles.prepareName`), `prepareCost` (`styles.prepareCost`, `injectManaIcons(getColor(prepareCost).orderedCost, true)`), type line (`styles.prepareTypeLine`, `${prepareType}` — **no suffix**), `prepareText` (`styles.prepareText` + the TextResize block with keys `prepare-text-...`, mirroring the omenText block).
- Main text (~line 571-576): add `isPrepared ? styles.prepareLeftText : ''` to the className chain, and include `isPrepared` in the `maxFontSize={... ? 50 : 56}` condition.

- [ ] **Step 4: Implement the SCSS** in `TemplatingCardRender.module.scss` (after the omen rules-left class ~line 134 and the omen spell-box classes ~line 368):

- `.prepareRulesRight`: copy of `.adventureRulesRight` (full-frame absolute, 1500×2100, pointer-events none).
- Spell-box classes mirroring the adventure/omen ones across the frame, with values derived from the measured box (x 745.5–1419.4, y 1313.4–1878.4) — inset 35 from the box's left edge, 15 from its right edge, text clipped to the y 1878 bottom:

```scss
.prepareName    { top: 1326px; left: 780px;  width: 470px; height: 75px; }  // like .adventureName, mirrored
.prepareCost    { top: 1321px; right: 96px; }                               // like .adventureCost (right edge 15 inside the box)
.prepareTypeLine{ top: 1420px; left: 780px; }                              // like .adventureTypeLine, mirrored
.prepareText    { top: 1510px; left: 780px; width: 604px; height: 360px; }  // adventureText mirrored, height clipped to the shorter box
.prepareLeftText{ left: 110px; width: 620px; top: 1320px; height: 590px; } // mirror of .omenRightText across the centerline (left box x 110–745, y 1313–1937)
```

with the same font/`white-space`/`overflow`/`color`/`& > *` margin rules as their adventure/omen counterparts, and `& > *` margins on `.prepareCost > *`. These pixel values are the plan's best derivation from the measured masks; **Task 6's visual smoke check with the user confirms and tunes them.**

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test TemplatingCardRender.prepared.test` then `npm test TemplatingCardRender`
Expected: PASS, all existing render tests unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/components/TemplatingCardRender/TemplatingCardRender.tsx src/components/TemplatingCardRender/TemplatingCardRender.module.scss src/components/TemplatingCardRender/TemplatingCardRender.prepared.test.tsx
git commit -m "feat: render the Prepared card type with a right-side spell box" -- src/components/TemplatingCardRender/TemplatingCardRender.tsx src/components/TemplatingCardRender/TemplatingCardRender.module.scss src/components/TemplatingCardRender/TemplatingCardRender.prepared.test.tsx
```

---

### Task 5: CardEditor — Prepared type option, Prepared section, art-style rules

**Files:**
- Modify: `src/components/CardEditor/CardEditor.tsx`
- Test (create): `src/components/CardEditor/CardEditor.prepared.test.tsx`
- Test (update 1 line): `src/components/CardEditor/CardEditor.omen.test.tsx` (hidden-types test, line 117)

**Interfaces:**
- Consumes: `PreparedType` (Task 1), `MUTUALLY_EXCLUSIVE_CARD_TYPES` / `resolveExclusiveCardTypes` (existing), prepare face fields (Task 1).
- Produces: editor edits `prepareName/prepareCost/prepareType/prepareText` on the current face; `CardType.Prepared` selectable in the Card Types multi-select; art-style availability excludes every non-Regular style for Prepared.

- [ ] **Step 1: Write the failing tests** — new `CardEditor.prepared.test.tsx` reusing the helper patterns from `CardEditor.omen.test.tsx` (`makeCard`, `renderEditor`, `openTypeSelect`, `typeOption`, `selectCardType`, `deselectCardType`, and adventure-test-style `preparedDivider()` / `selectPreparedType(label)` helpers):

```ts
describe('CardEditor - Prepared section') {
  it('shows the Prepared section with its four fields for a Prepared card');  // divider text 'Prepared'; Name/Cost/Type/Text fields for prepareName/prepareCost/prepareType/prepareText
  it('CONTROL: renders no Prepared section for a non-prepared card');
  it('offers no Add Mechanic select on the Prepared Text field');
  it('offers exactly Instant and Sorcery as prepare types');
  it('persists edits to the prepare fields on the face');                     // type values, select Sorcery, assert updateCard mock call face: prepareName/prepareCost/prepareText/prepareType
  it('adding the Prepared card type defaults the prepare type to Instant');
  it('disables group alternatives while Prepared is selected');               // Adventure/Omen/Planeswalker options disabled, Prepared not
}
describe('CardEditor - Prepared art styles') {
  it('offers only the Regular art style for a Prepared card');                // Art Style radios: Regular present; Extended/Borderless/ELD Alternate Art absent
  it('adding the Prepared type switches a chosen Extended style to Regular');
}
```

Also update `CardEditor.omen.test.tsx` line 117's hidden-types test: rename to "lists Omen and Prepared among the card type options..." and add `expect(titles).toContain(CardType.Prepared);`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test CardEditor.prepared.test`
Expected: FAIL — no Prepared section, Prepared not selectable.

- [ ] **Step 3: Implement in `CardEditor.tsx`**

- Import `PreparedType` (enums import block, line ~18).
- `prepareSectionConfig: InputConfigInterface[]` after `omenSectionConfig` (~line 120): divider `'Prepared'`; `prepareName` input (width 50); `prepareCost` input (width 50); `prepareType` select with `PreparedType` data (width 100, mirroring the omenType select's data mapping); `prepareText` text-list (width 100, `allowMechanics: false`).
- Helper `const isPrepared = () => types().includes(CardType.Prepared);` next to `isOmen` (~line 375); splice `...(isPrepared() ? prepareSectionConfig : [])` after the omen splice (~line 505).
- In `saveValue`'s `cardTypes` branch, after the omenType defaulting (~line 253): mirror it — when `nextTypes.includes(CardType.Prepared)` and `getValue('prepareType')` is neither `PreparedType.Instant` nor `PreparedType.Sorcery`, `saveValue('prepareType', PreparedType.Instant)`.
- `isArtStyleAvailableForType` (~line 75): `return !cardTypes.includes(CardType.Adventure) && !cardTypes.includes(CardType.Omen);` → append `&& !cardTypes.includes(CardType.Prepared)` with a comment ("for now, prepared cards support no non-regular art styles"). The existing generic art-style fallback in `saveValue` then switches a Prepared card to Regular automatically.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test CardEditor.prepared.test` then `npm test CardEditor`
Expected: PASS; omen/adventure/alternate-art editor tests unaffected (only the one-line hidden-types expectation changed).

- [ ] **Step 5: Commit**

```bash
git add src/components/CardEditor/CardEditor.tsx src/components/CardEditor/CardEditor.prepared.test.tsx src/components/CardEditor/CardEditor.omen.test.tsx
git commit -m "feat: edit Prepared cards in the CardEditor" -- src/components/CardEditor/CardEditor.tsx src/components/CardEditor/CardEditor.prepared.test.tsx src/components/CardEditor/CardEditor.omen.test.tsx
```

---

### Task 6: Whole-branch verification

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all pass (no regression in adventure/omen/editor/type tests).

- [ ] **Step 2: Lint + type-check**

Run: `npm run lint` then `npm run build`
Expected: no eslint errors; `tsc` clean; vite build succeeds.

- [ ] **Step 3: Visual smoke check with the user**

The user opens the app (`npm run dev`, backend middleware on `:8080`) and creates a Prepared card in the editor to confirm the frame looks right — the mirrored SCSS pixel values in Task 4 Step 4 are derived from measured geometry; a visual check is the only way to confirm the spell box text (name/cost/type/text) sits right on the right-side art and the main text sits right in the left box. Tune the Task 4 SCSS values if anything is off, and commit any tuning as a follow-up `fix:` commit (pathspec-scoped to the SCSS file).

- [ ] **Step 4: Update the change log**

Add a `2026-10-13` entry to `src/components/ChangeLogModal/updateLog.tsx` (feature: 'Prepared Cards') mirroring the 'Omen Cards' entry at line ~449, then commit pathspec-scoped to that file. (Note: the file already has unrelated in-progress user changes — commit only the entry's lines via `git add -p` if needed, or coordinate with the user.)
