import CardInterface from './interfaces/CardInterface';
import MechanicInterface from './interfaces/MechanicInterface';
import AnnotationInterface from './interfaces/AnnotationInterface';
import AnnotationAccessorInterface from './interfaces/AnnotationAccessorInterface';
import UserInterface from './interfaces/UserInterface';
import { UNKNOWN_CREATOR } from './utils/constants';
import { normalizeCard } from './utils/cardTypes';
import { keepLoadedCover } from './utils/cover';
import CardFaceInterface from './interfaces/CardFaceInterface';
import isEqual from 'lodash/isEqual';

export enum ImageActionType {
  CreateImage = 'create-image',
  ReadImage = 'read-image',
  ReadImages = 'read-images',
}

export interface ImagePayload {
  base64: string;
  name?: string;
  cardUuid: string;
  face: number;
}

export enum CardActionType {
  RefreshCollection = 'refresh-collection',
  CreateCard = 'create-card',
  BulkReadCard = 'bulk-read-card',
  ReadCard = 'read-card',
  UpdateCard = 'update-card',
  DeleteCard = 'delete-card',
}

export enum MechanicActionType {
  GetMechanics = 'get-mechanics',
  CreateMechanic = 'create-mechanic',
  UpdateMechanic = 'update-mechanic',
  DeleteMechanic = 'delete-mechanic',
}

export enum TagActionType {
  GetTags = 'get-tags',
  CreateTag = 'create-tag',
}

export enum AnnotationActionType {
  GetAnnotations = 'get-annotations',
  CreateAnnotation = 'create-annotation',
  UpdateAnnotation = 'update-annotation',
  DeleteAnnotation = 'delete-annotation',
}

export enum UserActionType {
  GetUser = 'get-user',
  UpdateUser = 'update-user',
  SetCurrentUser = 'set-current-user',
}

type State = {
  cards: CardInterface[];
  mechanics: MechanicInterface[];
  tags: string[];
  annotationAccessor: AnnotationAccessorInterface;
  user: UserInterface[];
  newUuid?: string;
  currentUser: UserInterface;
};

export type Action =
  | { type: CardActionType.RefreshCollection }
  | { type: CardActionType.CreateCard; payload: { card: CardInterface } }
  | { type: CardActionType.BulkReadCard; payload: { cards: CardInterface[] } }
  | { type: CardActionType.ReadCard; payload: { card: CardInterface } }
  | { type: CardActionType.UpdateCard; payload: { card: CardInterface } }
  | { type: CardActionType.DeleteCard; payload: { uuid: string } }
  | { type: MechanicActionType.GetMechanics; payload: { mechanics: MechanicInterface[] } }
  | { type: MechanicActionType.CreateMechanic; payload: { mechanic: MechanicInterface } }
  | { type: MechanicActionType.UpdateMechanic; payload: { mechanic: MechanicInterface } }
  | { type: MechanicActionType.DeleteMechanic; payload: { uuid: string } }
  | { type: TagActionType.GetTags; payload: { tags: string[] } }
  | { type: TagActionType.CreateTag; payload: { tag: string } }
  | { type: AnnotationActionType.GetAnnotations; payload: { annotations: AnnotationInterface[] } }
  | { type: AnnotationActionType.CreateAnnotation; payload: { annotation: AnnotationInterface } }
  | { type: AnnotationActionType.UpdateAnnotation; payload: { annotation: AnnotationInterface } }
  | { type: AnnotationActionType.DeleteAnnotation; payload: { uuid: string } }
  | { type: UserActionType.GetUser; payload: { user: UserInterface[] } }
  | { type: UserActionType.UpdateUser; payload: { user: UserInterface } }
  | { type: UserActionType.SetCurrentUser; payload: { user: UserInterface } }
  | { type: ImageActionType.CreateImage; payload: ImagePayload }
  | { type: ImageActionType.ReadImage; payload: ImagePayload }
  | { type: ImageActionType.ReadImages; payload: { images: ImagePayload[] } };

const withImage = (card: CardInterface, image: ImagePayload): CardInterface => {
  // The persisted file name is kept with the cover value so the editor
  // can show it after a reload (see utils/cover.ts).
  const cover = image.name ? `base64:${image.name}|${image.base64}` : `base64:${image.base64}`;

  return image.face === 1 && card.back
    ? { ...card, back: { ...card.back, cover } }
    : { ...card, front: { ...card.front, cover } };
};

// Keeps the previous face object when nothing changed, so the card's memoized
// render is skipped, and keeps an image that is already loaded unless the card
// was saved since (`unchanged` is false) or points at another file.
const mergeReloadedFace = (
  previous: CardFaceInterface | undefined,
  incoming: CardFaceInterface,
  unchanged: boolean,
): CardFaceInterface => {
  const cover = unchanged ? keepLoadedCover(previous?.cover, incoming.cover) : incoming.cover;
  const merged = cover === incoming.cover ? incoming : { ...incoming, cover };
  return previous && isEqual(previous, merged) ? previous : merged;
};

const mergeReloadedCard = (
  previous: CardInterface | undefined,
  incoming: CardInterface,
): CardInterface => {
  if (!previous) return incoming;
  const unchanged = previous.meta.lastUpdated === incoming.meta.lastUpdated;
  return {
    ...incoming,
    front: mergeReloadedFace(previous.front, incoming.front, unchanged),
    back: incoming.back && mergeReloadedFace(previous.back, incoming.back, unchanged),
  };
};

