import escapeRegExp from 'lodash/escapeRegExp';

import CardInterface from '../interfaces/CardInterface';
import MechanicInterface from '../interfaces/MechanicInterface';
import { CardType } from '../interfaces/enums';

const faceText = (face: CardInterface['front']): string =>
  [
    face.cardText,
    face.level1Text,
    face.level2Text,
    face.adventureText,
    face.omenText,
    face.prepareText,
    face.flavourText,
  ]
    .flatMap(value => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === 'string')
    .join('\n');

const mechanicNamePatterns = new Map<string, RegExp>();

// Matches the name as a whole word in any letter case, so "Ward" finds "ward" but not "toward".
const getMechanicNamePattern = (name: string): RegExp => {
  let pattern = mechanicNamePatterns.get(name);
  if (!pattern) {
    pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(name)}(?![\\p{L}\\p{N}])`, 'iu');
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
  const automaticTags = mechanics
    .filter(mechanic => usesMechanic(cardText, mechanic))
    .map(mechanic => mechanic.name);

  if (faces.some(face => face!.cardTypes?.includes(CardType.Evolution))) {
    automaticTags.push('Evolution');
  }

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
