import { describe, expect, it } from 'vitest';

import { EvolutionSplit } from '../interfaces/enums';
import { getEvolutionSplit, hasSecondLevel } from './evolutionLevels';

describe('hasSecondLevel', () => {
  it.each([
    [{}, false],
    [{ level2Indicator: '', level2Text: [''] }, false],
    [{ level2Indicator: '4+' }, true],
    [{ level2Text: ['Flying'] }, true],
    [{ level2Text: ['', 'Flying'] }, true],
  ])('%j → %s', (face, expected) => {
    expect(hasSecondLevel(face)).toBe(expected);
  });
});

describe('getEvolutionSplit', () => {
  it('keeps a known split', () => {
    expect(getEvolutionSplit(EvolutionSplit.TallLevel)).toBe('1/2');
  });

  it('is automatic without one or with an unknown one', () => {
    expect(getEvolutionSplit(undefined)).toBe('Auto');
    expect(getEvolutionSplit('3/1' as EvolutionSplit)).toBe('Auto');
  });
});
