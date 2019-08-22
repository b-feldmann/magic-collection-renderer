import CardFaceInterface from './CardFaceInterface';
import { CardState, RarityType } from './enums';
import UserInterface from './UserInterface';

export interface CardMeta {
  comment: string;
  likes: string[];
  dislikes: string[];
  lastUpdated: number;
  createdAt: number;
  state: CardState;
}

export default interface CardInterface {
  [key: string]:
    | number
    | string
    | CardFaceInterface
    | CardMeta
    | UserInterface
    | boolean
    | undefined;
  name: string;
  rarity: RarityType;
  creator: UserInterface;
  uuid: string;
  manaCost: string;
  front: CardFaceInterface;
  back?: CardFaceInterface;
  loading?: boolean;
  meta: CardMeta;
}
