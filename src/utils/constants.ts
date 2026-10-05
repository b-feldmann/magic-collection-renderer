import UserInterface from '../interfaces/UserInterface';

export const UNKNOWN_CREATOR: UserInterface = {
  name: 'Unkown',
  uuid: '-1',
  lastSeenVersion: -1,
  seenCards: [],
};

// Base coordinate space every card render is laid out in. All element
// positions in the card SCSS are absolute px within this space, and the render
// is uniformly transform-scaled to fit its container. Matches the native size
// of the m15 frame art (1500x2100).
export const CARD_WIDTH = 1500;
export const CARD_HEIGHT = 2100;

export const EDIT_TIME_OFFSET = 600;

// Debounce for the DB auto-save; waits longer than the live preview so
// auto-save only fires once edits have settled.
export const EDIT_SAVE_OFFSET = 2000;

export const NEEDED_LIKES_TO_APPROVE = 4;

// Name of the user allowed to delete cards.
export const BJENNWARE = 'BJennWare';
