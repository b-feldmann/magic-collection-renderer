import { describe, it, expect } from 'vitest';

import { CardType, ColorType } from '../interfaces/enums';
import { getColor, default as cardToColor } from './cardToColor';
import CardFaceInterface from '../interfaces/CardFaceInterface';

const face = (over: Partial<CardFaceInterface>): CardFaceInterface =>
  ({ name: '', cardText: [], cardTypes: [], ...over }) as CardFaceInterface;

describe('getColor - tokenColors override', () => {
  it('uses tokenColors directly instead of the mana cost', () => {
    const result = getColor('{2}{U}', [ColorType.Red]);
    expect(result.color).toBe(ColorType.Red);
    expect(result.allColors).toEqual([ColorType.Red]);
  });

  it('two selected token colors resolve to Gold', () => {
    const result = getColor('', [ColorType.White, ColorType.Blue]);
    expect(result.color).toBe(ColorType.Gold);
    expect(result.allColors).toEqual([ColorType.White, ColorType.Blue]);
  });

  it('an empty override falls back to the mana cost', () => {
    const result = getColor('{2}{U}', []);
    expect(result.color).toBe(ColorType.Blue);
    expect(result.allColors).toEqual([ColorType.Blue]);
  });

  it('an undefined override falls back to the mana cost', () => {
    const result = getColor('{2}{U}');
    expect(result.color).toBe(ColorType.Blue);
    expect(result.allColors).toEqual([ColorType.Blue]);
  });

  it('a non-empty override ignores the mana cost completely', () => {
    const result = getColor('{5}{W}{W}', [ColorType.Green]);
    expect(result.color).toBe(ColorType.Green);
    expect(result.orderedCost).toBe('');
  });
});

describe('cardToColor - tokenColors override', () => {
  it('uses tokenColors for tokens', () => {
    const result = cardToColor(
      face({
        cardTypes: [CardType.Token, CardType.Creature],
        tokenColors: [ColorType.Black, ColorType.Green],
      }),
      '',
    );
    expect(result.color).toBe(ColorType.Gold);
    expect(result.allColors).toEqual([ColorType.Black, ColorType.Green]);
  });

  it('treats tokens without tokenColors as colorless', () => {
    const result = cardToColor(face({ cardTypes: [CardType.Token, CardType.Creature] }), '{2}{U}');
    expect(result.color).toBe(ColorType.Colorless);
    expect(result.allColors).toEqual([]);
  });

  it('CONTROL: regular cards are unaffected by the tokenColors param', () => {
    const result = cardToColor(
      face({ cardTypes: [CardType.Creature], tokenColors: [ColorType.Green] }),
      '{2}{U}',
    );
    expect(result.color).toBe(ColorType.Blue);
    expect(result.allColors).toEqual([ColorType.Blue]);
  });

  it('lands still derive colors from rules text', () => {
    const result = cardToColor(
      face({ cardTypes: [CardType.Land], cardText: ['{T}: Add {W}.'] }),
      '',
    );
    expect(result.color).toBe(ColorType.White);
  });

  it('a token land derives its color from rules text, not the token branch', () => {
    // A [Token, Land] face is NOT treated as a color-token (the token branch
    // requires Token AND NOT Land); it falls through to the Land branch and
    // takes its color from the mana symbols in its rules text. This pins the
    // intended token-land color behavior the cardTypes refactor introduced.
    const result = cardToColor(
      face({ cardTypes: [CardType.Token, CardType.Land], cardText: ['{T}: Add {G}.'] }),
    );
    expect(result.color).toBe(ColorType.Green);
    expect(result.color).not.toBe(ColorType.Colorless);
  });
});

describe('cardToColor - hybrid mana costs', () => {
  it('counts a hybrid pip as both of its colours', () => {
    const result = cardToColor(face({ cardTypes: [CardType.Creature] }), '{2}{rb}');
    expect(result.color).toBe(ColorType.Gold);
    expect(result.allColors).toEqual([ColorType.Red, ColorType.Black]);
  });

  it('is case-insensitive and order-insensitive for hybrid pips', () => {
    expect(cardToColor(face({ cardTypes: [CardType.Creature] }), '{wu}').allColors).toEqual([
      ColorType.White,
      ColorType.Blue,
    ]);
    expect(cardToColor(face({ cardTypes: [CardType.Creature] }), '{GW}').allColors).toEqual([
      ColorType.Green,
      ColorType.White,
    ]);
  });

  it('two colours in one hybrid pip resolve to Gold', () => {
    const result = cardToColor(face({ cardTypes: [CardType.Creature] }), '{3}{rb}');
    expect(result.color).toBe(ColorType.Gold);
  });

  it('repeated hybrid colours do not duplicate allColors', () => {
    const result = cardToColor(face({ cardTypes: [CardType.Creature] }), '{rb}{r}');
    expect(result.allColors).toEqual([ColorType.Red, ColorType.Black]);
  });
});

describe('getColor - hybrid mana costs', () => {
  it('registers both colours of a hybrid pip and keeps the token in the ordered cost', () => {
    const result = getColor('{2}{rb}');
    expect(result.color).toBe(ColorType.Gold);
    expect(result.allColors).toEqual([ColorType.Red, ColorType.Black]);
    expect(result.orderedCost).toBe('{2}{rb}');
  });

  it('land colour identity includes hybrid pips from rules text', () => {
    const result = cardToColor(
      face({ cardTypes: [CardType.Land], cardText: ['{T}: Add {r} or {b}.', '{T}: Add {gw}.'] }),
    );
    expect(result.color).toBe(ColorType.Gold);
    expect(result.allColors).toEqual([
      ColorType.Red,
      ColorType.Black,
      ColorType.Green,
      ColorType.White,
    ]);
  });
});
