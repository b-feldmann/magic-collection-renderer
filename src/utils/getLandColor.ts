import { ColorType } from '../interfaces/enums';

/**
 * Maps a single mana token (e.g. "W", "pG", "UP") to its ColorType.
 * Anything that is not a coloured pip (generic/hybrid-with-phyrexian aside)
 * resolves to Colorless.
 */
export const getSingleColor = (cost: string): ColorType => {
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

/**
 * Determines the colour identity of a land from its mana cost and rules text.
 *
 * Lands usually have an empty mana cost, so their colour(s) are derived from the
 * mana symbols that appear in the card text (e.g. "{T}: Add {G} or {W}"), plus
 * the special case "mana of any color". Colorless and Gold are never part of an
 * identity.
 */
const getLandColor = (manaCost: string = '', cardText: string[] = []): ColorType[] => {
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

export default getLandColor;
