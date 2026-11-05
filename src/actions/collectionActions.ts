import { Action } from '../reducer';
import {
  addAutomaticCardTags,
  normalizeCardManaCosts,
  refreshCollection,
  removeUnknownCardTags,
} from './cardActions';
import { getMechanics } from './mechanicActions';
import { getTags } from './tagActions';

export const loadCollection = async (dispatch: (value: Action) => void): Promise<void> => {
  const [collectionLoaded, mechanics, tags] = await Promise.all([
    refreshCollection(dispatch),
    getMechanics(dispatch),
    getTags(dispatch),
  ]);

  if (!collectionLoaded) return;

  await normalizeCardManaCosts(dispatch);

  if (!mechanics) return;

  // Removing tags is destructive: a failed request or an empty tag catalogue says nothing about
  // which tags really exist, so only clean up against a complete, successful load.
  if (tags?.length) await removeUnknownCardTags(dispatch, tags, mechanics);

  // Runs after the cleanup so a card needing both sees the cleaned tags. Adding only needs the
  // cards and mechanics, so it still runs without a tag catalogue.
  await addAutomaticCardTags(dispatch, mechanics);
};
