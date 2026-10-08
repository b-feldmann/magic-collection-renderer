import { BasicLandType, CardType, ColorType } from '../interfaces/enums';
import CardFaceInterface from '../interfaces/CardFaceInterface';
import getLandColor, { getSingleColor } from './getLandColor';

// Re-exported for backwards compatibility: a land's colour identity is derived
// from its mana cost and rules text. See ./getLandColor.
export const getColorIdentity = getLandColor;

const colorToColorHex = (color: ColorType): string => {
  switch (color) {
    case ColorType.White:
      return '#e0e4e3';
    case ColorType.Blue:
      return '#0456a8';
    case ColorType.Black:
      return '#464e39';
    case ColorType.Red:
      return '#df3619';
    case ColorType.Green:
      return '#26714A';
    case ColorType.Gold:
      return '#eed66b';
    default:
      return '#d9d7da';
  }
};

interface ColorDictInterface {
  white: string[];
  blue: string[];
  black: string[];
  red: string[];
  green: string[];
  colorless: string[];
  x: string[];
  rest: string[];
}

export const getBasicLandColor = (basicLandType: string) => {
  switch (basicLandType) {
    case BasicLandType.Plains:
      return colorToColorHex(ColorType.White);
    case BasicLandType.Island:
      return colorToColorHex(ColorType.Blue);
    case BasicLandType.Swamp:
      return colorToColorHex(ColorType.Black);
    case BasicLandType.Mountain:
      return colorToColorHex(ColorType.Red);
    case BasicLandType.Forest:
      return colorToColorHex(ColorType.Green);
    default:
      return colorToColorHex(ColorType.Gold);
  }
};
// : {}
export const getColor = (
  manaCost: string = '',
  tokenColors?: string[],
): { color: ColorType; allColors: ColorType[]; orderedCost: string; hexColor: string } => {
  if (tokenColors && tokenColors.length > 0) {
    const selected = tokenColors.filter(t =>
      (Object.values(ColorType) as string[]).includes(t),
    ) as ColorType[];
    const overrideColor =
      selected.length === 1
        ? selected[0]
        : selected.length >= 2
          ? ColorType.Gold
          : ColorType.Colorless;
    return {
      color: overrideColor,
      allColors: selected,
      orderedCost: '',
      hexColor: colorToColorHex(overrideColor),
    };
  }

  let parsedColor: ColorType = ColorType.Colorless;
  const allColors: ColorType[] = [];

  const colorDict: ColorDictInterface = {
    white: [],
    blue: [],
    black: [],
    red: [],
    green: [],
    colorless: [],
    x: [],
    rest: [],
  };

  if (manaCost === '')
    return {
      color: parsedColor,
      allColors,
      orderedCost: '',
      hexColor: colorToColorHex(parsedColor),
    };

  const addColor = (type: ColorType, cost: string) => {
    switch (type) {
      case ColorType.White:
        colorDict.white.push(cost);
        break;
      case ColorType.Blue:
        colorDict.blue.push(cost);
        break;
      case ColorType.Black:
        colorDict.black.push(cost);
        break;
      case ColorType.Red:
        colorDict.red.push(cost);
        break;
      case ColorType.Green:
        colorDict.green.push(cost);
        break;
      default:
        if (cost === 'x' || cost === 'X') colorDict.x.push(cost);
        else if (cost.match(/\d{1,2}/)) colorDict.colorless.push(cost);
        else colorDict.rest.push(cost);
        break;
    }

    if (parsedColor === type || type === ColorType.Colorless) return;
    if (parsedColor === ColorType.Colorless) parsedColor = type;
    else parsedColor = ColorType.Gold;

    if (!allColors.includes(type)) {
      allColors.push(type);
    }
  };

  const array = manaCost.split(/\}\{|\{|\}/);
  array.forEach((cost: string) => {
    addColor(getSingleColor(cost), cost);
  });

  return {
    color: parsedColor,
    allColors,
    orderedCost: getOrdering(colorDict),
    hexColor: colorToColorHex(parsedColor),
  };
};

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

  // Tokens take their colors from the explicit tokenColors selection instead
  // of the mana cost; a token without a selection is colorless.
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

  // Lands usually have no mana cost, so their colour identity is derived from
  // the mana symbols in their rules text instead.
  if (types.includes(CardType.Land)) {
    const identity = getLandColor(cardText);
    if (identity.length === 1) return { color: identity[0], allColors: identity };
    if (identity.length >= 2) return { color: ColorType.Gold, allColors: identity };
    return { color: ColorType.Colorless, allColors: [ColorType.Colorless] };
  }

  if (!manaCost) return { color: ColorType.Colorless, allColors: [ColorType.Colorless] };

  const setColor = (type: ColorType) => {
    if (color === type) return;
    if (color === ColorType.Colorless) color = type;
    else color = ColorType.Gold;

    allColors.push(type);
  };

  const array = manaCost.split(/{(.)}|{(..)}/);
  array.forEach((cost: string) => {
    if (!cost || cost === '') return;
    switch (cost) {
      case 'w':
      case 'W':
      case 'wp':
      case 'Wp':
      case 'wP':
      case 'WP':
      case 'pw':
      case 'pW':
      case 'Pw':
      case 'PW':
        setColor(ColorType.White);
        break;
      case 'u':
      case 'U':
      case 'up':
      case 'Up':
      case 'uP':
      case 'UP':
      case 'pu':
      case 'pU':
      case 'Pu':
      case 'PU':
        setColor(ColorType.Blue);
        break;
      case 'b':
      case 'B':
      case 'bp':
      case 'Bp':
      case 'bP':
      case 'BP':
      case 'pb':
      case 'pB':
      case 'Pb':
      case 'PB':
        setColor(ColorType.Black);
        break;
      case 'r':
      case 'R':
      case 'rp':
      case 'Rp':
      case 'rP':
      case 'RP':
      case 'pr':
      case 'pR':
      case 'Pr':
      case 'PR':
        setColor(ColorType.Red);
        break;
      case 'g':
      case 'G':
      case 'gp':
      case 'Gp':
      case 'gP':
      case 'GP':
      case 'pg':
      case 'pG':
      case 'Pg':
      case 'PG':
        setColor(ColorType.Green);
        break;
      default:
        // do nothing
        break;
    }
  });

  return { color, allColors };
};

