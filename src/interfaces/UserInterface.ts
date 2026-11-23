/** How the card editor edits a Saga's card text. */
export type SagaEditorMode = 'steps' | 'text';

export default interface UserInterface {
  name: string;
  uuid: string;
  seenCards: string[];
  seenComments?: string[];
  lastSeenVersion: number;
  sagaEditor?: SagaEditorMode;
}
