import CardInterface from '../interfaces/CardInterface';
import { ColorType } from '../interfaces/enums';
import cardToColor from './cardToColor';

export const matchesColorFilter = (
  card: CardInterface,
  shownColors: { [color: string]: boolean },
): boolean => {
  const { color, allColors } = cardToColor(card.front, card.manaCost);
  if (shownColors[color]) return true;
  return color === ColorType.Gold && allColors.some(cardColor => shownColors[cardColor]);
};
