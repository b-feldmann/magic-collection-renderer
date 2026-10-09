import { describe, it, expect } from 'vitest';

import {
  getColorMainframe,
  getTokenMainframe,
  getInventionMainframe,
  getPinline,
  getCrown,
  getTitlePart,
  getTypePart,
  getRulesPart,
  getLandTitlePart,
  getLandTypePart,
  getLandRulesPart,
  getNicknameTitle,
  getAdventureMainframe,
  getAdventurePinline,
  getAdventureRulesLeft,
} from './assetLoader';
import { ColorType, CardArtStyles } from '../../interfaces/enums';

describe('getPinline', () => {
  it('renders no pinline on a colorless artifact', () => {
    expect(getPinline([], true)).toBe('');
  });

  it('renders a single-color pinline on a mono-colored artifact', () => {
    const white = getPinline([ColorType.White], true);
    const blue = getPinline([ColorType.Blue], true);
    expect(white).not.toBe('');
    expect(blue).not.toBe('');
    expect(white).not.toBe(blue);
  });

  it('renders a two-color pinline on a two-colored artifact', () => {
    const wu = getPinline([ColorType.White, ColorType.Blue], true);
    const mono = getPinline([ColorType.White], true);
    expect(wu).not.toBe('');
    expect(wu).not.toBe(mono);
  });

  it('normalizes color-pair order to the same combo asset', () => {
    expect(getPinline([ColorType.Blue, ColorType.White], true)).toBe(
      getPinline([ColorType.White, ColorType.Blue], true),
    );
  });

  it('falls back to the gold pinline on a 3+ color artifact', () => {
    const gold = getPinline([ColorType.White, ColorType.Blue, ColorType.Black], true);
    expect(gold).not.toBe('');
    expect(getPinline([ColorType.Red, ColorType.Green, ColorType.White], true)).toBe(gold);
  });

  it('renders a two-color pinline on a non-artifact gold card with exactly two colors', () => {
    const wu = getPinline([ColorType.White, ColorType.Blue], false);
    expect(wu).not.toBe('');
    // Matches the artifact two-color pinline for the same pair.
    expect(wu).toBe(getPinline([ColorType.White, ColorType.Blue], true));
  });

  it('renders no pinline on a mono-colored non-artifact card', () => {
    expect(getPinline([ColorType.White], false)).toBe('');
  });

  it('renders no pinline on a colorless non-artifact card', () => {
    expect(getPinline([], false)).toBe('');
  });

  it('renders no pinline on a 3+ color non-artifact card', () => {
    expect(getPinline([ColorType.White, ColorType.Blue, ColorType.Black], false)).toBe('');
  });

  it('renders no pinline in the Invention art style', () => {
    expect(getPinline([ColorType.White], true, CardArtStyles.Invention)).toBe('');
    expect(getPinline([ColorType.White, ColorType.Blue], true, CardArtStyles.Invention)).toBe('');
    expect(
      getPinline([ColorType.White, ColorType.Blue, ColorType.Black], true, CardArtStyles.Invention),
    ).toBe('');
  });
});

