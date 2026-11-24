import { describe, expect, it } from 'vitest';
import {
  formatLoyaltyAbilities,
  normalizeLoyaltyCost,
  parseLoyaltyAbilities,
  parseLoyaltyLine,
  parseTypedCost,
  replaceCostHyphens,
  stepLoyaltyCost,
} from './loyaltyAbilities';

describe('loyalty abilities', () => {
  it('reads the cost and the text of a line', () => {
    expect(parseLoyaltyLine('+1: Draw a card.')).toEqual({ cost: '+1', text: 'Draw a card.' });
    expect(parseLoyaltyLine('-x: Scry X.')).toEqual({ cost: '−X', text: 'Scry X.' });
    expect(parseLoyaltyLine('0:')).toEqual({ cost: '0', text: '' });
  });

  it.each(['Flying', '{0}: Draw a card.', '+1/+1 counters', '--Indented', '[−3: Scry 3.'])(
    'reads %j as an ability without a loyalty cost',
    line => {
      expect(parseLoyaltyLine(line)).toEqual({ cost: '', text: line });
    },
  );

  it('reads costs as they were written before', () => {
    expect(parseLoyaltyLine('{-x}|Scry X.')).toEqual({ cost: '−X', text: 'Scry X.' });
    expect(parseLoyaltyLine('+1|Draw a card.')).toEqual({ cost: '+1', text: 'Draw a card.' });
    expect(parseLoyaltyLine('|Flying')).toEqual({ cost: '', text: 'Flying' });
  });

  it('writes abilities as they are read, without empty ones', () => {
    const abilities = [
      { cost: '', text: 'A | B' },
      { cost: '', text: 'Flying' },
      { cost: '0', text: '' },
      { cost: '−3', text: 'Scry 3.' },
    ];
    const lines = formatLoyaltyAbilities([...abilities, { cost: '', text: ' ' }]);

    expect(lines).toEqual(['A | B', 'Flying', '0:', '−3: Scry 3.']);
    expect(parseLoyaltyAbilities(lines)).toEqual(abilities);
  });

  it('finds a cost typed into the text', () => {
    const typed = (text: string) => {
      const ability = parseTypedCost(text);
      return ability && [ability.cost, ability.text];
    };
    expect(typed('+1: Draw a card.')).toEqual(['+1', 'Draw a card.']);
    expect(typed('−x: Scry X.')).toEqual(['−X', 'Scry X.']);
    expect(typed('[-3]: Scry 3.')).toEqual(['−3', 'Scry 3.']);
    expect(typed('0|Scry 1.')).toEqual(['0', 'Scry 1.']);
    expect(typed('{1}: Draw a card.')).toBeNull();
    expect(typed('[-3: Scry 3.')).toBeNull();
    expect(typed('+1: ')).toBeNull();
  });

  it.each([
    ['2', '+2'],
    ['+02', '+2'],
    ['-3', '−3'],
    ['x', '−X'],
    ['+x', '+X'],
    ['-0', '0'],
    ['-', ''],
  ])('completes the cost %j to %j', (typed, cost) => {
    expect(normalizeLoyaltyCost(typed)).toBe(cost);
  });

  it('steps costs through zero, but not those with an X', () => {
    expect(stepLoyaltyCost('+1', -1)).toBe('0');
    expect(stepLoyaltyCost('0', -1)).toBe('−1');
    expect(stepLoyaltyCost('−1', -1)).toBe('−2');
    expect(stepLoyaltyCost('−1', 1)).toBe('0');
    expect(stepLoyaltyCost('', 1)).toBe('+1');
    expect(stepLoyaltyCost('−X', 1)).toBeNull();
  });

  it('replaces only the hyphens of loyalty costs', () => {
    expect(replaceCostHyphens('-3: Get -1/-1.\n[-x]: A\n- 2: B\n-1/-1: C\n+1: -2: D')).toBe(
      '−3: Get -1/-1.\n[−x]: A\n- 2: B\n-1/-1: C\n+1: -2: D',
    );
  });
});
