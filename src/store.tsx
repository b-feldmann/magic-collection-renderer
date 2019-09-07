import React, { createContext, useReducer } from 'react';
import reducer, { Action } from './reducer';
import CardInterface from './interfaces/CardInterface';
import MechanicInterface from './interfaces/MechanicInterface';
import AnnotationAccessorInterface from './interfaces/AnnotationAccessorInterface';
import UserInterface from './interfaces/UserInterface';
import { UNKNOWN_CREATOR } from './interfaces/constants';

export type StoreType = {
  cards: CardInterface[];
  newUuid?: string;
  mechanics: MechanicInterface[];
  annotationAccessor: AnnotationAccessorInterface;
  user: UserInterface[];
  currentUser: UserInterface;
  dispatch: (value: Action) => void;
};

const initialState = {
  cards: [],
  newUuid: undefined,
  mechanics: [],
  annotationAccessor: {},
  user: [],
  currentUser: UNKNOWN_CREATOR
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
