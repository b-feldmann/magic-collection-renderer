import { describe, expect, it } from 'vitest';

import reducer, { CardActionType, ImageActionType } from './reducer';
import CardInterface from './interfaces/CardInterface';
import { EMPTY_CARD } from './actions/cardActions';
import { UNKNOWN_CREATOR } from './utils/constants';

const LOADED = 'base64:art.png|data:image/png;base64,AAAA';

const card = (overrides: Partial<CardInterface> = {}, cover = 'loading:art.png'): CardInterface => {
  const base = EMPTY_CARD();
  return {
    ...base,
    uuid: 'card-1',
    meta: { ...base.meta, lastUpdated: 1 },
    front: { ...base.front, cover, cardText: ['Draw a card.'] },
    ...overrides,
  };
};

const stateWith = (cards: CardInterface[]) => ({
  cards,
  mechanics: [],
  tags: [],
  annotationAccessor: {},
  user: [],
  currentUser: UNKNOWN_CREATOR,
});

const reload = (previous: CardInterface, incoming: CardInterface) =>
  reducer(stateWith([previous]), {
    type: CardActionType.BulkReadCard,
    payload: { cards: [incoming] },
  }).cards[0];

describe('reloading the collection', () => {
  it('keeps a loaded image and the face object of an unchanged card', () => {
    const previous = card({}, LOADED);
    const reloaded = reload(previous, card());
    expect(reloaded.front.cover).toBe(LOADED);
    expect(reloaded.front).toBe(previous.front);
  });

  it('fetches the image again when the card was saved in the meantime', () => {
    const base = card();
    const reloaded = reload(card({}, LOADED), card({ meta: { ...base.meta, lastUpdated: 2 } }));
    expect(reloaded.front.cover).toBe('loading:art.png');
  });

  it('fetches the image again when the cover points at another file', () => {
    expect(reload(card({}, LOADED), card({}, 'loading:other.png')).front.cover).toBe(
      'loading:other.png',
    );
  });

  it('applies changed card text while keeping the loaded image', () => {
    const base = card();
    const reloaded = reload(
      card({}, LOADED),
      card({ front: { ...base.front, cardText: ['Discard a card.'] } }),
    );
    expect(reloaded.front.cardText).toEqual(['Discard a card.']);
    expect(reloaded.front.cover).toBe(LOADED);
  });

  it('adds new cards and keeps cards missing from the response', () => {
    const other = card({ uuid: 'card-2' });
    const { cards } = reducer(stateWith([other]), {
      type: CardActionType.BulkReadCard,
      payload: { cards: [card()] },
    });
    expect(cards.map(({ uuid }) => uuid)).toEqual(['card-2', 'card-1']);
  });
});

describe('storing loaded images', () => {
  const back = { ...card().front, name: 'Back', cover: 'loading' };

  it('applies a batch of images in one update, for both faces of a card', () => {
    const untouched = card({ uuid: 'card-2' });
    const { cards } = reducer(stateWith([card({ back }), untouched]), {
      type: ImageActionType.ReadImages,
      payload: {
        images: [
          { cardUuid: 'card-1', face: 0, base64: 'front-data', name: 'art.png' },
          { cardUuid: 'card-1', face: 1, base64: 'back-data' },
        ],
      },
    });
    expect(cards[0].front.cover).toBe('base64:art.png|front-data');
    expect(cards[0].back?.cover).toBe('base64:back-data');
    expect(cards[1]).toBe(untouched);
  });

  it('does not mutate the previous state', () => {
    const previous = card();
    reducer(stateWith([previous]), {
      type: ImageActionType.ReadImage,
      payload: { cardUuid: 'card-1', face: 0, base64: 'data' },
    });
    expect(previous.front.cover).toBe('loading:art.png');
  });
});
