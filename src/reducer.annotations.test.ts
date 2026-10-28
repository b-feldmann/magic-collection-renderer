import { describe, expect, it } from 'vitest';
import reducer, { Action, AnnotationActionType } from './reducer';
import AnnotationInterface from './interfaces/AnnotationInterface';
import { UNKNOWN_CREATOR } from './utils/constants';

const existing: AnnotationInterface = {
  uuid: 'existing-comment',
  datetime: 1,
  author: 'author',
  content: 'Existing comment',
  cardReference: 'card-1',
  edited: false,
};
const annotation: AnnotationInterface = {
  ...existing,
  uuid: 'new-comment',
  datetime: 2,
  content: 'New comment',
};
const action: Action = {
  type: AnnotationActionType.CreateAnnotation,
  payload: { annotation },
};

function initialState(comments: AnnotationInterface[] = []) {
  return {
    cards: [],
    mechanics: [],
    tags: [],
    annotationAccessor: { 'card-1': comments, 'card-2': [existing] },
    user: [],
    currentUser: UNKNOWN_CREATOR,
  };
}

describe('creating comments in the store', () => {
  it.each([{ comments: [] }, { comments: [existing] }])(
    'does not mutate the previous comment list ($comments.length comments)',
    ({ comments }) => {
      const state = initialState(comments);
      const before = [...comments];

      const next = reducer(state, action);

      expect(state.annotationAccessor['card-1']).toEqual(before);
      expect(next.annotationAccessor['card-1']).toEqual([...before, annotation]);
      expect(next.annotationAccessor['card-2']).toBe(state.annotationAccessor['card-2']);
    },
  );

  it('adds a comment only once when React replays the reducer with the same state', () => {
    const state = initialState([existing]);

    reducer(state, action);
    const next = reducer(state, action);

    expect(next.annotationAccessor['card-1'].map(comment => comment.uuid)).toEqual([
      'existing-comment',
      'new-comment',
    ]);
  });

  it('creates the comment list for a card without previous comments', () => {
    const state = { ...initialState(), annotationAccessor: {} };

    const next = reducer(state, action);

    expect(next.annotationAccessor['card-1']).toEqual([annotation]);
    expect(state.annotationAccessor).toEqual({});
  });

  it('moves an updated comment out of its previous card when its reference changes', () => {
    const comment = { ...existing, cardReference: 'card-2' };
    const movedComment = { ...comment, cardReference: 'card-1' };
    const state = {
      ...initialState(),
      annotationAccessor: { 'card-1': [], 'card-2': [comment] },
    };

    const next = reducer(state, {
      type: AnnotationActionType.UpdateAnnotation,
      payload: { annotation: movedComment },
    });

    expect(next.annotationAccessor['card-1']).toEqual([movedComment]);
    expect(next.annotationAccessor['card-2']).toEqual([]);
    expect(state.annotationAccessor['card-2']).toEqual([comment]);
  });
});
