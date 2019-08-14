import CardInterface from './interfaces/CardInterface';
import MechanicInterface from './interfaces/MechanicInterface';

export enum CardActionType {
  RefreshCollection = 'refresh-collection',
  CreateCard = 'create-card',
  BulkReadCard = 'bulk-read-card',
  ReadCard = 'read-card',
  UpdateCard = 'update-card',
  DeleteCard = 'delete-card'
}

export enum MechanicActionType {
  GetMechanics = 'get-mechanics',
  CreateMechanic = 'create-mechanic',
  UpdateMechanic = 'update-mechanic',
  DeleteMechanic = 'delete-mechanic'
}

type State = {
  cards: CardInterface[];
  mechanics: MechanicInterface[];
  newUuid?: string;
};

export type Action =
  | { type: CardActionType.RefreshCollection }
  | { type: CardActionType.CreateCard; payload: { card: CardInterface } }
  | { type: CardActionType.BulkReadCard; payload: { cards: CardInterface[] } }
  | { type: CardActionType.ReadCard; payload: { card: CardInterface } }
  | { type: CardActionType.UpdateCard; payload: { card: CardInterface } }
  | { type: CardActionType.DeleteCard; payload: { uuid: string } }
  | { type: MechanicActionType.GetMechanics; payload: { mechanics: MechanicInterface[] } }
  | { type: MechanicActionType.CreateMechanic; payload: { mechanic: MechanicInterface } }
  | { type: MechanicActionType.UpdateMechanic; payload: { mechanic: MechanicInterface } }
  | { type: MechanicActionType.DeleteMechanic; payload: { uuid: string } };

const cardReducer: React.Reducer<State, Action> = (state, action) => {
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

    case MechanicActionType.GetMechanics:
      return {
        ...state,
        mechanics: action.payload.mechanics
      };
    case MechanicActionType.CreateMechanic:
      return {
        ...state,
        mechanics: [...state.mechanics, action.payload.mechanic]
      };
    case MechanicActionType.UpdateMechanic:
      return {
        ...state,
        mechanics: [
          ...state.mechanics.filter(mechanic => mechanic.uuid !== action.payload.mechanic.uuid),
          action.payload.mechanic
        ]
      };
    case MechanicActionType.DeleteMechanic:
      return {
        ...state,
        mechanics: [...state.mechanics.filter(mechanic => mechanic.uuid !== action.payload.uuid)]
      };

    default:
      return state;
  }
};

export default cardReducer;
