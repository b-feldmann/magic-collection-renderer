import CardInterface from './interfaces/CardInterface';

export enum CardActionType {
  GetAllCards = 'get-all-cards',
  CreateCard = 'create-card',
  ReadCard = 'read-card',
  UpdateCard = 'update-card',
  DeleteCard = 'delete-card'
}

type State = {
  cards: CardInterface[];
  newUuid?: string;
};

export type CardAction =
  | { type: CardActionType.GetAllCards; payload: { cards: CardInterface[] } }
  | { type: CardActionType.CreateCard; payload: { card: CardInterface } }
  | { type: CardActionType.ReadCard; payload: { card: CardInterface } }
  | { type: CardActionType.UpdateCard; payload: { card: CardInterface } }
  | { type: CardActionType.DeleteCard; payload: { uuid: string } };

const cardReducer: React.Reducer<State, CardAction> = (state, action) => {
  switch (action.type) {
    case CardActionType.GetAllCards:
      return {
        ...state,
        cards: Object.values(action.payload.cards).map(card => {
          const cleanedCard = { ...card };
          delete cleanedCard.rowNumber;
          if (typeof cleanedCard.front.cardText === 'string') {
            // @ts-ignore
            cleanedCard.front.cardText = cleanedCard.front.cardText.split('|');
          }
          if (cleanedCard.back && typeof cleanedCard.back.cardText === 'string') {
            // @ts-ignore
            cleanedCard.back.cardText = cleanedCard.back.cardText.split('|');
          }

          return cleanedCard;
        })
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
