import { ChangeLogFeatureType } from './enums';

export default interface ChangeLogEntryInterface {
  version: string;
  content: {
    type: ChangeLogFeatureType;
    feature: string;
    description?: string | JSX.Element;
  }[];
  title: string;
}
