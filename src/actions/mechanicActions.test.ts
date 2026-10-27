import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('../utils/staticAntd', () => ({
  staticAntd: { message: { success: vi.fn(), error: vi.fn() } },
}));

vi.mock('../utils/accessService', () => ({
  getAccessToken: () => 'test-token',
  deleteAccessToken: vi.fn(),
}));

vi.mock('./tagActions', () => ({
  createTag: vi.fn(),
}));

vi.mock('./cardActions', () => ({
  updateCard: vi.fn(),
}));

import axios from 'axios';
import { createMechanic, syncCardsWithMechanic, updateMechanic } from './mechanicActions';
import { createTag } from './tagActions';
import { updateCard } from './cardActions';
import MechanicInterface from '../interfaces/MechanicInterface';

const makeMechanic = (uuid: string): MechanicInterface => ({
  uuid,
  name: 'Test',
  description: '',
});

describe('updateMechanic', () => {
  beforeEach(() => {
    vi.mocked(axios.put).mockReset();
    vi.mocked(axios.post).mockReset();
    vi.mocked(createTag).mockReset();
    vi.mocked(updateCard).mockReset().mockResolvedValue({});
  });

  it('creates a tag when updating a mechanic with a non-empty name', async () => {
    const mechanic = makeMechanic('uuid-1');
    vi.mocked(axios.put).mockResolvedValue({ data: { mechanic } });

    updateMechanic(() => {}, mechanic);
    await Promise.resolve();

    expect(createTag).toHaveBeenCalledWith(expect.any(Function), 'Test');
  });

  it('reports successful persistence after updating the store', async () => {
    const mechanic = makeMechanic('uuid-1');
    const dispatch = vi.fn();
    vi.mocked(axios.put).mockResolvedValue({ data: { mechanic } });
    expect(await updateMechanic(dispatch, mechanic)).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { mechanic } }));
  });

  it('reports failed persistence so the editor can retry', async () => {
    vi.mocked(axios.put).mockRejectedValue(new Error('offline'));
    expect(await updateMechanic(() => {}, makeMechanic('uuid-1'))).toBe(false);
  });

  it('creates a tag when creating a mechanic with a non-empty returned name', async () => {
    const mechanic = makeMechanic('uuid-1');
    vi.mocked(axios.post).mockResolvedValue({ data: { mechanic } });

    createMechanic(() => {});
    await Promise.resolve();

    expect(createTag).toHaveBeenCalledWith(expect.any(Function), 'Test');
  });

  it('does not create a tag for an empty mechanic name', async () => {
    const mechanic = { ...makeMechanic('uuid-1'), name: '' };
    vi.mocked(axios.put).mockResolvedValue({ data: { mechanic } });

    updateMechanic(() => {}, mechanic);
    await Promise.resolve();

    expect(createTag).not.toHaveBeenCalled();
  });

  it('does not send the Mongo-internal _id field in the update payload', async () => {
    // A freshly-created mechanic held in memory from the POST response carries
    // Mongo's `_id`. Sending it back makes replaceOne reject the update with
    // "immutable field '_id' was found to have been altered".
    const mechanic = {
      ...makeMechanic('uuid-1'),
      _id: '6abd7b0f36b7ed300aee2ac6',
      __v: 0,
    } as MechanicInterface;

    vi.mocked(axios.put).mockResolvedValue({ data: { mechanic: makeMechanic('uuid-1') } });

    await updateMechanic(() => {}, mechanic);

    expect(axios.put).toHaveBeenCalledTimes(1);
    const body = vi.mocked(axios.put).mock.calls[0][1] as {
      mechanic: Record<string, unknown>;
    };

    // The identifier the app actually uses must still be present...
    expect(body.mechanic.uuid).toBe('uuid-1');
    // ...but the immutable Mongo fields must be stripped.
    expect(body.mechanic._id).toBeUndefined();
    expect(body.mechanic.__v).toBeUndefined();
  });

  it('updates cards that use a newly available mechanic', () => {
    const card = {
      uuid: 'card-1',
      tags: [],
      front: { name: 'Card', cardTypes: [], cardText: ['[Test]'] },
    } as never;

    syncCardsWithMechanic(() => {}, [card], makeMechanic('uuid-1'));

    expect(updateCard).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ uuid: 'card-1', tags: ['Test'] }),
    );
  });
});
