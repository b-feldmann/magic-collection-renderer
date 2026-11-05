import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./cardActions', () => ({
  addAutomaticCardTags: vi.fn(),
  normalizeCardManaCosts: vi.fn(),
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
import {
  addAutomaticCardTags,
  normalizeCardManaCosts,
  refreshCollection,
  removeUnknownCardTags,
} from './cardActions';
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
    vi.mocked(addAutomaticCardTags).mockReset().mockResolvedValue();
    vi.mocked(normalizeCardManaCosts).mockReset().mockResolvedValue();
  });

  it('corrects mana costs even when the mechanics could not be loaded', async () => {
    vi.mocked(getMechanics).mockResolvedValue(undefined);

    await loadCollection(dispatch);

    expect(normalizeCardManaCosts).toHaveBeenCalledWith(dispatch);
  });

  it('corrects no mana costs when the collection could not be loaded', async () => {
    vi.mocked(refreshCollection).mockResolvedValue(false);

    await loadCollection(dispatch);

    expect(normalizeCardManaCosts).not.toHaveBeenCalled();
  });

  it('adds missing automatic tags after removing unknown ones', async () => {
    await loadCollection(dispatch);

    expect(addAutomaticCardTags).toHaveBeenCalledWith(dispatch, mechanics);
    expect(vi.mocked(removeUnknownCardTags).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(addAutomaticCardTags).mock.invocationCallOrder[0],
    );
  });

  it.each([
    ['the collection', () => vi.mocked(refreshCollection).mockResolvedValue(false)],
    ['the mechanics', () => vi.mocked(getMechanics).mockResolvedValue(undefined)],
  ])('adds no tags when %s could not be loaded', async (_name, failRequest) => {
    failRequest();

    await loadCollection(dispatch);

    expect(addAutomaticCardTags).not.toHaveBeenCalled();
  });

  it.each([
    ['could not be loaded', undefined],
    ['is empty', []],
  ])('still adds automatic tags when the tag catalogue %s', async (_name, tags) => {
    vi.mocked(getTags).mockResolvedValue(tags);

    await loadCollection(dispatch);

    expect(addAutomaticCardTags).toHaveBeenCalledWith(dispatch, mechanics);
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
