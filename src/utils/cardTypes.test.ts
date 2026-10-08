import { describe, it, expect } from 'vitest';
import {
  legacyMainTypeToTypes,
  normalizeCardFace,
  deriveLegacyMainType,
  hasType,
  formatTypeLine,
} from './cardTypes';
import { CardType, CardMainType } from '../interfaces/enums';
import CardFaceInterface from '../interfaces/CardFaceInterface';

const face = (over: Partial<CardFaceInterface>): CardFaceInterface =>
  ({ name: '', cardText: [], cardTypes: [], ...over }) as CardFaceInterface;

describe('legacyMainTypeToTypes', () => {
  it('maps simple types one-to-one', () => {
    expect(legacyMainTypeToTypes('Creature')).toEqual({ cardTypes: [CardType.Creature] });
    expect(legacyMainTypeToTypes('Land')).toEqual({ cardTypes: [CardType.Land] });
    expect(legacyMainTypeToTypes('Instant')).toEqual({ cardTypes: [CardType.Instant] });
    expect(legacyMainTypeToTypes('Sorcery')).toEqual({ cardTypes: [CardType.Sorcery] });
    expect(legacyMainTypeToTypes('Enchantment')).toEqual({ cardTypes: [CardType.Enchantment] });
    expect(legacyMainTypeToTypes('Artifact')).toEqual({ cardTypes: [CardType.Artifact] });
    expect(legacyMainTypeToTypes('Planeswalker')).toEqual({ cardTypes: [CardType.Planeswalker] });
    expect(legacyMainTypeToTypes('Emblem')).toEqual({ cardTypes: [CardType.Emblem] });
  });

  it('decomposes combined types', () => {
    expect(legacyMainTypeToTypes('Enchantment Creature').cardTypes).toEqual([
      CardType.Enchantment,
      CardType.Creature,
    ]);
    expect(legacyMainTypeToTypes('Artifact Creature').cardTypes).toEqual([
      CardType.Artifact,
      CardType.Creature,
    ]);
  });

  it('models token-ness as the Token type combined with the base type', () => {
    expect(legacyMainTypeToTypes('Token Creature').cardTypes).toEqual([
      CardType.Token,
      CardType.Creature,
    ]);
    expect(legacyMainTypeToTypes('Token Artifact').cardTypes).toEqual([
      CardType.Token,
      CardType.Artifact,
    ]);
    expect(legacyMainTypeToTypes('Token Land').cardTypes).toEqual([CardType.Token, CardType.Land]);
  });

  it('models a basic land as the standalone BasicLand type', () => {
    expect(legacyMainTypeToTypes('Basic Land').cardTypes).toEqual([CardType.BasicLand]);
  });

  it('falls back to Creature for unknown input', () => {
    expect(legacyMainTypeToTypes('Nonsense').cardTypes).toEqual([CardType.Creature]);
  });
});

describe('normalizeCardFace', () => {
  it('fills cardTypes from legacy cardMainType when missing', () => {
    const f = normalizeCardFace(
      face({ cardTypes: undefined as never, cardMainType: 'Token Land' }),
    );
    expect(f.cardTypes).toEqual([CardType.Token, CardType.Land]);
  });

  it('leaves an already-new face untouched', () => {
    const f = normalizeCardFace(face({ cardTypes: [CardType.Artifact, CardType.Creature] }));
    expect(f.cardTypes).toEqual([CardType.Artifact, CardType.Creature]);
  });
});

describe('deriveLegacyMainType', () => {
  it('round-trips the combined and token/basic shapes', () => {
    expect(
      deriveLegacyMainType(face({ cardTypes: [CardType.Enchantment, CardType.Creature] })),
    ).toBe(CardMainType.EnchantmentCreature);
    expect(deriveLegacyMainType(face({ cardTypes: [CardType.Artifact, CardType.Creature] }))).toBe(
      CardMainType.ArtifactCreature,
    );
    expect(deriveLegacyMainType(face({ cardTypes: [CardType.Token, CardType.Creature] }))).toBe(
      CardMainType.CreatureToken,
    );
    expect(deriveLegacyMainType(face({ cardTypes: [CardType.Token, CardType.Artifact] }))).toBe(
      CardMainType.ArtifactToken,
    );
    expect(deriveLegacyMainType(face({ cardTypes: [CardType.Token, CardType.Land] }))).toBe(
      CardMainType.TokenLand,
    );
    expect(deriveLegacyMainType(face({ cardTypes: [CardType.BasicLand] }))).toBe(
      CardMainType.BasicLand,
    );
    expect(deriveLegacyMainType(face({ cardTypes: [CardType.Creature] }))).toBe(
      CardMainType.Creature,
    );
  });
});

describe('hasType', () => {
  it('reports membership', () => {
    const f = face({ cardTypes: [CardType.Artifact, CardType.Creature] });
    expect(hasType(f, CardType.Artifact)).toBe(true);
    expect(hasType(f, CardType.Land)).toBe(false);
  });
});

describe('formatTypeLine', () => {
  it('joins multiple types in order', () => {
    expect(formatTypeLine(face({ cardTypes: [CardType.Enchantment, CardType.Creature] }))).toBe(
      'Enchantment Creature',
    );
  });

  it('prefixes legendary and prints Token/BasicLand from the type list', () => {
    expect(formatTypeLine(face({ cardTypes: [CardType.BasicLand], legendary: true }))).toBe(
      'Legendary Basic Land',
    );
    expect(formatTypeLine(face({ cardTypes: [CardType.Token, CardType.Creature] }))).toBe(
      'Token Creature',
    );
  });

  it('appends subtypes after an en dash', () => {
    expect(
      formatTypeLine(face({ cardTypes: [CardType.Creature], cardSubTypes: 'Elf Warrior' })),
    ).toBe('Creature – Elf Warrior');
  });

  it('injects Vehicle for artifact vehicles', () => {
    expect(formatTypeLine(face({ cardTypes: [CardType.Artifact], vehicle: true }))).toBe(
      'Artifact – Vehicle',
    );
  });
});
