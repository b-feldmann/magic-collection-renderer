import React, { createContext, useReducer } from 'react';
import reducer, { CardAction } from './cardReducer';
import CardInterface from './interfaces/CardInterface';

export type StoreType = {
  cards: CardInterface[];
  newUuid?: string;
  keywords: string[];
  cardSubTypes: string[];
  creators: string[];
  dispatch: (value: CardAction) => void;
};

const initialStore = {
  cards: [],
  newUuid: undefined,
  keywords: [],
  cardSubTypes: [],
  creators: [''],
  dispatch: () => {}
};

export const Store = createContext<StoreType>(initialStore);

const initialCardState = {
  cards: []
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cardState, dispatch] = useReducer(reducer, initialCardState);

  const value: StoreType = { ...initialStore, ...cardState, dispatch };

  return <Store.Provider value={value}>{children}</Store.Provider>;
}
