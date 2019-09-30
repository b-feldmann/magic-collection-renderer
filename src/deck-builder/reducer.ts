import DeckIdentifierInterface from './DeckIdentifierInterface';
import DeckInterface from './DeckInterface';

export enum DeckActionType {
  GetDecks = 'get-decks',
  CreateDeck = 'create-deck',
  ReadDeck = 'read-deck',
  UpdateDeck = 'update-deck'
}

type State = {
  decks: DeckIdentifierInterface[];
  currentDeck?: DeckInterface;
  hash: string;
};

export type Action =
  | { type: DeckActionType.GetDecks; payload: { decks: DeckIdentifierInterface[] } }
  | { type: DeckActionType.CreateDeck; payload: { deck: DeckIdentifierInterface } }
  | { type: DeckActionType.ReadDeck; payload: { deck: DeckInterface } }
  | { type: DeckActionType.UpdateDeck; payload: { deck: DeckInterface } };

const reducer: React.Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case DeckActionType.GetDecks:
      return {
        ...state,
        decks: action.payload.decks
      };
    case DeckActionType.CreateDeck:
      return {
        ...state,
        decks: [...state.decks, action.payload.deck]
      };
    case DeckActionType.ReadDeck:
    case DeckActionType.UpdateDeck:
      return {
        ...state,
        currentDeck: action.payload.deck
      };

    default:
      return state;
  }
};

export default reducer;
