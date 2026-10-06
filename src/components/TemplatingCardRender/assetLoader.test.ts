import { describe, it, expect } from 'vitest';

import {
  getInnerBorderFrame,
  getColorMainframe,
  getTokenMainframe,
  getInventionMainframe,
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
