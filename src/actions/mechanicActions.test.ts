import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('logrocket', () => ({
  default: { log: vi.fn(), error: vi.fn(), identify: vi.fn() },
}));

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('../utils/staticAntd', () => ({
  staticAntd: { message: { success: vi.fn(), error: vi.fn() } },
}));

vi.mock('./errorLog', () => ({
  captureError: vi.fn(),
  ActionTag: { Mechanic: 'mechanic' },
  RequestTag: { Update: 'update', Create: 'create', Get: 'get', Delete: 'delete' },
}));

vi.mock('../utils/accessService', () => ({
  getAccessToken: () => 'test-token',
  deleteAccessToken: vi.fn(),
}));

import axios from 'axios';
import { updateMechanic } from './mechanicActions';
import MechanicInterface from '../interfaces/MechanicInterface';

const makeMechanic = (uuid: string): MechanicInterface => ({
  uuid,
  name: 'Test',
  description: '',
});

describe('updateMechanic', () => {
  beforeEach(() => {
    vi.mocked(axios.put).mockReset();
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
});
