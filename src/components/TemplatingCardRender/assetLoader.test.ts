import { describe, it, expect } from 'vitest';

import {
  getInnerBorderFrame,
  getColorMainframe,
  getTokenMainframe,
  getInventionMainframe,
  getPinline,
  getTitlePart,
  getTypePart,
  getRulesPart,
  getLandTitlePart,
  getLandTypePart,
  getLandRulesPart,
} from './assetLoader';
import { ColorType } from '../../interfaces/enums';

describe('getInnerBorderFrame', () => {
  it('returns no border (empty string) for colorless cards with no colors', () => {
    // A colorless card produces an empty color array. It must NOT fall back to
    // the gold multicolor border.
    expect(getInnerBorderFrame([])).toBe('');
  });

  it('returns the gold border for 3+ colors', () => {
    const gold = getInnerBorderFrame([ColorType.White, ColorType.Blue, ColorType.Black]);
    expect(gold).not.toBe('');
    // All three-color results share the same gold asset.
    expect(getInnerBorderFrame([ColorType.Red, ColorType.Green, ColorType.White])).toBe(gold);
  });

  it('returns a mono-color border for a single color', () => {
    const white = getInnerBorderFrame([ColorType.White]);
    const blue = getInnerBorderFrame([ColorType.Blue]);
    expect(white).not.toBe('');
    expect(blue).not.toBe('');
    expect(white).not.toBe(blue);
  });

  it('returns a two-color border for a color pair', () => {
    const wu = getInnerBorderFrame([ColorType.White, ColorType.Blue]);
    const mono = getInnerBorderFrame([ColorType.White]);
    expect(wu).not.toBe('');
    expect(wu).not.toBe(mono);
  });
});

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
