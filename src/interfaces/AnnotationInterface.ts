import { Creators } from './enums';

export default interface AnnotationInterface {
  uuid: string;
  datetime: number;
  author: Creators;
  content: string;
  cardReference: string;
  edited: boolean;
}