describe('getCrown', () => {
  // getCrown returns either an ImageResData ({ highRes, lowRes }) or a string;
  // normalize to the high-res asset for comparison.
  const highResOf = (crown: ReturnType<typeof getCrown>) =>
    typeof crown === 'string' ? crown : crown.highRes;

  it('renders a two-color combo crown for a card with exactly two colors', () => {
    const wu = getCrown(ColorType.Gold, false, false, false, false, [
      ColorType.White,
      ColorType.Blue,
    ]);
    const gold = getCrown(ColorType.Gold, false, false, false, false, [
      ColorType.White,
      ColorType.Blue,
      ColorType.Black,
    ]);
    expect(highResOf(wu)).not.toBe('');
    // The two-color crown must differ from the gold fallback crown.
    expect(highResOf(wu)).not.toBe(highResOf(gold));
  });

  it('normalizes color-pair order to the same combo crown', () => {
    const wu = getCrown(ColorType.Gold, false, false, false, false, [
      ColorType.White,
      ColorType.Blue,
    ]);
    const uw = getCrown(ColorType.Gold, false, false, false, false, [
      ColorType.Blue,
      ColorType.White,
    ]);
    expect(highResOf(wu)).toBe(highResOf(uw));
  });

  it('distinguishes the base, floating and nickname crown styles for the same pair', () => {
    const pair = [ColorType.White, ColorType.Blue];
    const base = getCrown(ColorType.Gold, false, false, false, false, pair);
    const floating = getCrown(ColorType.Gold, true, false, false, false, pair);
    const nickname = getCrown(ColorType.Gold, false, false, false, true, pair);
    expect(highResOf(base)).not.toBe(highResOf(floating));
    expect(highResOf(base)).not.toBe(highResOf(nickname));
    expect(highResOf(floating)).not.toBe(highResOf(nickname));
  });

  it('falls back to the gold crown for 3+ colors', () => {
    const gold = getCrown(ColorType.Gold, false, false, false, false, [
      ColorType.White,
      ColorType.Blue,
      ColorType.Black,
    ]);
    const goldNoColors = getCrown(ColorType.Gold);
    expect(highResOf(gold)).toBe(highResOf(goldNoColors));
  });

  it('uses the two-color combo crown for a two-color artifact', () => {
    const artefactCombo = getCrown(ColorType.Gold, false, false, true, false, [
      ColorType.White,
      ColorType.Blue,
    ]);
    const combo = getCrown(ColorType.Gold, false, false, false, false, [
      ColorType.White,
      ColorType.Blue,
    ]);
    // A two-color artifact gets the same combo crown as a non-artifact pair.
    expect(highResOf(artefactCombo)).toBe(highResOf(combo));
  });

  it('still uses the artefact crown for a mono-color or 3+ color artifact', () => {
    const mono = getCrown(ColorType.Colorless, false, false, true, false, [ColorType.White]);
    const many = getCrown(ColorType.Colorless, false, false, true, false, [
      ColorType.White,
      ColorType.Blue,
      ColorType.Black,
    ]);
    const artefact = getCrown(ColorType.Colorless, false, false, true, false, []);
    expect(highResOf(mono)).toBe(highResOf(artefact));
    expect(highResOf(many)).toBe(highResOf(artefact));
  });
});

// On two-color cards the blended combo nickname plate replaces the gold plate.
describe('getNicknameTitle', () => {
  it('renders the combo plate on a two-color card instead of the gold plate', () => {
    const wu = getNicknameTitle(ColorType.Gold, false, false, [ColorType.White, ColorType.Blue]);
    const gold = getNicknameTitle(ColorType.Gold, false, false, [
      ColorType.White,
      ColorType.Blue,
      ColorType.Black,
    ]);
    expect(wu).not.toBe('');
    expect(wu).not.toBe(gold);
  });

  it('normalizes color-pair order to the same combo plate', () => {
    expect(getNicknameTitle(ColorType.Gold, false, false, [ColorType.Blue, ColorType.White])).toBe(
      getNicknameTitle(ColorType.Gold, false, false, [ColorType.White, ColorType.Blue]),
    );
  });

  it('uses the combo plate for two-color artifacts', () => {
    const combo = getNicknameTitle(ColorType.Gold, false, false, [ColorType.White, ColorType.Blue]);
    // A two-color artifact gets the same combo plate as a non-artifact pair.
    expect(getNicknameTitle(ColorType.Gold, true, false, [ColorType.White, ColorType.Blue])).toBe(
      combo,
    );
  });

  it('keeps the artifact plate for mono-color or 3+ color artifacts', () => {
    const artifact = getNicknameTitle(ColorType.Gold, true);
    expect(getNicknameTitle(ColorType.Gold, true, false, [ColorType.White])).toBe(artifact);
    expect(
      getNicknameTitle(ColorType.Gold, true, false, [
        ColorType.White,
        ColorType.Blue,
        ColorType.Black,
      ]),
    ).toBe(artifact);
  });

  it('renders the combo plate on a two-color land (card-text colors)', () => {
    expect(
      getNicknameTitle(ColorType.Gold, false, true, [ColorType.White, ColorType.Blue]),
    ).not.toBe('');
  });

  it('keeps the regular plates for mono-color cards', () => {
    const withoutColors = getNicknameTitle(ColorType.White);
    expect(getNicknameTitle(ColorType.White, false, false, [ColorType.White])).toBe(withoutColors);
  });
});

