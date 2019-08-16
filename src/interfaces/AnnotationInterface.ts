import { Creators } from './enums';

export default interface AnnotationInterface {
  uuid: string;
  datetime: string;
  author: Creators;
  content: string;
  cardReference: string;
}
