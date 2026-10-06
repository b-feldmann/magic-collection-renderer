import { BasicLandType, CardMainType, CoverFit } from './enums';

export default interface CardFaceInterface {
  [key: string]: number | string | boolean | undefined | string[];
  name: string;
  nickname?: string;
  legendary?: boolean;
  vehicle?: boolean;
  cardMainType: CardMainType;
  cardSubTypes?: string;
  basicLandType?: BasicLandType;
  cardText: string[];
  cardStats?: string;
  flavourText?: string;
  flavourAuthor?: string;
  cover?: string;
  coverFit?: CoverFit;
}
