import UserInterface from '../interfaces/UserInterface';

export const UNKNOWN_CREATOR: UserInterface = {
  name: 'Unkown',
  uuid: '-1',
  lastSeenVersion: -1,
  seenCards: [],
};

export const EDIT_TIME_OFFSET = 600;

// Debounce for the DB auto-save; waits longer than the live preview so
// auto-save only fires once edits have settled.
export const EDIT_SAVE_OFFSET = 2000;

export const NEEDED_LIKES_TO_APPROVE = 4;
