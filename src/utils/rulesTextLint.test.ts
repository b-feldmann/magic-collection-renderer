import { describe, expect, it } from 'vitest';
import CardFaceInterface from '../interfaces/CardFaceInterface';
import MechanicInterface from '../interfaces/MechanicInterface';
import { CardType } from '../interfaces/enums';
import { applyLintFix, getSelfNoun, lintCardFace, RulesTextLintRule } from './rulesTextLint';

const face = (overrides: Partial<CardFaceInterface> = {}): CardFaceInterface => ({
  name: 'Grizzled Scout',
  cardTypes: [CardType.Creature],
  cardText: [],
  ...overrides,
});

const MECHANICS: MechanicInterface[] = [
  { uuid: '1', name: 'Enrage', description: 'Whenever this creature is dealt damage, {ref}.' },
  { uuid: '2', name: 'Cycling', description: '{ref}, Discard this card: Draw a card.' },
];

const lint = (cardText: string[], overrides: Partial<CardFaceInterface> = {}) =>
  lintCardFace(face({ cardText, ...overrides }), MECHANICS);

const rules = (cardText: string[], overrides: Partial<CardFaceInterface> = {}) =>
  lint(cardText, overrides).map(issue => issue.rule);

// The line after applying the first fix of the given rule.
const fixed = (
  line: string,
  rule: RulesTextLintRule,
  overrides: Partial<CardFaceInterface> = {},
) => {
  const issue = lint([line], overrides).find(candidate => candidate.rule === rule);
  if (!issue?.fix) throw new Error(`No fix for ${rule} in "${line}"`);
  return applyLintFix([line], issue)[0];
};

