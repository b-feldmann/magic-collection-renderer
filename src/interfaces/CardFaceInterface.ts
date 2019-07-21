import { CardMainType } from './enums';

export default interface CardFaceInterface {
  [key: string]: number | string | boolean | undefined | string[];
  name: string;
  legendary?: boolean;
  cardMainType: CardMainType;
  cardSubTypes?: string;
  cardText: string[];
  cardStats?: string;
  flavourText?: string;
  flavourAuthor?: string;
  cover?: string;
}
