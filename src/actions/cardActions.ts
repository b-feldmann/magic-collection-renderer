import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';

import dayjs from 'dayjs';
import { Action, CardActionType } from '../reducer';
import { CardType, CardState, RarityType } from '../interfaces/enums';

import CardInterface from '../interfaces/CardInterface';
import { deriveLegacyMainType } from '../utils/cardTypes';
import { getVariantFamily, withLatestVariantIds } from '../utils/cardVariants';
import { getAccessToken, deleteAccessToken } from '../utils/accessService';
import { UNKNOWN_CREATOR } from '../utils/constants';
import UserInterface from '../interfaces/UserInterface';
import { createImage, getImage } from './imageActions';
import { staticAntd } from '../utils/staticAntd';
import {
  getCoverFileName,
  getCoverImageData,
  isLoadingCover,
  toLoadingCover,
} from '../utils/cover';

const MIDDLEWARE_ENDPOINT = import.meta.env.PROD ? '' : 'http://localhost:8080';

type Dispatch = (value: Action) => void;
interface CardMutations {
  pending: Promise<void>;
  saved: Map<string, CardInterface>;
  deleted: Set<string>;
}

// The editor and modal share a store but may have independently pending saves.
// Serialize mutations per store and retain authoritative membership for stale drafts.
const mutationsByStore = new WeakMap<Dispatch, CardMutations>();
const mutateCards = <T>(
  dispatch: Dispatch,
  operation: (state: CardMutations) => Promise<T>,
): Promise<T> => {
  let state = mutationsByStore.get(dispatch);
  if (!state) {
    state = { pending: Promise.resolve(), saved: new Map(), deleted: new Set() };
    mutationsByStore.set(dispatch, state);
  }
  const current = state;
  const result = current.pending.then(() => operation(current));
  current.pending = result.then(
    () => {},
    () => {},
  );
  return result;
};

const rememberCard = (state: CardMutations, card: CardInterface) => {
  state.saved.set(card.uuid, cloneDeep(card));
};

const currentCollection = (state: CardMutations, cards: CardInterface[]): CardInterface[] => {
  const byId = new Map(cards.map(card => [card.uuid, card]));
  state.saved.forEach(card => byId.set(card.uuid, card));
  state.deleted.forEach(id => byId.delete(id));
  return [...byId.values()];
};

export const EMPTY_CARD = (): CardInterface => ({
  name: '',
  uuid: uuidv4(),
  front: {
    name: '',
    cardTypes: [CardType.Creature],
    cardText: [],
  },
  manaCost: '',
  rarity: RarityType.Common,
  favorite: false,
  tags: [],
  creator: UNKNOWN_CREATOR,
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: dayjs().valueOf(),
    createdAt: dayjs().valueOf(),
    state: CardState.Draft,
  },
});

export const refreshCollection = (dispatch: (value: Action) => void) => {
  dispatch({
    type: CardActionType.RefreshCollection,
  });

  const request = `${MIDDLEWARE_ENDPOINT}/cards`;
  const args = { params: { accessKey: getAccessToken() } };
  mutateCards(dispatch, async state => {
    const result = await axios.get(request, args);
    state.saved.clear();
    state.deleted.clear();
    result.data.cards.forEach((card: CardInterface) => rememberCard(state, card));
    // result.data.cards.forEach((card: CardInterface) => {
    //   if (!card.createdAt) {
    //     card.createdAt = moment().valueOf();
    //     updateCard(dispatch, card);
    //   }
    // });

    dispatch({
      type: CardActionType.BulkReadCard,
      payload: { cards: result.data.cards },
    });
  }).catch(error => {
    if (error.response) {
      const { response } = error;
      if (response.status && response.status === 401) {
        deleteAccessToken();
        staticAntd.message.error(
          'Wrong access token! You are not authorized to use this service :(',
          3,
        );
        return;
      }
    }

    staticAntd.message.error("Could'nt load collection. Maybe you access token is wrong.");
  });
};

