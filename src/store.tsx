import React, { createContext, useMemo, useReducer, useRef } from 'react';
import { getTokenCardFaces, TokenCardMatch } from './utils/tokenLinks';
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
  tags?: string[];
  annotationAccessor: AnnotationAccessorInterface;
  user: UserInterface[];
  currentUser: UserInterface;
  dispatch: (value: Action) => void;
};

const initialState = {
  cards: [],
  newUuid: undefined,
  mechanics: [],
  tags: [],
  annotationAccessor: {},
  user: [],
  currentUser: UNKNOWN_CREATOR,
};

const initialStore = {
  ...initialState,
  dispatch: () => {},
};

export const Store = createContext<StoreType>(initialStore);

// Card renders only need the mechanics, so they read them from here rather than
// from `Store`. A `Store` subscription would re-render every visible card on any
// dispatch (a loaded image, a seen card, ...), bypassing their `React.memo`.
export const MechanicsContext = createContext<MechanicInterface[]>(initialState.mechanics);

// The token cards of the collection, which token references in rules text ("[Token: 1/1 blue
// Rogue]") are written out from. Like the mechanics, kept apart from `Store` for the card renders.
export const TokenCardsContext = createContext<TokenCardMatch[]>([]);

const sameTokenCards = (a: TokenCardMatch[], b: TokenCardMatch[]) =>
  a.length === b.length && a.every((entry, index) => entry.face === b[index].face);

/**
 * The token card faces of `cards`, as the same array as long as no token card changed, so an
 * edit to another card doesn't re-render every card that reads `TokenCardsContext`.
 */
export const useTokenCards = (cards: CardInterface[]): TokenCardMatch[] => {
  const previous = useRef<TokenCardMatch[]>([]);
  return useMemo(() => {
    const next = getTokenCardFaces(cards);
    if (sameTokenCards(previous.current, next)) return previous.current;
    previous.current = next;
    return next;
  }, [cards]);
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // `dispatch` is stable across renders, so the context value only needs to be
  // rebuilt when `state` changes. Memoizing prevents every consumer from
  // re-rendering on unrelated re-renders of the provider.
  const value: StoreType = useMemo(() => ({ ...state, dispatch }), [state]);
  const tokenCards = useTokenCards(state.cards);

  return (
    <Store.Provider value={value}>
      <MechanicsContext.Provider value={state.mechanics}>
        <TokenCardsContext.Provider value={tokenCards}>{children}</TokenCardsContext.Provider>
      </MechanicsContext.Provider>
    </Store.Provider>
  );
}