const addUpColorlessCost = (costs: string[]) => {
  let count = 0;
  try {
    costs.forEach(cost => {
      count += parseInt(cost, 10);
    });
  } catch (e) {
    console.log(e);
  }
  if (count === 0) return '';
  return `{${count}}`;
};

const join = (...items: string[][]) => {
  return items
    .map(list =>
      list
        .map(value => (value ? `{${value}}` : ''))
        .sort((colorA, colorB) => colorB.length - colorA.length)
        .join(''),
    )
    .join('');
};

const getOrdering = (colorDict: ColorDictInterface): string => {
  let orderedCost = addUpColorlessCost(colorDict.colorless);
  orderedCost += colorDict.x.map(value => `{${value}}`).join('');

  let binaryColorRepresentation = 0;
  if (colorDict.white.length > 0) binaryColorRepresentation += 1;
  if (colorDict.blue.length > 0) binaryColorRepresentation += 2;
  if (colorDict.black.length > 0) binaryColorRepresentation += 4;
  if (colorDict.red.length > 0) binaryColorRepresentation += 8;
  if (colorDict.green.length > 0) binaryColorRepresentation += 16;

  const W = colorDict.white; // 1
  const U = colorDict.blue; // 2
  const B = colorDict.black; // 4
  const R = colorDict.red; // 8
  const G = colorDict.green; // 16

  if (binaryColorRepresentation === 1) orderedCost += join(W);
  else if (binaryColorRepresentation === 2) orderedCost += join(U);
  else if (binaryColorRepresentation === 3) orderedCost += join(W, U);
  else if (binaryColorRepresentation === 4) orderedCost += join(B);
  else if (binaryColorRepresentation === 5) orderedCost += join(W, B);
  else if (binaryColorRepresentation === 6) orderedCost += join(U, B);
  else if (binaryColorRepresentation === 7) orderedCost += join(W, U, B);
  else if (binaryColorRepresentation === 8) orderedCost += join(R);
  else if (binaryColorRepresentation === 9) orderedCost += join(R, W);
  else if (binaryColorRepresentation === 10) orderedCost += join(U, R);
  else if (binaryColorRepresentation === 11) orderedCost += join(U, R, W);
  else if (binaryColorRepresentation === 12) orderedCost += join(B, R);
  else if (binaryColorRepresentation === 13) orderedCost += join(R, W, B);
  else if (binaryColorRepresentation === 14) orderedCost += join(U, B, R);
  else if (binaryColorRepresentation === 15) orderedCost += join(W, U, B, R);
  else if (binaryColorRepresentation === 16) orderedCost += join(G);
  else if (binaryColorRepresentation === 17) orderedCost += join(G, W);
  else if (binaryColorRepresentation === 18) orderedCost += join(G, U);
  else if (binaryColorRepresentation === 19) orderedCost += join(G, W, U);
  else if (binaryColorRepresentation === 20) orderedCost += join(B, G);
  else if (binaryColorRepresentation === 21) orderedCost += join(W, B, G);
  else if (binaryColorRepresentation === 22) orderedCost += join(B, G, U);
  else if (binaryColorRepresentation === 23) orderedCost += join(G, W, U, B);
  else if (binaryColorRepresentation === 24) orderedCost += join(R, G);
  else if (binaryColorRepresentation === 25) orderedCost += join(R, G, W);
  else if (binaryColorRepresentation === 26) orderedCost += join(G, U, R);
  else if (binaryColorRepresentation === 27) orderedCost += join(R, G, W, U);
  else if (binaryColorRepresentation === 28) orderedCost += join(B, R, G);
  else if (binaryColorRepresentation === 29) orderedCost += join(B, R, G, W);
  else if (binaryColorRepresentation === 30) orderedCost += join(U, B, R, G);
  else if (binaryColorRepresentation === 31) orderedCost += join(W, U, B, R, G);

  orderedCost += colorDict.rest.map(value => (value ? `{${value}}` : '')).join('');

  return orderedCost;
};

export default cardToColor;
