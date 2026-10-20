export default interface UserInterface {
  name: string;
  uuid: string;
  seenCards: string[];
  seenComments?: string[];
  lastSeenVersion: number;
}