export const createCard = (dispatch: (value: Action) => void, creator: UserInterface) => {
  const request = `${MIDDLEWARE_ENDPOINT}/cards`;
  const args = { accessKey: getAccessToken(), creator };

  mutateCards(dispatch, async state => {
    const result = await axios.post(request, args);
    rememberCard(state, result.data.card);
    return dispatch({
      type: CardActionType.CreateCard,
      payload: {
        card: result.data.card,
      },
    });
  }).catch(_error => {
    staticAntd.message.error('Failed creating a new card :(');
  });
};

const prepareCard = async (updated: CardInterface, uploadImages = true): Promise<CardInterface> => {
  const parsed = { ...updated };
  // `_id`/`__v` are Mongo-internal fields that ride along on cards held in
  // memory from the server (notably freshly POST-created ones). Sending them
  // back in the PUT makes MongoDB's replaceOne reject the update ("immutable
  // field '_id' was found to have been altered"), which is why saving a card
  // right after creating it fails. The app keys cards by `uuid`, so drop them.
  delete (parsed as Record<string, unknown>)._id;
  delete (parsed as Record<string, unknown>).__v;
  parsed.front = { ...parsed.front, cardMainType: deriveLegacyMainType(parsed.front) };
  if (parsed.back) {
    parsed.back = { ...parsed.back, cardMainType: deriveLegacyMainType(parsed.back) };
  }
  if (updated.front.cover && updated.front.cover.startsWith('base64:')) {
    const name = getCoverFileName(updated.front.cover);
    if (uploadImages)
      await createImage(() => {}, getCoverImageData(updated.front.cover), name, updated, 0);
    // The image data lives in the images collection; the file name rides
    // along on the cover so the editor can show it after a reload.
    parsed.front.cover = toLoadingCover(name);
  }
  if (
    updated.back &&
    parsed.back &&
    updated.back.cover &&
    updated.back.cover.startsWith('base64:')
  ) {
    const name = getCoverFileName(updated.back.cover);
    if (uploadImages)
      await createImage(() => {}, getCoverImageData(updated.back.cover), name, updated, 1);
    parsed.back.cover = toLoadingCover(name);
  }

  return parsed;
};

// Keep multi-card operations private until every write has succeeded.
const persistCard = async (updated: CardInterface, uploadImages = true): Promise<CardInterface> => {
  const request = `${MIDDLEWARE_ENDPOINT}/cards`;
  const parsed = await prepareCard(updated, uploadImages);
  const result = await axios.put(request, { card: parsed, accessKey: getAccessToken() });
  return result.data.card;
};

