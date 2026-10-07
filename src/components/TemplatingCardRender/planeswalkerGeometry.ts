// Geometry for the planeswalker rules/text area, shared by the banded
// background canvas (PlaneswalkerRulesBackground) and the text/loyalty-icon
// positioning in PlaneswalkerCardRender so both stay in sync.
//
// Coordinates are absolute px within the 1500x2100 card space (see
// CARD_WIDTH/CARD_HEIGHT). The region bounds were measured from the opaque area
// of the rules masks:
//   regular (planeswalkerMaskRules.png):     y 1314..1921, x 179..1384
//   tall    (planeswalkerTallMaskRules.png): y 1172..1925, x 175..1388

export interface RulesRegion {
  top: number;
  height: number;
  left: number;
  width: number;
}

export const PLANESWALKER_RULES_REGION: { regular: RulesRegion; tall: RulesRegion } = {
  regular: { top: 1314, height: 608, left: 179, width: 1206 },
  tall: { top: 1172, height: 754, left: 175, width: 1214 },
};

// Translucent band fills, sampled from the divider edge rows (white top / grey
// bottom of abilityLineOdd.png). They overlay the artwork, so the alpha lets the
// art show through.
export const PLANESWALKER_BAND_LIGHT = 'rgba(255, 255, 255, 0.608)';
export const PLANESWALKER_BAND_DARK = 'rgba(164, 163, 164, 0.706)';

// Native height of the divider strips (abilityLine*.png are 802x26).
export const PLANESWALKER_DIVIDER_HEIGHT = 26;

export interface AbilityBand {
  top: number;
  height: number;
  /** true -> lighter fill, false -> darker fill. Band 0 is light. */
  light: boolean;
}

export interface AbilityDivider {
  /** Top edge (y) of the divider strip. */
  top: number;
  /** true -> abilityLineOdd (light->dark), false -> abilityLineEven (dark->light). */
  odd: boolean;
}

export interface AbilityLineLayout {
  textTop: number;
  textHeight: number;
  /** Vertical center of the band, used as the loyalty icon anchor. */
  iconTop: number;
}

const getRegion = (isTall: boolean): RulesRegion =>
  isTall ? PLANESWALKER_RULES_REGION.tall : PLANESWALKER_RULES_REGION.regular;

/** Equal-height bands, one per ability, starting with the lighter fill. */
export const getAbilityBands = (lineCount: number, isTall: boolean): AbilityBand[] => {
  const region = getRegion(isTall);
  const bandHeight = region.height / lineCount;

  const bands: AbilityBand[] = [];
  for (let i = 0; i < lineCount; i += 1) {
    bands.push({
      top: region.top + i * bandHeight,
      height: bandHeight,
      light: i % 2 === 0,
    });
  }
  return bands;
};

/** Dividers sit on the internal band boundaries (lineCount - 1 of them). */
export const getAbilityDividers = (lineCount: number, isTall: boolean): AbilityDivider[] => {
  const region = getRegion(isTall);
  const bandHeight = region.height / lineCount;

  const dividers: AbilityDivider[] = [];
  for (let i = 0; i < lineCount - 1; i += 1) {
    const boundary = region.top + (i + 1) * bandHeight;
    dividers.push({
      top: boundary - PLANESWALKER_DIVIDER_HEIGHT / 2,
      // Boundary after band 0 (light->dark) uses the odd divider.
      odd: i % 2 === 0,
    });
  }
  return dividers;
};

// Inset keeps the text clear of the divider strips at the band edges.
const TEXT_VERTICAL_INSET = 14;

/** Text box + loyalty icon positions, centered within each ability band. */
export const getAbilityLineLayouts = (lineCount: number, isTall: boolean): AbilityLineLayout[] => {
  const bands = getAbilityBands(lineCount, isTall);
  return bands.map(band => ({
    textTop: band.top + TEXT_VERTICAL_INSET,
    textHeight: band.height - TEXT_VERTICAL_INSET * 2,
    iconTop: band.top + band.height / 2,
  }));
};
