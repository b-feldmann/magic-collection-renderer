import { Action } from '../reducer';
import { refreshCollection, removeUnknownCardTags } from './cardActions';
import { getMechanics } from './mechanicActions';
import { getTags } from './tagActions';

export const loadCollection = async (dispatch: (value: Action) => void): Promise<void> => {
  const [collectionLoaded, mechanics, tags] = await Promise.all([
    refreshCollection(dispatch),
    getMechanics(dispatch),
    getTags(dispatch),
  ]);

  // Removing tags is destructive: a failed request or an empty tag catalogue says nothing about
  // which tags really exist, so only clean up against a complete, successful load.
  if (!collectionLoaded || !mechanics || !tags?.length) return;

  await removeUnknownCardTags(dispatch, tags, mechanics);
};
