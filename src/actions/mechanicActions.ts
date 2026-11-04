import axios from 'axios';
import isEqual from 'lodash/isEqual';

import { Action, MechanicActionType } from '../reducer';

import { getAccessToken } from '../utils/accessService';
import MechanicInterface from '../interfaces/MechanicInterface';
import CardInterface from '../interfaces/CardInterface';
import { staticAntd } from '../utils/staticAntd';
import { createTag } from './tagActions';
import { updateCard } from './cardActions';
import { getCardTags } from '../utils/cardTags';

const MIDDLEWARE_ENDPOINT = import.meta.env.PROD ? '' : 'http://localhost:8080';

export const syncCardsWithMechanic = (
  dispatch: (value: Action) => void,
  cards: CardInterface[],
  mechanic: MechanicInterface,
  mechanics: MechanicInterface[] = [],
) => {
  if (!mechanic.name.trim()) return;

  // The other mechanics matter too: saving this one can change which of them a card references.
  const catalogue = [...mechanics.filter(other => other.uuid !== mechanic.uuid), mechanic];

  cards.forEach(card => {
    const tags = getCardTags(card, catalogue);
    if (isEqual(tags, card.tags || [])) return;

    updateCard(dispatch, { ...card, tags }).catch(() => {});
  });
};

export const getMechanics = (
  dispatch: (value: Action) => void,
): Promise<MechanicInterface[] | undefined> => {
  const request = `${MIDDLEWARE_ENDPOINT}/mechanics`;
  const args = { params: { accessKey: getAccessToken() } };
  return axios
    .get(request, args)
    .then(result => {
      dispatch({
        type: MechanicActionType.GetMechanics,
        payload: { mechanics: result.data.mechanics },
      });
      return result.data.mechanics as MechanicInterface[];
    })
    .catch(() => undefined);
};

export const createMechanic = (dispatch: (value: Action) => void, cards: CardInterface[] = []) => {
  const request = `${MIDDLEWARE_ENDPOINT}/mechanics`;
  const args = { accessKey: getAccessToken() };

  axios
    .post(request, args)
    .then(result => {
      if (result.data.mechanic.name.trim()) createTag(dispatch, result.data.mechanic.name);
      syncCardsWithMechanic(dispatch, cards, result.data.mechanic);
      return dispatch({
        type: MechanicActionType.CreateMechanic,
        payload: {
          mechanic: result.data.mechanic,
        },
      });
    })
    .catch(_error => {
      staticAntd.message.error("Couldn't create the mechanic. Please try again.");
    });
};

export const updateMechanic = (
  dispatch: (value: Action) => void,
  updated: MechanicInterface,
  cards: CardInterface[] = [],
  mechanics: MechanicInterface[] = [],
) => {
  const request = `${MIDDLEWARE_ENDPOINT}/mechanics`;
  const parsed = { ...updated };
  // `_id`/`__v` are Mongo-internal fields that ride along on mechanics held in
  // memory from the server (notably freshly POST-created ones). Sending them
  // back in the PUT makes MongoDB's replaceOne reject the update ("immutable
  // field '_id' was found to have been altered"), which is why updating a
  // mechanic right after creating it fails. The app keys mechanics by `uuid`,
  // so drop them.
  delete (parsed as Record<string, unknown>)._id;
  delete (parsed as Record<string, unknown>).__v;
  return axios
    .put(request, { mechanic: parsed, accessKey: getAccessToken() })
    .then(result => {
      if (result.data.mechanic.name.trim()) createTag(dispatch, result.data.mechanic.name);
      syncCardsWithMechanic(dispatch, cards, result.data.mechanic, mechanics);
      dispatch({
        type: MechanicActionType.UpdateMechanic,
        payload: {
          mechanic: result.data.mechanic,
        },
      });
      return true;
    })
    .catch(_error => {
      staticAntd.message.error("Couldn't update the mechanic. Please try again.");
      return false;
    });
};
