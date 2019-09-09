import { BasicLandType, CardMainType, ColorType, ColorTypePlus } from '../interfaces/enums';

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

export const getColorIdentity = (manaCost: string = '', cardText: string[]): ColorType[] => {
  const allColors: ColorType[] = [];

  const addColor = (type: ColorType) => {
    if (type === ColorType.Colorless || type === ColorType.Gold) return;
    if (!allColors.some(c => c === type)) allColors.push(type);
  };

  const array = manaCost.split(/\}\{|\{|\}/);
  array.forEach((cost: string) => {
    addColor(getSingleColor(cost));
  });

  cardText.forEach(line => {
    if (allColors.length === 5) return;
    if (line.toLowerCase().indexOf('mana of any color') !== -1) {
      addColor(ColorType.White);
      addColor(ColorType.Blue);
      addColor(ColorType.Black);
      addColor(ColorType.Red);
      addColor(ColorType.Green);
      return;
    }

    const lineSplit = line.split(/\}\{|\{|\}/);
    lineSplit.forEach((cost: string) => {
      addColor(getSingleColor(cost));
    });
  });

  return allColors;
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

export const getColor = (manaCost: string = '') => {
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
    rest: []
  };

  if (manaCost === '')
    return {
      color: parsedColor,
      allColors,
      orderedCost: '',
      hexColor: colorToColorHex(parsedColor)
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
    hexColor: colorToColorHex(parsedColor)
  };
};

const cardToColor = (
  cardMainType: CardMainType,
  manaCost?: string
): { color: ColorTypePlus; allColors: ColorTypePlus[] } => {
  let color: ColorTypePlus = ColorTypePlus.Colorless;
  const allColors: ColorTypePlus[] = [];

  if (cardMainType === CardMainType.Land) {
    color = ColorTypePlus.Land;
  } else {
    if (!manaCost) return { color: ColorTypePlus.Colorless, allColors: [ColorTypePlus.Colorless] };

    const setColor = (type: ColorTypePlus) => {
      if (color === type) return;
      if (color === ColorTypePlus.Colorless) color = type;
      else color = ColorTypePlus.Gold;

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
          setColor(ColorTypePlus.White);
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
          setColor(ColorTypePlus.Blue);
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
          setColor(ColorTypePlus.Black);
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
          setColor(ColorTypePlus.Red);
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
          setColor(ColorTypePlus.Green);
          break;
        default:
          // do nothing
          break;
      }
    });
  }

  return { color, allColors };
};

const getSingleColor = (cost: string) => {
  if (!cost || cost === '') return ColorType.Colorless;
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
      return ColorType.White;
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
      return ColorType.Blue;
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
      return ColorType.Black;
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
      return ColorType.Red;
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
      return ColorType.Green;
    default:
      return ColorType.Colorless;
  }
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
        .join('')
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
