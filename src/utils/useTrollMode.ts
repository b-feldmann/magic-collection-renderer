import { useContext, useSyncExternalStore } from 'react';

import { setTrollMode as saveTrollMode } from '../actions/userActions';
import { Store } from '../store';

// The latest choice of this session. It applies at once and to every component, whether or not it
// could be stored on the user.
let chosen: { user: string; enabled: boolean } | undefined;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => chosen;

/** Whether the templating hints are passive-aggressive for the current user, and its setter. */
export const useTrollMode = (): [boolean, (enabled: boolean) => void] => {
  const { currentUser, dispatch } = useContext(Store);
  const choice = useSyncExternalStore(subscribe, getSnapshot);
  const enabled =
    (choice?.user === currentUser.uuid ? choice.enabled : undefined) ??
    currentUser.trollMode ??
    false;

  const setTrollMode = (next: boolean) => {
    chosen = { user: currentUser.uuid, enabled: next };
    listeners.forEach(listener => listener());
    saveTrollMode(dispatch, next, currentUser);
  };

  return [enabled, setTrollMode];
};
