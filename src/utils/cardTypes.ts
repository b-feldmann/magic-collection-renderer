import { CardType, CardMainType } from '../interfaces/enums';
import CardFaceInterface from '../interfaces/CardFaceInterface';
import CardInterface from '../interfaces/CardInterface';

interface DecomposedType {
  cardTypes: CardType[];
  token: boolean;
  basic: boolean;
}

// Legacy CardMainType string -> new atomic cardTypes + token/basic flags.
const LEGACY_MAP: Record<string, DecomposedType> = {
  [CardMainType.Creature]: { cardTypes: [CardType.Creature], token: false, basic: false },
  [CardMainType.Instant]: { cardTypes: [CardType.Instant], token: false, basic: false },
  [CardMainType.Sorcery]: { cardTypes: [CardType.Sorcery], token: false, basic: false },
  [CardMainType.Enchantment]: { cardTypes: [CardType.Enchantment], token: false, basic: false },
  [CardMainType.EnchantmentCreature]: {
    cardTypes: [CardType.Enchantment, CardType.Creature],
    token: false,
    basic: false,
  },
  [CardMainType.Artifact]: { cardTypes: [CardType.Artifact], token: false, basic: false },
  [CardMainType.ArtifactCreature]: {
    cardTypes: [CardType.Artifact, CardType.Creature],
    token: false,
    basic: false,
  },
  [CardMainType.CreatureToken]: { cardTypes: [CardType.Creature], token: true, basic: false },
  [CardMainType.ArtifactToken]: { cardTypes: [CardType.Artifact], token: true, basic: false },
  [CardMainType.TokenLand]: { cardTypes: [CardType.Land], token: true, basic: false },
  [CardMainType.Land]: { cardTypes: [CardType.Land], token: false, basic: false },
  [CardMainType.BasicLand]: { cardTypes: [CardType.Land], token: false, basic: true },
  [CardMainType.Planeswalker]: { cardTypes: [CardType.Planeswalker], token: false, basic: false },
  [CardMainType.Emblem]: { cardTypes: [CardType.Emblem], token: false, basic: false },
};

export const legacyMainTypeToTypes = (main: string): DecomposedType =>
  LEGACY_MAP[main] ?? { cardTypes: [CardType.Creature], token: false, basic: false };

export const hasType = (face: CardFaceInterface, type: CardType): boolean =>
  Array.isArray(face.cardTypes) && face.cardTypes.includes(type);

// Ensure a face carries the new shape. If it already has a cardTypes array we
// leave it alone; otherwise we derive it from the legacy cardMainType string.
export const normalizeCardFace = (face: CardFaceInterface): CardFaceInterface => {
  if (Array.isArray(face.cardTypes) && face.cardTypes.length > 0) return face;
  const legacyMain = (face as Record<string, unknown>).cardMainType;
  const decomposed = legacyMainTypeToTypes(
    typeof legacyMain === 'string' ? legacyMain : CardMainType.Creature,
  );
  return {
    ...face,
    cardTypes: decomposed.cardTypes,
    token: face.token ?? decomposed.token,
    basic: face.basic ?? decomposed.basic,
  };
};

export const normalizeCard = (card: CardInterface): CardInterface => ({
  ...card,
  front: normalizeCardFace(card.front),
  back: card.back ? normalizeCardFace(card.back) : card.back,
});

// Best-effort inverse: pick the legacy single enum that best represents the
// new shape, so older app builds / external tooling keep working after a save.
export const deriveLegacyMainType = (face: CardFaceInterface): CardMainType => {
  const types = Array.isArray(face.cardTypes) ? face.cardTypes : [];
  const has = (t: CardType) => types.includes(t);
  if (has(CardType.Land)) {
    if (face.basic) return CardMainType.BasicLand;
    if (face.token) return CardMainType.TokenLand;
    return CardMainType.Land;
  }
  if (has(CardType.Creature)) {
    if (face.token) return CardMainType.CreatureToken;
    if (has(CardType.Enchantment)) return CardMainType.EnchantmentCreature;
    if (has(CardType.Artifact)) return CardMainType.ArtifactCreature;
    return CardMainType.Creature;
  }
  if (has(CardType.Artifact))
    return face.token ? CardMainType.ArtifactToken : CardMainType.Artifact;
  if (has(CardType.Enchantment)) return CardMainType.Enchantment;
  if (has(CardType.Planeswalker)) return CardMainType.Planeswalker;
  if (has(CardType.Instant)) return CardMainType.Instant;
  if (has(CardType.Sorcery)) return CardMainType.Sorcery;
  if (has(CardType.Emblem)) return CardMainType.Emblem;
  return CardMainType.Creature;
};

export const formatTypeLine = (face: CardFaceInterface): string => {
  const types = Array.isArray(face.cardTypes) ? face.cardTypes : [];
  const supertypes = [
    face.legendary ? 'Legendary' : '',
    face.basic ? 'Basic' : '',
    face.token ? 'Token' : '',
  ].filter(Boolean);

  const left = [...supertypes, ...types].join(' ');

  const isArtifact = types.includes(CardType.Artifact);
  const subtypes = [face.vehicle && isArtifact ? 'Vehicle' : '', face.cardSubTypes]
    .filter(Boolean)
    .join(' ');

  return subtypes ? `${left} – ${subtypes}` : left;
};
