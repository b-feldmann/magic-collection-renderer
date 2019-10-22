import UserInterface from '../interfaces/UserInterface';

export const UNKNOWN_CREATOR: UserInterface = {
  name: 'Unkown',
  uuid: '-1',
  lastSeenVersion: -1,
  seenCards: []
};

export const EDIT_TIME_OFFSET = 600;

export const NEEDED_LIKES_TO_APPROVE = 4;
