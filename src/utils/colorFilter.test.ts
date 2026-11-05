import { describe, expect, it } from 'vitest';
import { EMPTY_CARD } from '../actions/cardActions';
import CardInterface from '../interfaces/CardInterface';
import { ColorType } from '../interfaces/enums';
import { matchesColorFilter } from './colorFilter';

const card = (manaCost: string): CardInterface => ({ ...EMPTY_CARD(), manaCost });
const showing = (...colors: ColorType[]) =>
  Object.fromEntries(Object.values(ColorType).map(color => [color, colors.includes(color)]));
const everythingExcept = (hidden: ColorType) =>
  showing(...Object.values(ColorType).filter(color => color !== hidden));

describe('matchesColorFilter', () => {
  it('shows gold cards containing a selected color and hides other gold cards', () => {
    const blueOnly = showing(ColorType.Blue);
    expect(matchesColorFilter(card('{u}{r}'), blueOnly)).toBe(true);
    expect(matchesColorFilter(card('{r}{g}'), blueOnly)).toBe(false);
  });

  it('counts hybrid mana as both of its colors', () => {
    expect(matchesColorFilter(card('{ur}'), showing(ColorType.Blue))).toBe(true);
    expect(matchesColorFilter(card('{ur}'), showing(ColorType.Red))).toBe(true);
    expect(matchesColorFilter(card('{ur}'), showing(ColorType.Green))).toBe(false);
  });

  it('keeps single-color cards to their own color', () => {
    const blueOnly = showing(ColorType.Blue);
    expect(matchesColorFilter(card('{1}{u}'), blueOnly)).toBe(true);
    expect(matchesColorFilter(card('{1}{r}'), blueOnly)).toBe(false);
  });

  it('shows every gold card when Gold is selected', () => {
    expect(matchesColorFilter(card('{r}{g}'), showing(ColorType.Gold))).toBe(true);
  });

  it('keeps gold cards visible with Gold unchecked while one of their colors is checked', () => {
    const noGold = everythingExcept(ColorType.Gold);
    expect(matchesColorFilter(card('{u}{r}'), noGold)).toBe(true);
    expect(matchesColorFilter(card('{u}'), noGold)).toBe(true);
  });
});
