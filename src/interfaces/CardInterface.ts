import { RarityType, CardMainType } from './enums';

export default interface CardInterface {
  [key: string]: number | string | boolean | undefined;
  rowNumber: number;
  name: string;
  legendary?: boolean;
  cardMainType: CardMainType;
  cardSubTypes?: string;
  manaCost: string;
  rarity: RarityType;
  cardText: string;
  cardStats?: string;
  flavourText?: string;
  flavourAuthor?: string;
  cover?: string;
  creator?: string;
  cardIndex: number;
}
