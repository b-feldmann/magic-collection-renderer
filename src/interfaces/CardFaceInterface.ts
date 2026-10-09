import { AdventureType, BasicLandType, CardType, ColorType, CoverFit } from './enums';

export default interface CardFaceInterface {
  [key: string]: number | string | boolean | undefined | string[];

  name: string;
  nickname?: string;
  legendary?: boolean;
  vehicle?: boolean;
  cardTypes: CardType[];
  cardSubTypes?: string;
  basicLandType?: BasicLandType;
  cardText: string[];
  cardStats?: string;
  flavourText?: string;
  flavourAuthor?: string;
  cover?: string;
  coverFit?: CoverFit;
  tokenColors?: ColorType[];
  backFace?: boolean;
  // The spell half of an Adventure card (the small left box on the frame).
  adventureName?: string;
  adventureCost?: string;
  adventureText?: string[];
  adventureType?: AdventureType;
}
