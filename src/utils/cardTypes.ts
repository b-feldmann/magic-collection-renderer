import { CardType, CardMainType } from '../interfaces/enums';
import CardFaceInterface from '../interfaces/CardFaceInterface';
import CardInterface from '../interfaces/CardInterface';

interface DecomposedType {
  cardTypes: CardType[];
}

// Legacy CardMainType string -> new atomic cardTypes list. Token and BasicLand
// are themselves CardType members (token combined with its base type).
const LEGACY_MAP: Record<string, DecomposedType> = {
  [CardMainType.Creature]: { cardTypes: [CardType.Creature] },
  [CardMainType.Instant]: { cardTypes: [CardType.Instant] },
  [CardMainType.Sorcery]: { cardTypes: [CardType.Sorcery] },
  [CardMainType.Enchantment]: { cardTypes: [CardType.Enchantment] },
  [CardMainType.EnchantmentCreature]: { cardTypes: [CardType.Enchantment, CardType.Creature] },
  [CardMainType.Artifact]: { cardTypes: [CardType.Artifact] },
  [CardMainType.ArtifactCreature]: { cardTypes: [CardType.Artifact, CardType.Creature] },
  [CardMainType.CreatureToken]: { cardTypes: [CardType.Token, CardType.Creature] },
  [CardMainType.ArtifactToken]: { cardTypes: [CardType.Token, CardType.Artifact] },
  [CardMainType.TokenLand]: { cardTypes: [CardType.Token, CardType.Land] },
  [CardMainType.Land]: { cardTypes: [CardType.Land] },
  [CardMainType.BasicLand]: { cardTypes: [CardType.BasicLand] },
  [CardMainType.Planeswalker]: { cardTypes: [CardType.Planeswalker] },
  [CardMainType.Emblem]: { cardTypes: [CardType.Emblem] },
};

export const legacyMainTypeToTypes = (main: string): DecomposedType =>
  LEGACY_MAP[main] ?? { cardTypes: [CardType.Creature] };

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
  return { ...face, cardTypes: decomposed.cardTypes };
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
  if (has(CardType.BasicLand)) return CardMainType.BasicLand;
  if (has(CardType.Token)) {
    if (has(CardType.Land)) return CardMainType.TokenLand;
    if (has(CardType.Artifact)) return CardMainType.ArtifactToken;
    return CardMainType.CreatureToken;
  }
  if (has(CardType.Land)) return CardMainType.Land;
  if (has(CardType.Creature)) {
    if (has(CardType.Enchantment)) return CardMainType.EnchantmentCreature;
    if (has(CardType.Artifact)) return CardMainType.ArtifactCreature;
    return CardMainType.Creature;
  }
  if (has(CardType.Artifact)) return CardMainType.Artifact;
  if (has(CardType.Enchantment)) return CardMainType.Enchantment;
  if (has(CardType.Planeswalker)) return CardMainType.Planeswalker;
  if (has(CardType.Instant)) return CardMainType.Instant;
  if (has(CardType.Sorcery)) return CardMainType.Sorcery;
  if (has(CardType.Emblem)) return CardMainType.Emblem;
  return CardMainType.Creature;
};

export const formatTypeLine = (face: CardFaceInterface): string => {
  const types = Array.isArray(face.cardTypes) ? face.cardTypes : [];

  // Token and BasicLand are CardType members already in `types`; only
  // legendary remains a boolean supertype to prefix.
  const left = [face.legendary ? 'Legendary' : '', ...types].filter(Boolean).join(' ');

  const isArtifact = types.includes(CardType.Artifact);
  const subtypes = [face.vehicle && isArtifact ? 'Vehicle' : '', face.cardSubTypes]
    .filter(Boolean)
    .join(' ');

  return subtypes ? `${left} – ${subtypes}` : left;
};
