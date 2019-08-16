import CardFaceInterface from './CardFaceInterface';
import { CardVersion, RarityType } from './enums';

export default interface CardInterface {
  [key: string]: number | string | CardFaceInterface | boolean | undefined;
  name: string;
  rarity: RarityType;
  creator: string;
  uuid: string;
  manaCost: string;
  front: CardFaceInterface;
  back?: CardFaceInterface;
  lastUpdated: number;
  createdAt: number;
  version: CardVersion;
  loading?: boolean;
}
