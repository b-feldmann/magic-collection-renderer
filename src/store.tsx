import React, { createContext, useReducer } from 'react';
import reducer, { Action } from './cardReducer';
import CardInterface from './interfaces/CardInterface';
import MechanicInterface from './interfaces/MechanicInterface';

export type StoreType = {
  cards: CardInterface[];
  newUuid?: string;
  mechanics: MechanicInterface[];
  keywords: string[];
  cardSubTypes: string[];
  creators: string[];
  dispatch: (value: Action) => void;
};

const initialStore = {
  cards: [],
  newUuid: undefined,
  mechanics: [],
  keywords: [],
  cardSubTypes: [],
  creators: [''],
  dispatch: () => {}
};

export const Store = createContext<StoreType>(initialStore);

const initialState = {
  cards: [],
  mechanics: []
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value: StoreType = { ...initialStore, ...state, dispatch };

  return <Store.Provider value={value}>{children}</Store.Provider>;
}
