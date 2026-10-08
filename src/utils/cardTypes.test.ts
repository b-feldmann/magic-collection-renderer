import { describe, it, expect } from 'vitest';
import {
  legacyMainTypeToTypes,
  normalizeCardFace,
  deriveLegacyMainType,
  hasType,
} from './cardTypes';
import { CardType, CardMainType } from '../interfaces/enums';
import CardFaceInterface from '../interfaces/CardFaceInterface';

const face = (over: Partial<CardFaceInterface>): CardFaceInterface =>
  ({ name: '', cardText: [], cardTypes: [], ...over }) as CardFaceInterface;

describe('legacyMainTypeToTypes', () => {
  it('maps simple types one-to-one', () => {
    expect(legacyMainTypeToTypes('Creature')).toEqual({
      cardTypes: [CardType.Creature],
      token: false,
      basic: false,
    });
    expect(legacyMainTypeToTypes('Land')).toEqual({
      cardTypes: [CardType.Land],
      token: false,
      basic: false,
    });
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

  it('moves token-ness to the token flag', () => {
    expect(legacyMainTypeToTypes('Token Creature')).toEqual({
      cardTypes: [CardType.Creature],
      token: true,
      basic: false,
    });
    expect(legacyMainTypeToTypes('Token Artifact')).toEqual({
      cardTypes: [CardType.Artifact],
      token: true,
      basic: false,
    });
    expect(legacyMainTypeToTypes('Token Land')).toEqual({
      cardTypes: [CardType.Land],
      token: true,
      basic: false,
    });
  });

  it('moves basic-ness to the basic flag', () => {
    expect(legacyMainTypeToTypes('Basic Land')).toEqual({
      cardTypes: [CardType.Land],
      token: false,
      basic: true,
    });
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
    expect(f.cardTypes).toEqual([CardType.Land]);
    expect(f.token).toBe(true);
  });

  it('leaves an already-new face untouched', () => {
    const f = normalizeCardFace(face({ cardTypes: [CardType.Artifact, CardType.Creature] }));
    expect(f.cardTypes).toEqual([CardType.Artifact, CardType.Creature]);
  });
});

describe('deriveLegacyMainType', () => {
  it('round-trips the combined and flagged shapes', () => {
    expect(
      deriveLegacyMainType(face({ cardTypes: [CardType.Enchantment, CardType.Creature] })),
    ).toBe(CardMainType.EnchantmentCreature);
    expect(deriveLegacyMainType(face({ cardTypes: [CardType.Land], token: true }))).toBe(
      CardMainType.TokenLand,
    );
    expect(deriveLegacyMainType(face({ cardTypes: [CardType.Land], basic: true }))).toBe(
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
