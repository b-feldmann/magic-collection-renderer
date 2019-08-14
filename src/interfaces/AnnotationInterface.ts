import { Creators } from './enums';

export default interface AnnotationInterface {
  time: string;
  author: Creators;
  text: string;
}
