import React, { createContext, useReducer } from 'react';
import DeckIdentifierInterface from './DeckIdentifierInterface';
import reducer, { Action } from './reducer';
import DeckInterface from './DeckInterface';

export type StoreType = {
  decks: DeckIdentifierInterface[];
  currentDeck?: DeckInterface;
  hash: string;
  dispatch: (value: Action) => void;
};

const initialState = {
  decks: [],
  currentDeck: undefined,
  hash: ''
};

const initialStore = {
  ...initialState,
  dispatch: () => {}
};

export const Store = createContext<StoreType>(initialStore);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value: StoreType = { ...initialStore, ...state, dispatch };

  return <Store.Provider value={value}>{children}</Store.Provider>;
}
