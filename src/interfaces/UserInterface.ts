/** How the card editor edits card text that is made of steps. */
export type StepEditorMode = 'steps' | 'text';

export default interface UserInterface {
  name: string;
  uuid: string;
  seenCards: string[];
  seenComments?: string[];
  lastSeenVersion: number;
  /** For Sagas and planeswalkers. */
  sagaEditor?: StepEditorMode;
  /** Whether the templating hints are passive-aggressive. */
  trollMode?: boolean;
}