// The extended / borderless art styles use their own combo-only pinlines.
describe.each([
  ['extended', CardArtStyles.Extended],
  ['borderless', CardArtStyles.Borderless],
])('getPinline (%s art style)', (_name, artStyle) => {
  const WU = [ColorType.White, ColorType.Blue];

  it('renders the variant two-color pinline, different from the regular one', () => {
    const variant = getPinline(WU, false, artStyle);
    const regular = getPinline(WU, false);
    expect(variant).not.toBe('');
    expect(variant).not.toBe(regular);

    const extended = getPinline(WU, false, CardArtStyles.Extended);
    const borderless = getPinline(WU, false, CardArtStyles.Borderless);
    if (artStyle === CardArtStyles.Extended) {
      expect(variant).not.toBe(borderless);
    } else {
      expect(variant).not.toBe(extended);
    }
  });

  it('uses the same variant asset for artifacts and non-artifacts with two colors', () => {
    expect(getPinline(WU, true, artStyle)).toBe(getPinline(WU, false, artStyle));
  });

  it('renders a single-color pinline on a mono-colored artifact', () => {
    const white = getPinline([ColorType.White], true, artStyle);
    const blue = getPinline([ColorType.Blue], true, artStyle);
    expect(white).not.toBe('');
    expect(blue).not.toBe('');
    expect(white).not.toBe(blue);
  });

  it('uses a variant-specific single-color pinline (differs from regular and the other variant)', () => {
    const variant = getPinline([ColorType.White], true, artStyle);
    const regular = getPinline([ColorType.White], true);
    expect(variant).not.toBe(regular);

    const extended = getPinline([ColorType.White], true, CardArtStyles.Extended);
    const borderless = getPinline([ColorType.White], true, CardArtStyles.Borderless);
    expect(extended).not.toBe(borderless);
  });

  it('renders no pinline on a 3+ color artifact', () => {
    expect(getPinline([ColorType.White, ColorType.Blue, ColorType.Black], true, artStyle)).toBe('');
  });

  it('renders no pinline on a colorless artifact', () => {
    expect(getPinline([], true, artStyle)).toBe('');
  });

  it('renders no pinline on a land with anything but exactly two colors', () => {
    expect(getPinline([ColorType.White], false, artStyle)).toBe('');
    expect(getPinline([ColorType.White, ColorType.Blue, ColorType.Black], false, artStyle)).toBe(
      '',
    );
    expect(getPinline([], false, artStyle)).toBe('');
  });
});

// Behaviors common to all three parts (title / type / rules).
describe.each([
  ['getTitlePart', getTitlePart],
  ['getTypePart', getTypePart],
  ['getRulesPart', getRulesPart],
])('%s (common behavior)', (_name, getPart) => {
  it('renders no part on a colorless artifact', () => {
    expect(getPart([], true)).toBe('');
  });

  it('renders a single-color part on a mono-colored artifact', () => {
    const white = getPart([ColorType.White], true);
    const blue = getPart([ColorType.Blue], true);
    expect(white).not.toBe('');
    expect(blue).not.toBe('');
    expect(white).not.toBe(blue);
  });

  it('falls back to the gold part on a 3+ color artifact', () => {
    const gold = getPart([ColorType.White, ColorType.Blue, ColorType.Black], true);
    expect(gold).not.toBe('');
    expect(getPart([ColorType.Red, ColorType.Green, ColorType.White], true)).toBe(gold);
  });

  it('renders the gold part on a two-color non-artifact card', () => {
    const twoColor = getPart([ColorType.White, ColorType.Blue], false);
    const gold = getPart([ColorType.White, ColorType.Blue, ColorType.Black], true);
    expect(twoColor).not.toBe('');
    expect(twoColor).toBe(gold);
  });

  it('renders no part on a mono-colored non-artifact card', () => {
    expect(getPart([ColorType.White], false)).toBe('');
  });

  it('renders no part on a colorless non-artifact card', () => {
    expect(getPart([], false)).toBe('');
  });

  it('renders no part on a 3+ color non-artifact card', () => {
    expect(getPart([ColorType.White, ColorType.Blue, ColorType.Black], false)).toBe('');
  });
});

// Title and type parts use the GOLD part for two-color artifacts (no combo).
describe.each([
  ['getTitlePart', getTitlePart],
  ['getTypePart', getTypePart],
])('%s (two-color artifact uses gold)', (_name, getPart) => {
  it('renders the gold part (not a combo) on a two-color artifact', () => {
    const wu = getPart([ColorType.White, ColorType.Blue], true);
    const mono = getPart([ColorType.White], true);
    const gold = getPart([ColorType.White, ColorType.Blue, ColorType.Black], true);
    expect(wu).not.toBe('');
    expect(wu).not.toBe(mono);
    expect(wu).toBe(gold);
  });
});

