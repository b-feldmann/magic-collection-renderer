// Geometry for the planeswalker rules/text area, shared by the banded
// background canvas (PlaneswalkerRulesBackground) and the text/loyalty-icon
// positioning in PlaneswalkerCardRender so both stay in sync.
//
// Coordinates are absolute px within the 1500x2100 card space (see
// CARD_WIDTH/CARD_HEIGHT). The region bounds were measured from the opaque area
// of the rules masks:
//   regular (planeswalkerMaskRules.png):     y 1314..1921, x 179..1384
//   tall    (planeswalkerTallMaskRules.png): y 1172..1925, x 175..1388
//
// The ability layout follows the 2026 prints (Professor Dellian Fel, Ral
// Zarek, Chandra Torch of Defiance, Elspeth Sun's Champion, Liliana Death
// Wielder, Ajani Outland Chaperone):
// - the loyalty icons sit at fixed template heights, whatever the text length;
// - the band dividers sit at template heights too; when an ability's text does
//   not fit its band, a divider moves into a neighbouring band, but only into
//   one that holds a single line (Chandra's 3-line +1 takes room from "Add
//   {R}{R}", Ajani's 5-line -8 from its 1-line -2; Ral and Jace, with no such
//   neighbour, were printed smaller instead);
// - every ability's text is centered in its band;
// - all abilities share one font size: the largest one at which that works.

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

// Translucent band fills; the divider strips (abilityLine*.png) carry the same
// two colors in their edge rows. They overlay the artwork, so the alpha lets
// the art show through — only a little on the 2026 prints: over Dellian Fel's
// dark art the light bands are ≈216 bright and the dark ones ≈192, each
// varying by no more than ≈±15 with the art beneath.
export const PLANESWALKER_BAND_LIGHT = 'rgba(255, 255, 255, 0.8)';
export const PLANESWALKER_BAND_DARK = 'rgba(225, 224, 225, 0.8)';

// Native height of the divider strips (abilityLine*.png are 802x26).
export const PLANESWALKER_DIVIDER_HEIGHT = 26;

// MPlantin metrics (em): cap height, and where the cap top and the baseline sit
// below the top of a line box at the 0.97 leading the abilities use
// (ascent 0.90, descent 0.26 → half-leading -0.095).
export const PLANESWALKER_LINE_HEIGHT = 0.97;
const CAP_HEIGHT = 0.68;
const CAP_TOP = 0.125;

// The ability text is 68.6px at most (Liliana and Dellian, whose short
// abilities did not need to shrink) and shrinks in 0.25pt steps like the
// rules text.
export const PLANESWALKER_MAX_FONT_SIZE = 68.61;
export const PLANESWALKER_MIN_FONT_SIZE = 34;

// Visible inside of the rules box (where the first and last bands end).
const BOX_TOP = { regular: 1312, tall: 1175 };
const BOX_BOTTOM = 1905;
// Space the text keeps to its band's edges (cap top / last baseline): Dellian's
// 3-line last ability fits its band at 68.6px with 21px on each side.
const BAND_PADDING = 21;

// Template divider heights and icon centers (their colons), per ability count.
const DIVIDERS: Record<string, number[]> = {
  'tall-4': [1339, 1524, 1681],
  'regular-3': [1496, 1685],
};
const ICON_CENTERS: Record<string, number[]> = {
  'tall-4': [1253, 1438.5, 1612, 1781],
  'regular-3': [1404, 1583.5, 1771],
};

const getRegion = (isTall: boolean): RulesRegion =>
  isTall ? PLANESWALKER_RULES_REGION.tall : PLANESWALKER_RULES_REGION.regular;

const templateKey = (lineCount: number, isTall: boolean) =>
  `${isTall ? 'tall' : 'regular'}-${lineCount}`;

const boxTop = (isTall: boolean) => BOX_TOP[isTall ? 'tall' : 'regular'];

/** Template divider heights: measured, else an even split of the box. */
export const getDefaultDividers = (lineCount: number, isTall: boolean): number[] => {
  const template = DIVIDERS[templateKey(lineCount, isTall)];
  if (template) return template;
  const top = boxTop(isTall);
  const step = (BOX_BOTTOM - top) / Math.max(1, lineCount);
  return Array.from({ length: Math.max(0, lineCount - 1) }, (_, i) => top + step * (i + 1));
};

