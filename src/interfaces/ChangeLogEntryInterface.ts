import { ChangeLogFeatureType } from './enums';

export default interface ChangeLogEntryInterface {
  version: string;
  content: {
    type: ChangeLogFeatureType;
    feature: string | JSX.Element;
  }[];
  title: string;
}
