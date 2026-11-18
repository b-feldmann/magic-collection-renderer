import { describe, expect, it } from 'vitest';
import CardFaceInterface from '../interfaces/CardFaceInterface';
import MechanicInterface from '../interfaces/MechanicInterface';
import { CardType } from '../interfaces/enums';
import { applyLintFix, getSelfNoun, lintCardFace, RulesTextLintRule } from './rulesTextLint';

const face = (overrides: Partial<CardFaceInterface> = {}): CardFaceInterface => ({
  name: 'Grizzled Scout',
  cardTypes: [CardType.Creature],
  cardText: [],
  cardStats: '2/2',
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
        '* Target player mills two cards.',
        '* Target player gains 3 life.',
        'Choose one or both -',
        '- Draw a card.',
        '- Scry 2.',
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

    it('flags unclosed braces and brackets and closes known symbols', () => {
      expect(fixed('{2, {t}: Draw a card.', 'unclosed-symbol')).toBe('{2}, {t}: Draw a card.');
      expect(rules(['[Enrage Draw a card.'])).toEqual(['unclosed-symbol']);
      expect(rules(['Draw a card}.'])).toEqual(['unclosed-symbol']);
      const [issue] = lint(['{qq Draw a card.']);
      expect(issue.rule).toBe('unclosed-symbol');
      expect(issue.fix).toBeUndefined();
    });

    it('turns mana typed without braces into mana symbols', () => {
      expect(fixed('2G, {t}: Draw a card.', 'bare-mana')).toBe('{2}{g}, {t}: Draw a card.');
      expect(fixed('X: This creature gets +X/+0 until end of turn.', 'bare-mana')).toBe(
        '{x}: This creature gets +X/+0 until end of turn.',
      );
      expect(fixed('{t}: Add R or G.', 'bare-mana')).toBe('{t}: Add {r} or {g}.');
      expect(rules(['Sacrifice a creature: Add {c}{c}.'])).toEqual([]);
      expect(rules(['Sacrifice two creatures: Draw a card.'])).toEqual([]);
    });

    it('moves a typed planeswalker cost into the loyalty shield', () => {
      const planeswalker = { cardTypes: [CardType.Planeswalker], legendary: true };
      expect(fixed('+1: Draw a card.', 'loyalty-cost', planeswalker)).toBe('+1|Draw a card.');
      expect(fixed('−X: Exile a creature.', 'loyalty-cost', planeswalker)).toBe(
        '-X|Exile a creature.',
      );
      expect(rules(['0: Draw a card.'], planeswalker)).toEqual(['loyalty-cost']);
      expect(rules(['+1: Draw a card.'])).toEqual([]);
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

    it('writes counts of objects as words and keeps other numbers as digits', () => {
      expect(fixed('Draw 2 cards.', 'number-words')).toBe('Draw two cards.');
      expect(fixed('Put 3 +1/+1 counters on target creature.', 'number-words')).toBe(
        'Put three +1/+1 counters on target creature.',
      );
      expect(fixed('Create 2 1/1 white Soldier creature tokens.', 'number-words')).toBe(
        'Create two 1/1 white Soldier creature tokens.',
      );
      expect(fixed('Destroy up to 2 target artifacts.', 'number-words')).toBe(
        'Destroy up to two target artifacts.',
      );
      expect(fixed('Choose 2 --', 'number-words')).toBe('Choose two --');
      expect(fixed('Exile the top 3 cards of your library.', 'number-words')).toBe(
        'Exile the top three cards of your library.',
      );
      const [one] = lint(['Draw 1 card.']);
      expect(one.rule).toBe('number-words');
      expect(one.fix).toBeUndefined();
      expect(
        rules([
          'This creature deals 3 damage to any target and you gain 3 life.',
          'Scry 2, then draw a card.',
          'Create a 2/2 green Bear creature token.',
          'Destroy target creature with mana value 3 or less.',
          'Spells you cast cost {2} more to cast.',
        ]),
      ).toEqual([]);
    });

    it('uses "whenever" for repeatable events and "when" for entering and dying', () => {
      expect(fixed('When this creature attacks, draw a card.', 'when-whenever')).toBe(
        'Whenever this creature attacks, draw a card.',
      );
      expect(
        fixed(
          'When enchanted creature deals combat damage to a player, draw a card.',
          'when-whenever',
        ),
      ).toBe('Whenever enchanted creature deals combat damage to a player, draw a card.');
      expect(fixed('Whenever this creature dies, draw a card.', 'when-whenever')).toBe(
        'When this creature dies, draw a card.',
      );
      expect(
        rules([
          'Whenever this creature enters or attacks, draw a card.',
          'When target creature dies this turn, draw a card.',
          'Whenever equipped creature dies, draw a card.',
          'Whenever another creature you control dies, draw a card.',
        ]),
      ).toEqual([]);
    });

    it('says "dies" for creatures put into a graveyard from the battlefield', () => {
      expect(
        fixed(
          'When this creature is put into a graveyard from the battlefield, draw a card.',
          'dies',
        ),
      ).toBe('When this creature dies, draw a card.');
      expect(
        fixed(
          'Whenever one or more creatures you control are put into your graveyard from the battlefield, scry 1.',
          'dies',
        ),
      ).toBe('Whenever one or more creatures you control die, scry 1.');
      expect(
        rules(['When this artifact is put into a graveyard from the battlefield, draw a card.'], {
          cardTypes: [CardType.Artifact],
        }),
      ).toEqual([]);
    });

    it('replaces outdated terms', () => {
      expect(fixed('Remove target creature from the game.', 'outdated-term')).toBe(
        'Exile target creature.',
      );
      expect(fixed('This creature is unblockable.', 'outdated-term')).toBe(
        "This creature can't be blocked.",
      );
      expect(fixed('Creatures come into play tapped.', 'outdated-term')).toBe(
        'Creatures enter tapped.',
      );
      expect(
        fixed('Return target card removed from the game to its owner’s hand.', 'outdated-term'),
      ).toBe('Return target card exiled to its owner’s hand.');
      expect(fixed('Put target creature card from a graveyard into play.', 'outdated-term')).toBe(
        'Put target creature card from a graveyard onto the battlefield.',
      );
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

    it('fixes "a" and "an"', () => {
      expect(fixed('Put an +1/+1 counter on target creature.', 'article')).toBe(
        'Put a +1/+1 counter on target creature.',
      );
      expect(fixed('Create a 8/8 black Octopus creature token.', 'article')).toBe(
        'Create an 8/8 black Octopus creature token.',
      );
      expect(fixed('Return a artifact card from your graveyard to your hand.', 'article')).toBe(
        'Return an artifact card from your graveyard to your hand.',
      );
      expect(
        rules([
          'Create an X/X green Ooze creature token and a 1/1 Elf token.',
          'Draw a card for each one of them.',
          'Untap an untapped creature.',
        ]),
      ).toEqual([]);
    });

    it('fixes double spaces and spaces before punctuation', () => {
      expect(fixed('Draw a card  and gain 3 life .', 'spacing')).toBe(
        'Draw a card and gain 3 life.',
      );
      expect(fixed('{t} : Add {g}.', 'spacing')).toBe('{t}: Add {g}.');
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

  describe('card structure', () => {
    const aura = { cardTypes: [CardType.Enchantment], cardSubTypes: 'Aura', cardStats: '' };

    // The structure hints of a face, without line hints.
    const structure = (overrides: Partial<CardFaceInterface>, manaCost?: string) =>
      lintCardFace(face(overrides), MECHANICS, { manaCost }).filter(issue =>
        [
          'enchant-line',
          'equip-line',
          'crew-line',
          'modes',
          'off-color-cost',
          'missing-stats',
        ].includes(issue.rule),
      );

    it('never offers a fix', () => {
      const issues = [
        ...structure({ ...aura, cardText: ['Enchanted creature gets +1/+1.'] }),
        ...structure({ cardText: ['Choose two --', '* Draw a card.'] }),
        ...structure({ cardStats: '' }),
      ];
      expect(issues).toHaveLength(3);
      issues.forEach(issue => expect(issue.fix).toBeUndefined());
    });

    it('expects an Enchant line first on Auras', () => {
      const [missing] = structure({ ...aura, cardText: ['Enchanted creature gets +1/+1.'] });
      expect(missing).toMatchObject({ rule: 'enchant-line', field: 'cardText', line: undefined });

      const [misplaced] = structure({
        ...aura,
        cardText: ['Flash', 'Enchant creature', 'Enchanted creature gets +1/+1.'],
      });
      expect(misplaced).toMatchObject({ rule: 'enchant-line', line: 1 });

      expect(
        structure({ ...aura, cardText: ['Enchant creature', 'Enchanted creature gets +1/+1.'] }),
      ).toEqual([]);
    });

    it('expects an Equip line on Equipment and a Crew line on Vehicles', () => {
      const equipment = {
        cardTypes: [CardType.Artifact],
        cardSubTypes: 'Equipment',
        cardStats: '',
      };
      expect(
        structure({ ...equipment, cardText: ['Equipped creature gets +1/+1.'] }).map(i => i.rule),
      ).toEqual(['equip-line']);
      expect(
        structure({ ...equipment, cardText: ['Equipped creature gets +1/+1.', 'Equip {2}'] }),
      ).toEqual([]);

      const vehicle = { cardTypes: [CardType.Artifact], vehicle: true, cardStats: '3/3' };
      expect(structure({ ...vehicle, cardText: ['Trample'] }).map(i => i.rule)).toEqual([
        'crew-line',
      ]);
      expect(structure({ ...vehicle, cardText: ['Trample', 'Crew 2'] })).toEqual([]);
      // A Vehicle switch left on after the card stopped being an artifact doesn't count.
      expect(structure({ vehicle: true, cardText: ['Trample'] })).toEqual([]);
    });

    it('expects more modes than a modal ability chooses', () => {
      const [issue] = structure({ cardText: ['Choose two --', '* Draw a card.', '* Scry 2.'] });
      expect(issue).toMatchObject({ rule: 'modes', line: 0 });
      expect(issue.message).toContain('at least 3 modes');
      expect(structure({ cardText: ['Choose one or both --', '* Draw a card.'] })).toHaveLength(1);
      expect(structure({ cardText: ['Choose one --', '* Draw a card.', '* Scry 2.'] })).toEqual([]);
      expect(structure({ cardText: ['Choose one target creature. It gains flying.'] })).toEqual([]);
    });

    it('points out activated abilities in colors outside the mana cost', () => {
      const [issue] = structure({ cardText: ['{1}{r}: This creature gets +1/+0.'] }, '{1}{g}');
      expect(issue).toMatchObject({ rule: 'off-color-cost', line: 0 });
      expect(issue.message).toContain('{r}');
      expect(
        structure(
          {
            cardText: [
              '{g/w}, {t}: Untap target land.',
              '{2}{gp}: Draw a card.',
              '{ut}: Add {r}.',
              'Kicker {r}',
            ],
          },
          '{1}{g}',
        ),
      ).toEqual([]);
      // Without a mana cost (lands, back faces) there's nothing to compare with.
      expect(structure({ cardText: ['{r}: Draw a card.'] })).toEqual([]);
    });

    it('expects stats on creatures, Vehicles and planeswalkers', () => {
      expect(structure({ cardStats: '' })).toMatchObject([
        { rule: 'missing-stats', field: 'cardStats', fieldName: 'Power/Toughness' },
      ]);
      expect(structure({ cardStats: '2/' })[0].message).toBe('This creature has no toughness.');
      expect(
        structure({ cardTypes: [CardType.Planeswalker], legendary: true, cardStats: '' }),
      ).toMatchObject([{ rule: 'missing-stats', fieldName: 'Loyalty' }]);
      expect(structure({ cardTypes: [CardType.Instant], cardStats: '' })).toEqual([]);
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
