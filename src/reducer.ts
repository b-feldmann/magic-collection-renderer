import CardInterface from './interfaces/CardInterface';
import MechanicInterface from './interfaces/MechanicInterface';
import AnnotationInterface from './interfaces/AnnotationInterface';
import AnnotationAccessorInterface from './interfaces/AnnotationAccessorInterface';
import UserInterface from './interfaces/UserInterface';
import { UNKNOWN_CREATOR } from './interfaces/constants';

export enum CardActionType {
  RefreshCollection = 'refresh-collection',
  CreateCard = 'create-card',
  BulkReadCard = 'bulk-read-card',
  ReadCard = 'read-card',
  UpdateCard = 'update-card',
  DeleteCard = 'delete-card'
}

export enum MechanicActionType {
  GetMechanics = 'get-mechanics',
  CreateMechanic = 'create-mechanic',
  UpdateMechanic = 'update-mechanic',
  DeleteMechanic = 'delete-mechanic'
}

export enum AnnotationActionType {
  GetAnnotations = 'get-annotations',
  CreateAnnotation = 'create-annotation',
  UpdateAnnotation = 'update-annotation',
  DeleteAnnotation = 'delete-annotation'
}

export enum UserActionType {
  GetUser = 'get-user',
  UpdateUser = 'update-user',
  SetCurrentUser = 'set-current-user'
}

type State = {
  cards: CardInterface[];
  mechanics: MechanicInterface[];
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
  | { type: AnnotationActionType.GetAnnotations; payload: { annotations: AnnotationInterface[] } }
  | { type: AnnotationActionType.CreateAnnotation; payload: { annotation: AnnotationInterface } }
  | { type: AnnotationActionType.UpdateAnnotation; payload: { annotation: AnnotationInterface } }
  | { type: AnnotationActionType.DeleteAnnotation; payload: { uuid: string } }
  | { type: UserActionType.GetUser; payload: { user: UserInterface[] } }
  | { type: UserActionType.UpdateUser; payload: { user: UserInterface } }
  | { type: UserActionType.SetCurrentUser; payload: { user: UserInterface } };

const reducer: React.Reducer<State, Action> = (state, action) => {
  let annotationAccessor: AnnotationAccessorInterface;

  switch (action.type) {
    case CardActionType.RefreshCollection:
      return {
        ...state,
        cards: state.cards.map(card => ({ ...card, loading: true }))
      };
    case CardActionType.CreateCard:
      return {
        ...state,
        cards: [...state.cards, action.payload.card],
        newUuid: action.payload.card.uuid
      };
    case CardActionType.ReadCard:
      return {
        ...state,
        cards: [
          ...state.cards.filter(card => card.uuid !== action.payload.card.uuid),
          action.payload.card
        ]
      };
    case CardActionType.BulkReadCard:
      return {
        ...state,
        cards: [
          ...state.cards.filter(
            card => !action.payload.cards.find(newCard => newCard.uuid === card.uuid)
          ),
          ...action.payload.cards
        ]
      };
    case CardActionType.UpdateCard:
      return {
        ...state,
        cards: [
          ...state.cards.filter(card => card.uuid !== action.payload.card.uuid),
          action.payload.card
        ]
      };
    case CardActionType.DeleteCard:
      return {
        ...state,
        cards: [...state.cards.filter(card => card.uuid !== action.payload.uuid)]
      };

    case MechanicActionType.GetMechanics:
      return {
        ...state,
        mechanics: action.payload.mechanics
      };
    case MechanicActionType.CreateMechanic:
      return {
        ...state,
        mechanics: [...state.mechanics, action.payload.mechanic]
      };
    case MechanicActionType.UpdateMechanic:
      return {
        ...state,
        mechanics: [
          ...state.mechanics.filter(mechanic => mechanic.uuid !== action.payload.mechanic.uuid),
          action.payload.mechanic
        ]
      };
    case MechanicActionType.DeleteMechanic:
      return {
        ...state,
        mechanics: [...state.mechanics.filter(mechanic => mechanic.uuid !== action.payload.uuid)]
      };
    case AnnotationActionType.GetAnnotations:
      // eslint-disable-next-line no-case-declarations
      annotationAccessor = {};

      action.payload.annotations.forEach(annotation => {
        if (!annotationAccessor[annotation.cardReference]) {
          annotationAccessor[annotation.cardReference] = [annotation];
        } else annotationAccessor[annotation.cardReference].push(annotation);
      });
      return {
        ...state,
        annotationAccessor
      };
    case AnnotationActionType.CreateAnnotation:
      // eslint-disable-next-line no-case-declarations
      annotationAccessor = { ...state.annotationAccessor };
      if (!state.annotationAccessor[action.payload.annotation.cardReference]) {
        annotationAccessor[action.payload.annotation.cardReference] = [action.payload.annotation];
      } else
        annotationAccessor[action.payload.annotation.cardReference].push(action.payload.annotation);

      return {
        ...state,
        annotationAccessor
      };
    case AnnotationActionType.UpdateAnnotation:
      annotationAccessor = { ...state.annotationAccessor };
      if (!state.annotationAccessor[action.payload.annotation.cardReference]) {
        annotationAccessor[action.payload.annotation.cardReference] = [action.payload.annotation];
      } else
        annotationAccessor[action.payload.annotation.cardReference] = [
          ...annotationAccessor[action.payload.annotation.cardReference].filter(
            annotation => annotation.uuid !== action.payload.annotation.uuid
          ),
          action.payload.annotation
        ];

      return {
        ...state,
        annotationAccessor
      };
    case AnnotationActionType.DeleteAnnotation:
      annotationAccessor = { ...state.annotationAccessor };
      Object.values(annotationAccessor).map(list =>
        list.filter(annotation => annotation.uuid !== action.payload.uuid)
      );

      return {
        ...state,
        annotationAccessor
      };

    case UserActionType.GetUser:
      if (
        process.env.NODE_ENV === 'development' &&
        action.payload.user.some(user => user.name === 'ADMIN')
      ) {
        return {
          ...state,
          user: action.payload.user,
          currentUser: action.payload.user.find(user => user.name === 'ADMIN') || UNKNOWN_CREATOR
        };
      }

      return {
        ...state,
        user: action.payload.user
      };

    case UserActionType.UpdateUser:
      // eslint-disable-next-line no-case-declarations
      const updatedUserList = [
        ...state.user.filter(user => user.uuid !== action.payload.user.uuid),
        action.payload.user
      ];

      return {
        ...state,
        user: updatedUserList,
        currentUser:
          updatedUserList.find(user => user.uuid === state.currentUser.uuid) || UNKNOWN_CREATOR
      };

    case UserActionType.SetCurrentUser:
      return {
        ...state,
        currentUser: action.payload.user
      };

    default:
      return state;
  }
};

export default reducer;
