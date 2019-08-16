import React, { createContext, useReducer } from 'react';
import reducer, { Action } from './cardReducer';
import CardInterface from './interfaces/CardInterface';
import MechanicInterface from './interfaces/MechanicInterface';
import AnnotationAccessorInterface from './interfaces/AnnotationAccessorInterface';

export type StoreType = {
  cards: CardInterface[];
  newUuid?: string;
  mechanics: MechanicInterface[];
  annotationAccessor: AnnotationAccessorInterface;
  keywords: string[];
  cardSubTypes: string[];
  creators: string[];
  dispatch: (value: Action) => void;
};

const initialState = {
  cards: [],
  newUuid: undefined,
  mechanics: [],
  annotationAccessor: {},
  keywords: [],
  cardSubTypes: [],
  creators: ['']
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
