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

    for (let i = 0; i < manaCost.length; i++) {
      switch (manaCost.charAt(i)) {
        case 'w':
        case 'W':
          setColor(ColorType.White);
          break;
        case 'b':
        case 'B':
          setColor(ColorType.Black);
          break;
        case 'u':
        case 'U':
          setColor(ColorType.Blue);
          break;
        case 'r':
        case 'R':
          setColor(ColorType.Red);
          break;
        case 'g':
        case 'G':
          setColor(ColorType.Green);
          break;
        default:
          continue;
      }
    }
  }

  return color;
};

export default cardToColor;
