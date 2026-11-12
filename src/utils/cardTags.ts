import escapeRegExp from 'lodash/escapeRegExp';

import CardInterface from '../interfaces/CardInterface';
import MechanicInterface from '../interfaces/MechanicInterface';
import { CardType } from '../interfaces/enums';
import { getRulesTextTags, RULES_TEXT_TAG_RULES } from './rulesTextTags';

const EVOLUTION_TAG = 'Evolution';

// Tags that are derived from the card itself rather than from a mechanic or the tag catalogue.
export const AUTOMATIC_TAG_NAMES: string[] = [
  ...new Set([EVOLUTION_TAG, ...RULES_TEXT_TAG_RULES.map(rule => rule.tag)]),
];

const joinText = (values: unknown[]): string =>
  values
    .flatMap(value => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === 'string')
    .join('\n');

// Everything printed in the text boxes except flavour text.
const faceRulesText = (face: CardInterface['front']): string =>
  joinText([
    face.cardText,
    face.level1Text,
    face.level2Text,
    face.adventureText,
    face.omenText,
    face.prepareText,
  ]);

const faceText = (face: CardInterface['front']): string =>
  joinText([faceRulesText(face), face.flavourText]);

const mechanicNamePatterns = new Map<string, RegExp>();

// Matches the name as a whole word in any letter case, optionally followed by an "s", so "Discard"
// finds "discard" and "Discards" but not "discarded", and "Ward" does not find "toward".
const getMechanicNamePattern = (name: string): RegExp => {
  let pattern = mechanicNamePatterns.get(name);
  if (!pattern) {
    pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(name)}s?(?![\\p{L}\\p{N}])`, 'iu');
    mechanicNamePatterns.set(name, pattern);
  }
  return pattern;
};

const usesMechanic = (cardText: string, mechanic: MechanicInterface): boolean => {
  const name = mechanic.name.trim();
  return Boolean(name) && getMechanicNamePattern(name).test(cardText);
};

// An automatic tag replaces any other spelling of itself, so "flying" and "Flying" never coexist.
const mergeTags = (tags: string[], automaticTags: string[]): string[] => {
  const spellings = new Map(automaticTags.map(tag => [tag.toLowerCase(), tag]));

  return [
    ...new Set([...tags.map(tag => spellings.get(tag.toLowerCase()) ?? tag), ...automaticTags]),
  ];
};

export const getAutomaticCardTags = (
  card: CardInterface,
  mechanics: MechanicInterface[],
): string[] => {
  const faces = [card.front, card.back].filter(Boolean);
  const cardText = faces
    .filter(Boolean)
    .map(face => faceText(face!))
    .join('\n');
  const usedMechanics = mechanics.filter(mechanic => usesMechanic(cardText, mechanic));
  // One level only: descriptions of mechanics that are merely referenced are never read.
  const usedDescriptions = usedMechanics.map(mechanic => mechanic.description).join('\n');
  const automaticTags = mechanics
    .filter(
      mechanic => usedMechanics.includes(mechanic) || usesMechanic(usedDescriptions, mechanic),
    )
    .map(mechanic => mechanic.name);

  if (faces.some(face => face!.cardTypes?.includes(CardType.Evolution))) {
    automaticTags.push(EVOLUTION_TAG);
  }

  faces
    .flatMap(face => getRulesTextTags(faceRulesText(face!), face!.cardTypes || []))
    .forEach(tag => {
      if (!automaticTags.includes(tag)) automaticTags.push(tag);
    });

  return automaticTags;
};

export const getCardTags = (card: CardInterface, mechanics: MechanicInterface[]): string[] =>
  mergeTags(card.tags || [], getAutomaticCardTags(card, mechanics));

export const getKnownCardTags = (
  card: CardInterface,
  tags: string[],
  mechanics: MechanicInterface[],
): string[] => {
  const knownTags = new Set([
    ...tags,
    ...mechanics.map(mechanic => mechanic.name.trim()),
    // Automatic tags such as 'Evolution' are derived from the card and need no catalogue entry.
    ...getAutomaticCardTags(card, mechanics),
  ]);

  return (card.tags || []).filter(tag => knownTags.has(tag.trim()));
};

export const updateCardTags = (
  previousCard: CardInterface,
  nextCard: CardInterface,
  mechanics: MechanicInterface[],
): string[] => {
  const previousAutomaticTags = new Set(getAutomaticCardTags(previousCard, mechanics));
  const manualTags = (nextCard.tags || []).filter(tag => !previousAutomaticTags.has(tag));

  return mergeTags(manualTags, getAutomaticCardTags(nextCard, mechanics));
};
