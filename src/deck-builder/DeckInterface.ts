import SmallCardInterface from './SmallCardInterface';

export default interface DeckInterface {
  name: string;
  uuid: string;
  commander: SmallCardInterface;
  cards: SmallCardInterface[];
}