/** Vertical icon centers: measured, else the middle of each template band. */
export const getIconCenters = (lineCount: number, isTall: boolean): number[] => {
  const template = ICON_CENTERS[templateKey(lineCount, isTall)];
  if (template) return template;
  const edges = [boxTop(isTall), ...getDefaultDividers(lineCount, isTall), BOX_BOTTOM];
  return edges.slice(1).map((bottom, i) => (edges[i] + bottom) / 2);
};

export interface AbilityLayout {
  /** Top of each ability's text box (its first line box). */
  textTops: number[];
  /** Band boundaries between consecutive abilities. */
  dividers: number[];
  /** Whether the abilities fit at this size. */
  fits: boolean;
}

/**
 * Lays out the abilities (their line counts at the given font size): moves
 * the template dividers as little as needed so every ability fits its band,
 * and centers each ability's text in its band.
 */
export const layoutAbilities = (
  lineCounts: number[],
  fontSize: number,
  isTall: boolean,
): AbilityLayout => {
  const count = lineCounts.length;
  if (!count) return { textTops: [], dividers: [], fits: true };

  const pitch = PLANESWALKER_LINE_HEIGHT * fontSize;
  const inkHeights = lineCounts.map(
    lines => (Math.max(1, lines) - 1) * pitch + CAP_HEIGHT * fontSize,
  );
  const needed = inkHeights.map(height => height + 2 * BAND_PADDING);

  const template = getDefaultDividers(count, isTall);
  const top = boxTop(isTall);
  // Band edges: box top, the dividers, box bottom.
  const edges = [top, ...template, BOX_BOTTOM];

  // Push dividers down until every band above them is tall enough...
  for (let i = 1; i < count; i += 1) {
    edges[i] = Math.max(edges[i], edges[i - 1] + needed[i - 1]);
  }
  // ...then up until every band below them is.
  for (let i = count - 1; i >= 1; i -= 1) {
    edges[i] = Math.min(edges[i], edges[i + 1] - needed[i]);
  }

  const bandsFit = needed.every((height, i) => edges[i + 1] - edges[i] >= height - 0.5);
  const dividers = edges.slice(1, -1);
  // A divider that moved down took room from the band below it, one that
  // moved up from the band above; that band must hold a single line.
  const shiftsFit = dividers.every((edge, i) => {
    if (Math.abs(edge - template[i]) < 0.5) return true;
    const donor = edge > template[i] ? i + 1 : i;
    return lineCounts[donor] <= 1;
  });

  // A single line is centered on its loyalty icon (where the colon sits), as
  // far as its band allows: on Professor Dellian Fel (SOS, 2026) the 0 and -3
  // lines sit ≈10px below their band centers, level with the icon. Longer
  // abilities are centered in their band.
  const icons = getIconCenters(count, isTall);
  const centers = inkHeights.map((height, i) => {
    const bandCenter = (edges[i] + edges[i + 1]) / 2;
    if (lineCounts[i] > 1) return bandCenter;
    const half = needed[i] / 2;
    return Math.min(Math.max(icons[i], edges[i] + half), edges[i + 1] - half);
  });

  return {
    textTops: inkHeights.map((height, i) => centers[i] - height / 2 - CAP_TOP * fontSize),
    dividers,
    fits: bandsFit && shiftsFit,
  };
};

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

/** Bands between the given dividers, starting with the lighter fill. */
export const getAbilityBands = (dividers: number[], isTall: boolean): AbilityBand[] => {
  const region = getRegion(isTall);
  const edges = [region.top, ...dividers, region.top + region.height];
  return edges.slice(1).map((bottom, i) => ({
    top: edges[i],
    height: bottom - edges[i],
    light: i % 2 === 0,
  }));
};

/** Divider strips centered on the given band boundaries. */
export const getAbilityDividers = (dividers: number[]): AbilityDivider[] =>
  dividers.map((boundary, i) => ({
    top: boundary - PLANESWALKER_DIVIDER_HEIGHT / 2,
    // Boundary after band 0 (light->dark) uses the odd divider.
    odd: i % 2 === 0,
  }));
