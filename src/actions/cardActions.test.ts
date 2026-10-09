import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('logrocket', () => ({
  default: { log: vi.fn(), error: vi.fn(), identify: vi.fn() },
}));

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('./imageActions', () => ({
  createImage: vi.fn(),
  getImage: vi.fn(),
}));

vi.mock('../utils/staticAntd', () => ({
  staticAntd: { message: { success: vi.fn(), error: vi.fn() } },
}));

vi.mock('./errorLog', () => ({
  captureError: vi.fn(),
  ActionTag: { Card: 'card' },
  RequestTag: { Update: 'update', Create: 'create', Get: 'get', Delete: 'delete' },
}));

vi.mock('../utils/accessService', () => ({
  getAccessToken: () => 'test-token',
  deleteAccessToken: vi.fn(),
}));

import axios from 'axios';
import { updateCard } from './cardActions';
import CardInterface from '../interfaces/CardInterface';
import { CardType, CardState, RarityType } from '../interfaces/enums';
import { UNKNOWN_CREATOR } from '../utils/constants';

const makeCard = (uuid: string): CardInterface => ({
  name: 'Test',
  uuid,
  manaCost: '',
  rarity: RarityType.Common,
  front: { name: 'Test', cardTypes: [CardType.Creature], cardText: [] },
  creator: UNKNOWN_CREATOR,
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: 0,
    createdAt: 0,
    state: CardState.Draft,
  },
});

describe('updateCard', () => {
  beforeEach(() => {
    vi.mocked(axios.put).mockReset();
  });

  it('does not send the Mongo-internal _id field in the update payload', async () => {
    // A freshly-created card held in memory from the POST response carries
    // Mongo's `_id`. Sending it back makes replaceOne reject the update with
    // "immutable field '_id' was found to have been altered".
    const card = {
      ...makeCard('uuid-1'),
      _id: '6abd7b0f36b7ed300aee2ac6',
      __v: 0,
    } as CardInterface;

    vi.mocked(axios.put).mockResolvedValue({ data: { card: makeCard('uuid-1') } });

    await updateCard(() => {}, card);

    expect(axios.put).toHaveBeenCalledTimes(1);
    const body = vi.mocked(axios.put).mock.calls[0][1] as { card: Record<string, unknown> };

    // The identifier the app actually uses must still be present...
    expect(body.card.uuid).toBe('uuid-1');
    // ...but the immutable Mongo fields must be stripped.
    expect(body.card._id).toBeUndefined();
    expect(body.card.__v).toBeUndefined();
  });
});