interface CardChanges {
  set: Record<string, unknown>;
  unset: string[];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;

const diffCard = (previous: CardInterface | undefined, next: CardInterface): CardChanges => {
  const changes: CardChanges = { set: {}, unset: [] };
  const ignoredPaths = new Set([
    'uuid',
    '_id',
    '__v',
    'loading',
    'meta.likes',
    'meta.dislikes',
    'meta.lastUpdated',
  ]);

  const visit = (before: unknown, after: unknown, path: string) => {
    if (ignoredPaths.has(path)) return;
    if (
      path === '' ||
      (isPlainObject(before) && isPlainObject(after)) ||
      (before === undefined && isPlainObject(after))
    ) {
      const previousObject = isPlainObject(before) ? before : {};
      const nextObject = isPlainObject(after) ? after : {};
      const keys = new Set([...Object.keys(previousObject), ...Object.keys(nextObject)]);
      keys.forEach(key => {
        const childPath = path ? `${path}.${key}` : key;
        visit(previousObject[key], nextObject[key], childPath);
      });
      return;
    }
    if (after === undefined) {
      if (before !== undefined) changes.unset.push(path);
      return;
    }
    if (!isEqual(before, after)) changes.set[path] = after;
  };

  visit(previous, next, '');
  return changes;
};

const publishCard = (dispatch: Dispatch, state: CardMutations, card: CardInterface) => {
  rememberCard(state, card);
  // `loading`/`loading:<name>` covers point at the images collection.
  if (isLoadingCover(card.front.cover)) {
    getImage(dispatch, card, 0);
  }
  if (card.back && isLoadingCover(card.back.cover)) {
    getImage(dispatch, card, 1);
  }
  return dispatch({
    type: CardActionType.UpdateCard,
    payload: { card },
  });
};

export const refreshCard = (dispatch: Dispatch, cardUuid: string): Promise<CardInterface> =>
  mutateCards(dispatch, async state => {
    if (state.deleted.has(cardUuid)) throw new Error('This card has been deleted');
    const result = await axios.get(`${MIDDLEWARE_ENDPOINT}/cards/${cardUuid}`, {
      params: { accessKey: getAccessToken() },
    });
    const card = result.data.card as CardInterface | undefined;
    if (!card) throw new Error(`Card ${cardUuid} was not found`);
    publishCard(dispatch, state, card);
    return card;
  }).catch(error => {
    staticAntd.message.error("Could'nt reload the card");
    throw error;
  });

export const updateCard = (
  dispatch: (value: Action) => void,
  updated: CardInterface,
): Promise<unknown> => {
  const snapshot = cloneDeep(updated);
  return mutateCards(dispatch, async state => {
    if (state.deleted.has(snapshot.uuid)) throw new Error('This card has been deleted');
    const latest = state.saved.get(snapshot.uuid);
    const draft = latest ? withLatestVariantIds(snapshot, [latest]) : snapshot;
    const prepared = await prepareCard(draft);
    const { set, unset } = diffCard(latest, prepared);
    const result = await axios.patch(`${MIDDLEWARE_ENDPOINT}/cards/${snapshot.uuid}`, {
      accessKey: getAccessToken(),
      set,
      unset,
    });
    return publishCard(dispatch, state, result.data.card);
  }).catch(error => {
    staticAntd.message.error("Could'nt update the card");
    throw error;
  });
};

export const updateCardRating = (
  dispatch: (value: Action) => void,
  cardUuid: string,
  userUuid: string,
  rating: 'like' | 'dislike' | null,
): Promise<unknown> =>
  mutateCards(dispatch, async state => {
    if (state.deleted.has(cardUuid)) throw new Error('This card has been deleted');
    const result = await axios.put(`${MIDDLEWARE_ENDPOINT}/cards/${cardUuid}/rating`, {
      accessKey: getAccessToken(),
      userUuid,
      rating,
    });
    return publishCard(dispatch, state, result.data.card);
  }).catch(error => {
    staticAntd.message.error("Could'nt update the card");
    throw error;
  });

const removeCard = (uuid: string) =>
  axios.delete(`${MIDDLEWARE_ENDPOINT}/cards/${uuid}`, { params: { accessKey: getAccessToken() } });

// Restoring an attempted write also covers a server write whose response was lost.
const restoreCards = async (cards: CardInterface[]): Promise<boolean> => {
  const results = await Promise.allSettled(cards.map(card => persistCard(card, false)));
  return results.every(result => result.status === 'fulfilled');
};

const withLocalArt = (saved: CardInterface, snapshot: CardInterface): CardInterface => {
  const card = cloneDeep(saved);
  if (snapshot.front.cover?.startsWith('base64:')) card.front.cover = snapshot.front.cover;
  if (card.back && snapshot.back?.cover?.startsWith('base64:')) {
    card.back.cover = snapshot.back.cover;
  }
  return card;
};

export const createCardVariant = (
  dispatch: (value: Action) => void,
  source: CardInterface,
  cards: CardInterface[],
  creator: UserInterface,
): Promise<void> => {
  const draft = cloneDeep(source);
  const collectionSnapshot = cloneDeep(cards);
  return mutateCards(dispatch, async state => {
    let allocatedId: string | undefined;
    const attempted: CardInterface[] = [];
    try {
      if (state.deleted.has(source.uuid)) throw new Error('The source card has been deleted');
      const allocation = await axios.post(`${MIDDLEWARE_ENDPOINT}/cards`, {
        accessKey: getAccessToken(),
        creator,
      });
      allocatedId = allocation.data.card.uuid;
      if (!allocatedId) throw new Error('Missing allocated card ID');
      const collection = currentCollection(state, collectionSnapshot);
      const storedSource = collection.find(card => card.uuid === source.uuid) || draft;
      const family = getVariantFamily(storedSource, collection);
      const copy = cloneDeep(draft);
      copy.uuid = allocatedId;
      copy.creator = cloneDeep(creator);
      copy.favorite = false;
      copy.loading = false;
      copy.meta = EMPTY_CARD().meta;
      copy.variantIds = family.map(card => card.uuid);

      // Image records belong to the source ID, not to the loading-cover string.
      for (const face of [0, 1] as const) {
        const cardFace = face === 0 ? copy.front : copy.back;
        if (!cardFace || !isLoadingCover(cardFace.cover)) continue;
        const result = await axios.get(`${MIDDLEWARE_ENDPOINT}/images`, {
          params: { accessKey: getAccessToken(), cardUuid: source.uuid, face },
        });
        if (!result.data?.base64) throw new Error('Source image is missing');
        const name = getCoverFileName(cardFace.cover);
        cardFace.cover = `base64:${name ? `${name}|` : ''}${result.data.base64}`;
      }

      const savedCopy = withLocalArt(await persistCard(copy), copy);
      const savedFamily: CardInterface[] = [];
      const ids = [...copy.variantIds, allocatedId];
      for (const member of family) {
        // Only membership changes on existing cards. Draft art/content belongs to the copy.
        attempted.push(member);
        const updated = { ...member, variantIds: ids.filter(id => id !== member.uuid) };
        savedFamily.push(withLocalArt(await persistCard(updated, false), updated));
      }
      savedFamily.forEach(card => rememberCard(state, card));
      rememberCard(state, savedCopy);
      savedFamily.forEach(card => dispatch({ type: CardActionType.UpdateCard, payload: { card } }));
      dispatch({ type: CardActionType.CreateCard, payload: { card: savedCopy } });
    } catch (error) {
      const restored = await restoreCards(attempted);
      const removed = allocatedId
        ? (await Promise.allSettled([removeCard(allocatedId)]))[0].status === 'fulfilled'
        : true;
      staticAntd.message.error(
        restored && removed
          ? 'Could not create the variant. No variant was selected.'
          : 'Variant recovery was incomplete. Refresh the collection before editing further.',
      );
      throw error;
    }
  });
};

export const deleteCard = (
  dispatch: (value: Action) => void,
  uuid: string,
  cards: CardInterface[] = [],
): Promise<void> => {
  const snapshot = cloneDeep(cards);
  return mutateCards(dispatch, async state => {
    const collection = currentCollection(state, snapshot);
    const target = collection.find(card => card.uuid === uuid);
    const family = target ? getVariantFamily(target, collection) : [];
    const attempted: CardInterface[] = [];
    const saved: CardInterface[] = [];
    try {
      for (const member of family) {
        if (member.uuid === uuid) continue;
        attempted.push(member);
        const updated = {
          ...member,
          variantIds: (member.variantIds || []).filter(id => id !== uuid),
        };
        saved.push(withLocalArt(await persistCard(updated, false), updated));
      }
      await removeCard(uuid);
      saved.forEach(card => rememberCard(state, card));
      state.saved.delete(uuid);
      state.deleted.add(uuid);
      saved.forEach(card => dispatch({ type: CardActionType.UpdateCard, payload: { card } }));
      dispatch({ type: CardActionType.DeleteCard, payload: { uuid } });
    } catch (error) {
      const restored = await restoreCards(attempted);
      staticAntd.message.error(
        restored
          ? 'Could not delete the card. Refresh the collection before trying again.'
          : 'Deletion recovery was incomplete. Refresh the collection before editing further.',
      );
      throw error;
    }
  });
};
