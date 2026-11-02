import CardInterface from '../interfaces/CardInterface';
import { ColorType, RarityType, SortByType } from '../interfaces/enums';
import cardToColor from './cardToColor';
import { UNKNOWN_CREATOR } from './constants';

export type SortAccessor = (o: CardInterface) => number | string;

export type AnnotationAccessor = { [uuid: string]: { datetime: number }[] };

export const getLastUpdated = (
  card: CardInterface,
  annotationAccessor: AnnotationAccessor,
): number => {
  const annotations = annotationAccessor[card.uuid];
  if (!annotations) return card.meta.lastUpdated;

  const lastAnnotation = annotations.reduce((a, b) => (a.datetime > b.datetime ? a : b));
  return Math.max(lastAnnotation.datetime, card.meta.lastUpdated);
};

export const getConvertedManaCost = (manaCost: string): number =>
  (manaCost.match(/\{[^}]+\}/g) || []).reduce((total, symbol) => {
    const manaSymbol = symbol.slice(1, -1);
    const value = parseInt(manaSymbol, 10);
    // Numeric symbols add their value, variable symbols are 0, and other
    // single mana symbols count as 1.
    if (/^[XYZ]$/i.test(manaSymbol)) return total;
    return total + (Number.isNaN(value) ? 1 : value);
  }, 0);

export const buildSortAccessors = (
  sortBy: SortByType,
  secondarySortBy: SortByType,
  annotationAccessor: AnnotationAccessor,
): SortAccessor[] => {
  const accessors: Record<SortByType, SortAccessor[]> = {
    [SortByType.Color]: [
      o => Object.values(ColorType).indexOf(cardToColor(o.front, o.manaCost).color),
      o => o.front.name.toLowerCase(),
    ],
    [SortByType.Creator]: [
      o => (o.creator.uuid === UNKNOWN_CREATOR.uuid ? 'zzzzz' : o.creator.name),
      o => Object.values(ColorType).indexOf(cardToColor(o.front, o.manaCost).color),
      o => o.front.name.toLowerCase(),
    ],
    [SortByType.LastUpdated]: [o => -1 * getLastUpdated(o, annotationAccessor)],
    [SortByType.Rarity]: [
      o => Object.values(RarityType).length - 1 - Object.values(RarityType).indexOf(o.rarity),
    ],
    [SortByType.ManaCost]: [o => getConvertedManaCost(o.manaCost), o => o.front.name.toLowerCase()],
    [SortByType.Name]: [o => o.front.name.toLowerCase()],
  };

  const list: SortAccessor[] = [...accessors[sortBy]];
  if (secondarySortBy !== sortBy) list.push(...accessors[secondarySortBy]);
  return list;
};