const reducer: React.Reducer<State, Action> = (state, action) => {
  let annotationAccessor: AnnotationAccessorInterface;

  switch (action.type) {
    case CardActionType.RefreshCollection:
      return {
        ...state,
        cards: state.cards.map(card => ({ ...card, loading: true })),
      };
    case CardActionType.CreateCard:
      return {
        ...state,
        cards: [...state.cards, normalizeCard(action.payload.card)],
        newUuid: action.payload.card.uuid,
      };
    case CardActionType.ReadCard:
      return {
        ...state,
        cards: [
          ...state.cards.filter(card => card.uuid !== action.payload.card.uuid),
          normalizeCard(action.payload.card),
        ],
      };
    case CardActionType.BulkReadCard: {
      const previousCards = new Map(state.cards.map(card => [card.uuid, card]));
      const incomingIds = new Set(action.payload.cards.map(card => card.uuid));
      return {
        ...state,
        cards: [
          ...state.cards.filter(card => !incomingIds.has(card.uuid)),
          ...action.payload.cards.map(card =>
            mergeReloadedCard(previousCards.get(card.uuid), normalizeCard(card)),
          ),
        ],
      };
    }
    case CardActionType.UpdateCard:
      return {
        ...state,
        cards: [
          ...state.cards.filter(card => card.uuid !== action.payload.card.uuid),
          normalizeCard(action.payload.card),
        ],
      };
    case CardActionType.DeleteCard:
      return {
        ...state,
        cards: state.cards
          .filter(card => card.uuid !== action.payload.uuid)
          .map(card =>
            card.variantIds
              ? { ...card, variantIds: card.variantIds.filter(id => id !== action.payload.uuid) }
              : card,
          ),
      };

    case MechanicActionType.GetMechanics:
      return {
        ...state,
        mechanics: action.payload.mechanics,
      };
    case MechanicActionType.CreateMechanic:
      return {
        ...state,
        mechanics: [...state.mechanics, action.payload.mechanic],
      };
    case MechanicActionType.UpdateMechanic:
      return {
        ...state,
        mechanics: [
          ...state.mechanics.filter(mechanic => mechanic.uuid !== action.payload.mechanic.uuid),
          action.payload.mechanic,
        ],
      };
    case MechanicActionType.DeleteMechanic:
      return {
        ...state,
        mechanics: [...state.mechanics.filter(mechanic => mechanic.uuid !== action.payload.uuid)],
      };
    case TagActionType.GetTags:
      return {
        ...state,
        tags: action.payload.tags,
      };
    case TagActionType.CreateTag:
      return {
        ...state,
        tags: state.tags.includes(action.payload.tag)
          ? state.tags
          : [...state.tags, action.payload.tag],
      };
    case AnnotationActionType.GetAnnotations:
      annotationAccessor = {};

      action.payload.annotations.forEach(annotation => {
        if (!annotationAccessor[annotation.cardReference]) {
          annotationAccessor[annotation.cardReference] = [annotation];
        } else annotationAccessor[annotation.cardReference].push(annotation);
      });
      return {
        ...state,
        annotationAccessor,
      };
    case AnnotationActionType.CreateAnnotation:
      annotationAccessor = { ...state.annotationAccessor };
      annotationAccessor[action.payload.annotation.cardReference] = [
        ...(state.annotationAccessor[action.payload.annotation.cardReference] || []),
        action.payload.annotation,
      ];

      return {
        ...state,
        annotationAccessor,
      };
    case AnnotationActionType.UpdateAnnotation:
      annotationAccessor = Object.fromEntries(
        Object.entries(state.annotationAccessor).map(([cardReference, annotations]) => [
          cardReference,
          annotations.filter(annotation => annotation.uuid !== action.payload.annotation.uuid),
        ]),
      );
      annotationAccessor[action.payload.annotation.cardReference] = [
        ...(annotationAccessor[action.payload.annotation.cardReference] || []),
        action.payload.annotation,
      ];

      return {
        ...state,
        annotationAccessor,
      };
    case AnnotationActionType.DeleteAnnotation:
      annotationAccessor = { ...state.annotationAccessor };
      Object.values(annotationAccessor).map(list =>
        list.filter(annotation => annotation.uuid !== action.payload.uuid),
      );

      return {
        ...state,
        annotationAccessor,
      };

    case UserActionType.GetUser:
      if (import.meta.env.DEV && action.payload.user.some(user => user.name === 'ADMIN')) {
        return {
          ...state,
          user: action.payload.user,
          currentUser: action.payload.user.find(user => user.name === 'ADMIN') || UNKNOWN_CREATOR,
        };
      }

      return {
        ...state,
        user: action.payload.user,
      };

    case UserActionType.UpdateUser:
      // eslint-disable-next-line no-case-declarations
      const updatedUserList = [
        ...state.user.filter(user => user.uuid !== action.payload.user.uuid),
        action.payload.user,
      ];

      return {
        ...state,
        user: updatedUserList,
        currentUser:
          updatedUserList.find(user => user.uuid === state.currentUser.uuid) || UNKNOWN_CREATOR,
      };

    case UserActionType.SetCurrentUser:
      return {
        ...state,
        currentUser: action.payload.user,
      };

    case ImageActionType.ReadImage:
    case ImageActionType.CreateImage:
      return {
        ...state,
        cards: state.cards.map(card =>
          action.payload.cardUuid === card.uuid ? withImage(card, action.payload) : card,
        ),
      };

    case ImageActionType.ReadImages: {
      const imagesByCard = new Map<string, ImagePayload[]>();
      action.payload.images.forEach(image => {
        imagesByCard.set(image.cardUuid, [...(imagesByCard.get(image.cardUuid) || []), image]);
      });
      return {
        ...state,
        cards: state.cards.map(
          card => imagesByCard.get(card.uuid)?.reduce(withImage, card) ?? card,
        ),
      };
    }

    default:
      return state;
  }
};

export default reducer;