// The rules part keeps the two-color combo for two-color artifacts.
describe('getRulesPart (two-color artifact uses combo)', () => {
  it('renders the two-color combo part on a two-colored artifact', () => {
    const wu = getRulesPart([ColorType.White, ColorType.Blue], true);
    const mono = getRulesPart([ColorType.White], true);
    const gold = getRulesPart([ColorType.White, ColorType.Blue, ColorType.Black], true);
    expect(wu).not.toBe('');
    expect(wu).not.toBe(mono);
    // A two-color artifact uses the combo, NOT the gold part.
    expect(wu).not.toBe(gold);
  });

  it('normalizes color-pair order to the same combo asset (artifact)', () => {
    expect(getRulesPart([ColorType.Blue, ColorType.White], true)).toBe(
      getRulesPart([ColorType.White, ColorType.Blue], true),
    );
  });
});

// Lands get parts only when their card-text identity has exactly two colors:
// the land ('l') title/type parts plus the two-color text part.
describe.each([
  ['getLandTitlePart', getLandTitlePart],
  ['getLandTypePart', getLandTypePart],
])('%s (land)', (_name, getLandPart) => {
  it('renders the land part on a two-color land', () => {
    expect(getLandPart([ColorType.White, ColorType.Blue])).not.toBe('');
    // Color-pair order does not matter.
    expect(getLandPart([ColorType.Blue, ColorType.White])).toBe(
      getLandPart([ColorType.White, ColorType.Blue]),
    );
  });

  it('renders no part on a single-color land', () => {
    expect(getLandPart([ColorType.White])).toBe('');
  });

  it('renders no part on a 3+ color land', () => {
    expect(getLandPart([ColorType.White, ColorType.Blue, ColorType.Black])).toBe('');
    expect(
      getLandPart([
        ColorType.White,
        ColorType.Blue,
        ColorType.Black,
        ColorType.Red,
        ColorType.Green,
      ]),
    ).toBe('');
  });

  it('renders no part on a colorless land', () => {
    expect(getLandPart([])).toBe('');
  });
});

describe('getLandRulesPart (land)', () => {
  it('renders the two-color text part on a two-color land', () => {
    const wu = getLandRulesPart([ColorType.White, ColorType.Blue]);
    expect(wu).not.toBe('');
    expect(getLandRulesPart([ColorType.Blue, ColorType.White])).toBe(wu);
  });

  it('renders no text part on a single-color land', () => {
    expect(getLandRulesPart([ColorType.White])).toBe('');
  });

  it('renders no text part on a 3+ color land', () => {
    expect(getLandRulesPart([ColorType.White, ColorType.Blue, ColorType.Black])).toBe('');
  });

  it('renders no text part on a colorless land', () => {
    expect(getLandRulesPart([])).toBe('');
  });
});

// Tokens have their own pinline / type / rules frame parts. Like the extended
// and borderless pinlines, only the two-color combinations exist; everything
// else gets no part. The isToken flag selects them over the regular assets.
describe('token parts', () => {
  const WU = [ColorType.White, ColorType.Blue];
  const THREE = [ColorType.White, ColorType.Blue, ColorType.Black];

  it('getPinline renders the token two-color pinline, different from the regular one', () => {
    const token = getPinline(WU, false, undefined, true);
    const regular = getPinline(WU, false);
    expect(token).not.toBe('');
    expect(token).not.toBe(regular);
  });

  it('getRulesPart renders the token two-color part, different from the regular part', () => {
    const token = getRulesPart(WU, false, true);
    const regular = getRulesPart(WU, false);
    expect(token).not.toBe('');
    expect(token).not.toBe(regular);
  });

  it('normalizes color-pair order to the same token asset', () => {
    const UW = [ColorType.Blue, ColorType.White];
    expect(getPinline(UW, false, undefined, true)).toBe(getPinline(WU, false, undefined, true));
    expect(getTypePart(UW, false, true)).toBe(getTypePart(WU, false, true));
    expect(getRulesPart(UW, false, true)).toBe(getRulesPart(WU, false, true));
  });

  it('renders no token part for a mono-color token', () => {
    expect(getPinline([ColorType.White], false, undefined, true)).toBe('');
    expect(getTypePart([ColorType.White], false, true)).toBe('');
    expect(getRulesPart([ColorType.White], false, true)).toBe('');
  });

  it('renders no token part for a 3+ color token', () => {
    expect(getPinline(THREE, false, undefined, true)).toBe('');
    expect(getTypePart(THREE, false, true)).toBe('');
    expect(getRulesPart(THREE, false, true)).toBe('');
  });

  it('renders no token part for a colorless token', () => {
    expect(getPinline([], false, undefined, true)).toBe('');
    expect(getTypePart([], false, true)).toBe('');
    expect(getRulesPart([], false, true)).toBe('');
  });

  it('uses the same token asset for two-color artifact and non-artifact tokens', () => {
    expect(getPinline(WU, true, undefined, true)).toBe(getPinline(WU, false, undefined, true));
    expect(getTypePart(WU, true, true)).toBe(getTypePart(WU, false, true));
    expect(getRulesPart(WU, true, true)).toBe(getRulesPart(WU, false, true));
  });

  it('token pinline differs from the extended and borderless variant pinlines', () => {
    const token = getPinline(WU, false, undefined, true);
    expect(token).not.toBe(getPinline(WU, false, CardArtStyles.Extended));
    expect(token).not.toBe(getPinline(WU, false, CardArtStyles.Borderless));
  });
});