describe('lintCardFace', () => {
  it('accepts text templated like current cards', () => {
    expect(
      lint([
        'Flying, first strike',
        'When this creature enters, draw a card.',
        '{t}: Add {g}.',
        '[Enrage] Put a +1/+1 counter on this creature.',
        '[-Cycling {2}]',
        'Choose one --',
        'Choose one or both -',
        '* Target player mills two cards.',
        'Equip {2}',
      ]),
    ).toEqual([]);
  });

  it('reports which field and line an issue is on', () => {
    const [issue] = lint(['Flying', 'Draw a card']);
    expect(issue).toMatchObject({ field: 'cardText', fieldName: 'Card text', line: 1 });
  });

  describe('things that render wrong', () => {
    it('flags unknown symbols but not mana, tap or loyalty symbols', () => {
      expect(rules(['{q}: Draw a card.'])).toEqual(['unknown-symbol']);
      expect(rules(['{T}, {2}{w/u}: Draw a card.'])).toEqual(['unknown-symbol']);
      expect(rules(['{2}{wu}{rp}{x}, {t}: Draw a card.'])).toEqual([]);
      expect(
        rules(['+1|Draw a card.', '{-x}|Exile a creature.'], {
          cardTypes: [CardType.Planeswalker],
          legendary: true,
        }),
      ).toEqual([]);
    });

    it('flags brackets that are no mechanic and fixes their capitalization', () => {
      expect(rules(['[Enrag] Draw a card.'])).toEqual(['unknown-mechanic']);
      expect(fixed('[enrage] Draw a card.', 'unknown-mechanic')).toBe('[Enrage] Draw a card.');
    });

    it('ignores brackets until mechanics are loaded', () => {
      expect(lintCardFace(face({ cardText: ['[Enrag] Draw a card.'] }), [])).toEqual([]);
    });

    it('replaces the CARDNAME placeholder', () => {
      expect(fixed('CARDNAME gets +1/+1.', 'cardname-placeholder')).toBe(
        'This creature gets +1/+1.',
      );
      expect(
        fixed('CARDNAME deals 3 damage to any target.', 'cardname-placeholder', {
          cardTypes: [CardType.Instant],
        }),
      ).toBe('~ deals 3 damage to any target.');
    });

    it('turns a typed T in a cost into the tap symbol', () => {
      expect(fixed('T: Add {g}.', 'tap-symbol')).toBe('{t}: Add {g}.');
      expect(fixed('{1}, T: Draw a card.', 'tap-symbol')).toBe('{1}, {t}: Draw a card.');
      expect(rules(['Target creature gets +1/+1 until end of turn.'])).toEqual([]);
    });
  });

  describe('self-references', () => {
    it('suggests "this <type>" for ~ on nonlegendary permanents', () => {
      expect(fixed('When ~ enters, draw a card.', 'self-reference')).toBe(
        'When this creature enters, draw a card.',
      );
      expect(fixed('~ gets +1/+1.', 'self-reference')).toBe('This creature gets +1/+1.');
      expect(fixed('{t}: ~ deals 1 damage to any target.', 'self-reference')).toBe(
        '{t}: This creature deals 1 damage to any target.',
      );
      expect(fixed("~'s power is equal to X.", 'self-reference')).toBe(
        "This creature's power is equal to X.",
      );
    });

    it('says "this card" when the card is in a hidden zone or discarded', () => {
      expect(fixed('{2}{b}: Return ~ from your graveyard to your hand.', 'self-reference')).toBe(
        '{2}{b}: Return this card from your graveyard to your hand.',
      );
    });

    it('uses the noun of the card type', () => {
      expect(getSelfNoun(face({ cardTypes: [CardType.Artifact], vehicle: true }))).toBe('Vehicle');
      expect(getSelfNoun(face({ cardTypes: [CardType.Artifact], cardSubTypes: 'Equipment' }))).toBe(
        'Equipment',
      );
      expect(getSelfNoun(face({ cardTypes: [CardType.Enchantment], cardSubTypes: 'Aura' }))).toBe(
        'Aura',
      );
      expect(getSelfNoun(face({ cardTypes: [CardType.Artifact] }))).toBe('artifact');
      expect(getSelfNoun(face({ cardTypes: [CardType.Land] }))).toBe('land');
      expect(getSelfNoun(face({ cardTypes: [CardType.Artifact, CardType.Creature] }))).toBe(
        'creature',
      );
    });

    it('keeps ~ on legendary cards, instants and sorceries', () => {
      expect(rules(['When ~ enters, draw a card.'], { legendary: true })).toEqual([]);
      expect(rules(['~ deals 3 damage to any target.'], { cardTypes: [CardType.Instant] })).toEqual(
        [],
      );
    });

    it('keeps ~ used as strikethrough', () => {
      expect(rules(['Draw ~two~ three cards.'])).toEqual([]);
    });

    it('suggests replacing the typed card name', () => {
      expect(fixed('When Grizzled Scout enters, draw a card.', 'literal-name')).toBe(
        'When this creature enters, draw a card.',
      );
      expect(
        fixed('Grizzled Scout attacks each combat if able.', 'literal-name', { legendary: true }),
      ).toBe('~ attacks each combat if able.');
    });

    it('leaves references in the spell half of an Adventure alone', () => {
      expect(
        lintCardFace(
          face({
            cardTypes: [CardType.Creature, CardType.Adventure],
            adventureText: ['Return ~ from exile.'],
          }),
          MECHANICS,
        ),
      ).toEqual([]);
    });
  });

  describe('outdated templates', () => {
    it('shortens "enters the battlefield" to "enters"', () => {
      expect(fixed('When this creature enters the battlefield, scry 1.', 'enters')).toBe(
        'When this creature enters, scry 1.',
      );
      expect(
        fixed('Creatures your opponents control enter the battlefield tapped.', 'enters'),
      ).toBe('Creatures your opponents control enter tapped.');
    });

    it('explains "enters the battlefield under your control" without an automatic fix', () => {
      const [issue] = lint([
        'Whenever another creature enters the battlefield under your control, you gain 1 life.',
      ]);
      expect(issue.rule).toBe('enters');
      expect(issue.fix).toBeUndefined();
    });

    it('renames converted mana cost, his or her and until the end of turn', () => {
      expect(
        fixed('Destroy target creature with converted mana cost 3 or less.', 'mana-value'),
      ).toBe('Destroy target creature with mana value 3 or less.');
      expect(fixed('Target player discards his or her hand.', 'pronoun')).toBe(
        'Target player discards their hand.',
      );
      expect(fixed('This creature gets +2/+0 until the end of turn.', 'until-end-of-turn')).toBe(
        'This creature gets +2/+0 until end of turn.',
      );
      expect(rules(['This creature gets +2/+0 until the end of your next turn.'])).toEqual([]);
    });

    it('suggests "create" for tokens', () => {
      expect(rules(['Put a 1/1 white Soldier creature token onto the battlefield.'])).toEqual([
        'create-token',
      ]);
    });
  });

  describe('capitalization and punctuation', () => {
    it('capitalizes abilities and lowercases later keywords', () => {
      expect(fixed('flying', 'capitalization')).toBe('Flying');
      expect(fixed('Flying, Trample', 'capitalization')).toBe('Flying, trample');
      expect(rules(['Flying, Trample, Haste'])).toEqual(['capitalization', 'capitalization']);
    });

    it('adds a missing period to sentences but not to keyword lines', () => {
      expect(fixed('When this creature enters, draw a card', 'missing-period')).toBe(
        'When this creature enters, draw a card.',
      );
      expect(fixed('{t}: Add {g}', 'missing-period')).toBe('{t}: Add {g}.');
      expect(rules(['Protection from black and from red'])).toEqual([]);
      expect(rules(['Enchant creature or planeswalker you control'])).toEqual([]);
      expect(rules(['[Enrage] Draw a card. (Reminder text.)'])).toEqual([]);
    });

    it('keeps bullets and planeswalker costs when fixing', () => {
      expect(fixed('* Draw a card', 'missing-period')).toBe('* Draw a card.');
      expect(
        fixed('-2|Draw a card', 'missing-period', {
          cardTypes: [CardType.Planeswalker],
          legendary: true,
        }),
      ).toBe('-2|Draw a card.');
    });
  });

  it('only checks the evolution, Omen and Prepared fields of cards of that type', () => {
    expect(lintCardFace(face({ level1Text: ['draw a card'] }), MECHANICS)).toEqual([]);
    expect(
      lintCardFace(
        face({ cardTypes: [CardType.Evolution], level1Text: ['Draw a card'] }),
        MECHANICS,
      ).map(issue => [issue.field, issue.fieldName]),
    ).toEqual([['level1Text', 'Level 1 text']]);
  });
});
