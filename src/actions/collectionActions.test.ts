import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./cardActions', () => ({
  refreshCollection: vi.fn(),
  removeUnknownCardTags: vi.fn(),
}));

vi.mock('./mechanicActions', () => ({
  getMechanics: vi.fn(),
}));

vi.mock('./tagActions', () => ({
  getTags: vi.fn(),
}));

import { loadCollection } from './collectionActions';
import { refreshCollection, removeUnknownCardTags } from './cardActions';
import { getMechanics } from './mechanicActions';
import { getTags } from './tagActions';

const mechanics = [{ uuid: 'mechanic-1', name: 'Flying', description: '' }];

describe('loadCollection', () => {
  const dispatch = vi.fn();

  beforeEach(() => {
    vi.mocked(refreshCollection).mockReset().mockResolvedValue(true);
    vi.mocked(getMechanics).mockReset().mockResolvedValue(mechanics);
    vi.mocked(getTags).mockReset().mockResolvedValue(['Combo']);
    vi.mocked(removeUnknownCardTags).mockReset().mockResolvedValue();
  });

  it('removes unknown tags once cards, mechanics and tags have loaded', async () => {
    await loadCollection(dispatch);

    expect(removeUnknownCardTags).toHaveBeenCalledWith(dispatch, ['Combo'], mechanics);
  });

  it.each([
    ['the collection', () => vi.mocked(refreshCollection).mockResolvedValue(false)],
    ['the mechanics', () => vi.mocked(getMechanics).mockResolvedValue(undefined)],
    ['the tags', () => vi.mocked(getTags).mockResolvedValue(undefined)],
  ])('keeps every tag when %s could not be loaded', async (_name, failRequest) => {
    failRequest();

    await loadCollection(dispatch);

    expect(removeUnknownCardTags).not.toHaveBeenCalled();
  });

  it('keeps every tag when the tag catalogue is empty', async () => {
    vi.mocked(getTags).mockResolvedValue([]);

    await loadCollection(dispatch);

    expect(removeUnknownCardTags).not.toHaveBeenCalled();
  });
});
