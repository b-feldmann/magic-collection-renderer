import CardInterface from './interfaces/CardInterface';

export enum CardActionType {
  RefreshCollection = 'refresh-collection',
  CreateCard = 'create-card',
  BulkReadCard = 'bulk-read-card',
  ReadCard = 'read-card',
  UpdateCard = 'update-card',
  DeleteCard = 'delete-card'
}

type State = {
  cards: CardInterface[];
  newUuid?: string;
};

export type CardAction =
  | { type: CardActionType.RefreshCollection }
  | { type: CardActionType.CreateCard; payload: { card: CardInterface } }
  | { type: CardActionType.BulkReadCard; payload: { cards: CardInterface[] } }
  | { type: CardActionType.ReadCard; payload: { card: CardInterface } }
  | { type: CardActionType.UpdateCard; payload: { card: CardInterface } }
  | { type: CardActionType.DeleteCard; payload: { uuid: string } };

const cardReducer: React.Reducer<State, CardAction> = (state, action) => {
  switch (action.type) {
    case CardActionType.RefreshCollection:
      return {
        ...state,
        cards: state.cards.map(card => ({ ...card, loading: true }))
      };
    case CardActionType.CreateCard:
      return {
        ...state,
        cards: [...state.cards, action.payload.card],
        newUuid: action.payload.card.uuid
      };
    case CardActionType.ReadCard:
      return {
        ...state,
        cards: [
          ...state.cards.filter(card => card.uuid !== action.payload.card.uuid),
          action.payload.card
        ]
      };
    case CardActionType.BulkReadCard:
      return {
        ...state,
        cards: [
          ...state.cards.filter(
            card => !action.payload.cards.find(newCard => newCard.uuid === card.uuid)
          ),
          ...action.payload.cards
        ]
      };
    case CardActionType.UpdateCard:
      return {
        ...state,
        cards: [
          ...state.cards.filter(card => card.uuid !== action.payload.card.uuid),
          action.payload.card
        ]
      };
    case CardActionType.DeleteCard:
      return {
        ...state,
        cards: [...state.cards.filter(card => card.uuid !== action.payload.uuid)]
      };

    default:
      return state;
  }
};

export default cardReducer;
