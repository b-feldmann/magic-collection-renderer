import React, { createContext, useMemo, useReducer } from 'react';
import reducer, { Action } from './reducer';
import CardInterface from './interfaces/CardInterface';
import MechanicInterface from './interfaces/MechanicInterface';
import AnnotationAccessorInterface from './interfaces/AnnotationAccessorInterface';
import UserInterface from './interfaces/UserInterface';
import { UNKNOWN_CREATOR } from './utils/constants';

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
  currentUser: UNKNOWN_CREATOR,
};

const initialStore = {
  ...initialState,
  dispatch: () => {},
};

export const Store = createContext<StoreType>(initialStore);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // `dispatch` is stable across renders, so the context value only needs to be
  // rebuilt when `state` changes. Memoizing prevents every consumer from
  // re-rendering on unrelated re-renders of the provider.
  const value: StoreType = useMemo(() => ({ ...state, dispatch }), [state]);

  return <Store.Provider value={value}>{children}</Store.Provider>;
}
