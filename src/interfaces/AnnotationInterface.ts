import UserInterface from './UserInterface';

export default interface AnnotationInterface {
  uuid: string;
  datetime: number;
  author: UserInterface;
  content: string;
  cardReference: string;
  edited: boolean;
}
