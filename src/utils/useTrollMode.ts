import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'mtg-funset:TrollMode:v1';

const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
};

let enabled = readStored();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => enabled;

/** Turns troll mode on or off everywhere, and remembers it in this browser. */
export const setTrollMode = (next: boolean) => {
  enabled = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
  } catch {
    // Without storage, the choice lasts until the page is closed.
  }
  listeners.forEach(listener => listener());
};

/** Whether the templating hints are passive-aggressive. */
export const useTrollMode = (): boolean => useSyncExternalStore(subscribe, getSnapshot);
