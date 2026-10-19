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
    .filter(mechanic => mechanic.name.trim() && cardText.includes(mechanic.name))
    .map(mechanic => mechanic.name);

  if (faces.some(face => face!.cardTypes?.includes(CardType.Evolution))) {
    automaticTags.push('Evolution');
  }

  return automaticTags;
};

export const getCardTags = (card: CardInterface, mechanics: MechanicInterface[]): string[] => [
  ...new Set([...(card.tags || []), ...getAutomaticCardTags(card, mechanics)]),
];

export const updateCardTags = (
  previousCard: CardInterface,
  nextCard: CardInterface,
  mechanics: MechanicInterface[],
): string[] => {
  const previousAutomaticTags = new Set(getAutomaticCardTags(previousCard, mechanics));
  const manualTags = (nextCard.tags || []).filter(tag => !previousAutomaticTags.has(tag));

  return [...new Set([...manualTags, ...getAutomaticCardTags(nextCard, mechanics)])];
};
