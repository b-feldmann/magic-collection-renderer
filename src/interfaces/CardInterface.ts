import CardFaceInterface from './CardFaceInterface';
import { RarityType } from './enums';

export default interface CardInterface {
  [key: string]: number | string | CardFaceInterface | undefined;
  name: string;
  rarity: RarityType;
  creator?: string;
  cardID: string;
  manaCost: string;
  front: CardFaceInterface;
  back?: CardFaceInterface;
}
