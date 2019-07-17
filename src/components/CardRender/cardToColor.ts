import { CardMainType, ColorType } from '../../interfaces/enums';

const cardToColor = (
  cardMainType: CardMainType,
  manaCost?: string
): ColorType => {
  let color: ColorType = ColorType.Colorless;
  if (cardMainType === CardMainType.Land) {
    color = ColorType.Land;
  } else if (cardMainType === CardMainType.Planeswalker) {
    color = ColorType.Planeswalker;
  } else {
    if (!manaCost) return ColorType.Colorless;

    const setColor = (type: ColorType) => {
      if (color === type) return;
      if (color === ColorType.Colorless) color = type;
      else color = ColorType.Gold;
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
      }
    });
  }

  return color;
};

export default cardToColor;