describe('mainframe getters: colorless artifact uses the artefact frame', () => {
  it('token: a colorless artifact gets a different frame than a colorless non-artifact', () => {
    const colorlessArtifact = getTokenMainframe(ColorType.Colorless, true);
    const colorlessNonArtifact = getTokenMainframe(ColorType.Colorless, false);
    expect(colorlessArtifact).not.toBe(colorlessNonArtifact);
  });

  it('invention: a colorless artifact gets a different frame than a colorless non-artifact', () => {
    const colorlessArtifact = getInventionMainframe(ColorType.Colorless, true);
    const colorlessNonArtifact = getInventionMainframe(ColorType.Colorless, false);
    expect(colorlessArtifact).not.toBe(colorlessNonArtifact);
  });

  it('colored artifacts keep their color frame (token)', () => {
    expect(getTokenMainframe(ColorType.White, true)).toBe(
      getTokenMainframe(ColorType.White, false),
    );
  });

  it('colored artifacts keep their color frame (invention)', () => {
    expect(getInventionMainframe(ColorType.White, true)).toBe(
      getInventionMainframe(ColorType.White, false),
    );
  });

  it('regular: a colored artifact uses the artefact frame, not its color frame', () => {
    // Unlike the token/invention getters (which only switch frames for
    // colorless), getColorMainframe routes EVERY artifact to the generic
    // artefact frame regardless of color. Note the isArtifact flag is the
    // third positional argument: (color, isEnchantment, isArtifact, isVehicle).
    const coloredArtifact = getColorMainframe(ColorType.White, false, true);
    const coloredNonArtifact = getColorMainframe(ColorType.White, false, false);
    expect(coloredArtifact).not.toEqual(coloredNonArtifact);
  });

  it('regular: colorless artifact resolves to the artefact mainframe', () => {
    // The artefact frame must be returned for a colorless artifact.
    expect(getColorMainframe(ColorType.Colorless, false, true)).toBeTruthy();
  });
});

describe('adventure frames', () => {
  it('returns a color-specific adventure mainframe', () => {
    const w = getAdventureMainframe(ColorType.White);
    const u = getAdventureMainframe(ColorType.Blue);
    expect(w.highRes).toBeTruthy();
    expect(w.highRes).not.toBe(u.highRes);
  });

  it('returns combo-order-independent pinline and rules-left', () => {
    expect(getAdventurePinline([ColorType.White, ColorType.Blue])).toBe(
      getAdventurePinline([ColorType.Blue, ColorType.White]),
    );
    expect(getAdventurePinline([ColorType.White, ColorType.Blue])).toBeTruthy();
    expect(getAdventureRulesLeft([ColorType.White, ColorType.Blue])).toBe(
      getAdventureRulesLeft([ColorType.Blue, ColorType.White]),
    );
    expect(getAdventureRulesLeft([ColorType.White, ColorType.Blue])).toBeTruthy();
  });

  it('selects a distinct adventure crown style', () => {
    const highResOf = (c: ReturnType<typeof getCrown>) => (typeof c === 'string' ? c : c.highRes);
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
