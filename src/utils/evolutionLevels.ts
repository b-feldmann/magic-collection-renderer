import CardFaceInterface from '../interfaces/CardFaceInterface';
import { EvolutionSplit } from '../interfaces/enums';

type SecondLevel = Pick<CardFaceInterface, 'level2Indicator' | 'level2Text'>;

/** Whether the card shows a second level. */
export const hasSecondLevel = ({ level2Indicator, level2Text }: SecondLevel): boolean =>
  !!level2Indicator || !!level2Text?.some(line => line.trim());

/** The height split chosen for a card, which is automatic by default. */
export const getEvolutionSplit = (split?: EvolutionSplit): EvolutionSplit =>
  split && Object.values(EvolutionSplit).includes(split) ? split : EvolutionSplit.Auto;
