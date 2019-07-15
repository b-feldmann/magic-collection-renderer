import { RarityType, CardMainType } from './enums';

export default interface CardFaceInterface {
  [key: string]: number | string | boolean | undefined;
  name: string;
  legendary?: boolean;
  cardMainType: CardMainType;
  cardSubTypes?: string;
  manaCost: string;
  cardText: string;
  cardStats?: string;
  flavourText?: string;
  flavourAuthor?: string;
  cover?: string;
}
