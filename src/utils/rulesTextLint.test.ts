import { describe, expect, it } from 'vitest';
import CardFaceInterface from '../interfaces/CardFaceInterface';
import MechanicInterface from '../interfaces/MechanicInterface';
import CardInterface from '../interfaces/CardInterface';
import { CardType, ColorType, RarityType } from '../interfaces/enums';
import { applyLintFix, getSelfNoun, lintCardFace, RulesTextLintRule } from './rulesTextLint';
import { getTokenCardFaces } from './tokenLinks';

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
      expect(rules(['{2}{w/u}, {T}: Draw a card.'])).toEqual(['unknown-symbol']);
      expect(rules(['{2}{wu}{rp}{x}, {t}: Draw a card.'])).toEqual([]);
      expect(
        rules(['Flying', '+1: Draw a card.', '−X: Exile a creature.'], {
          cardTypes: [CardType.Planeswalker],
          legendary: true,
        }),
      ).toEqual([]);
    });

    it('flags brackets that are no mechanic and fixes their capitalization', () => {
      expect(rules(['[Enrag] Draw a card.'])).toEqual(['unknown-mechanic']);
      expect(fixed('[enrage] Draw a card.', 'unknown-mechanic')).toBe('[Enrage] Draw a card.');
    });

    it('accepts brackets that Cleave removes', () => {
      expect(
        rules([
          '[Cleave {1}{W}]',
          'Choose target creature [your opponent or] you control. Destroy it.',
        ]),
      ).not.toContain('unknown-mechanic');
      expect(rules(['Destroy target creature [your opponent or] you control.'])).toContain(
        'unknown-mechanic',
      );
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

    it('writes loyalty costs as in Oracle text', () => {
      const planeswalker = { cardTypes: [CardType.Planeswalker], legendary: true };
      const fixedCost = (line: string) => fixed(line, 'loyalty-cost', planeswalker);
      expect(fixedCost('+1|Draw a card.')).toBe('+1: Draw a card.');
      expect(fixedCost('-3: Exile a creature.')).toBe('−3: Exile a creature.');
      expect(fixedCost('{-x}|* Exile a creature.')).toBe('−X: * Exile a creature.');
      expect(fixedCost('[0]: Draw a card.')).toBe('0: Draw a card.');
      expect(fixedCost('|Flying')).toBe('Flying');
      expect(rules(['Flying', '+1: Draw a card.', '−3: Draw a card.'], planeswalker)).toEqual([]);
      expect(rules(['-3: Draw a card.'])).not.toContain('loyalty-cost');
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

    it('puts "your choice of" in front of a list of keywords or keyword counters', () => {
      expect(
        fixed(
          'Target creature gains flying, vigilance, or lifelink of your choice until end of turn.',
          'your-choice-of',
        ),
      ).toBe(
        'Target creature gains your choice of flying, vigilance, or lifelink until end of turn.',
      );
      expect(
        fixed(
          'Put a flying counter or a lifelink counter of your choice on target creature.',
          'your-choice-of',
        ),
      ).toBe('Put your choice of a flying counter or a lifelink counter on target creature.');
      expect(
        rules(['Target creature gains your choice of flying or lifelink until end of turn.']),
      ).toEqual([]);
    });

    it('keeps "of your choice" for a single open choice', () => {
      expect(
        rules([
          'Target creature you control gains protection from the color of your choice until end of turn.',
          'Each opponent sacrifices a creature or planeswalker of their choice.',
          'Choose a creature type. Creatures of the creature type of your choice get +1/+1.',
        ]),
      ).not.toContain('your-choice-of');
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

    it('removes a colon after "with" in token abilities', () => {
      const line =
        'When this creature enters, create a blue and red Elf Warrior token with: "{t}: Add one mana of any color."';
      expect(fixed(line, 'create-token')).toBe(
        'When this creature enters, create a blue and red Elf Warrior token with "{t}: Add one mana of any color."',
      );
      expect(
        rules(['Create a Food token with "{2}, {t}, Sacrifice this token: You gain 3 life."']),
      ).not.toContain('create-token');
    });
  });

  describe('capitalization and punctuation', () => {
    it('capitalizes abilities and lowercases later keywords', () => {
      expect(fixed('flying', 'capitalization')).toBe('Flying');
      expect(fixed('Flying, Trample', 'capitalization')).toBe('Flying, trample');
      expect(rules(['Flying, Trample, Haste'])).toEqual(['capitalization', 'capitalization']);
    });

    it('capitalizes the subtypes of created tokens', () => {
      expect(fixed('{t}: Create a white 1/1 soldier token.', 'capitalization')).toBe(
        '{t}: Create a white 1/1 Soldier token.',
      );
      expect(
        rules(['Create two 1/1 green and white elf warrior creature tokens with flying.']),
      ).toEqual(['capitalization', 'capitalization']);
      expect(fixed('Create a Food token and a treasure token.', 'capitalization')).toBe(
        'Create a Food token and a Treasure token.',
      );
      expect(fixed('Create an x/x green ooze creature token.', 'capitalization')).toBe(
        'Create an x/x green Ooze creature token.',
      );
    });

    it('leaves capitalized token subtypes and non-descriptions alone', () => {
      expect(
        rules([
          '{t}: Create a white 1/1 Soldier token.',
          'Create a tapped Treasure token and an additional Clue token.',
          'Create a token that’s a copy of target creature.',
          'Create a copy of target token you control.',
          'Whenever one or more tokens you control die, draw a card.',
          'Nontoken creatures you control get +1/+1.',
        ]),
      ).toEqual([]);
    });

    it('adds a missing period to sentences but not to keyword lines', () => {
      expect(fixed('When this creature enters, draw a card', 'missing-period')).toBe(
        'When this creature enters, draw a card.',
      );
      expect(fixed('{t}: Add {g}', 'missing-period')).toBe('{t}: Add {g}.');
      expect(rules(['Protection from black and from red'])).toEqual([]);
      expect(
        rules(['Enchant creature or planeswalker you control'], {
          cardTypes: [CardType.Enchantment],
          cardSubTypes: 'Aura',
          cardStats: '',
        }),
      ).toEqual([]);
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

    it('fixes periods doubled around quoted abilities', () => {
      expect(
        fixed(
          'Create a Treasure token with "{t}: Add one mana of any color.".',
          'double-punctuation',
        ),
      ).toBe('Create a Treasure token with "{t}: Add one mana of any color."');
      expect(fixed('It gains "{t}: Add {g}".', 'double-punctuation')).toBe(
        'It gains "{t}: Add {g}."',
      );
      expect(fixed('Draw a card..', 'double-punctuation')).toBe('Draw a card.');
      expect(
        rules([
          'Create a Treasure token with "{t}: Add one mana of any color."',
          'Look at the top card of your library... then draw a card.',
          'Name a card called "Bear".',
        ]),
      ).toEqual([]);
    });

    it('fixes activated abilities without a colon or with costs out of order', () => {
      expect(fixed('{t} Add {g}.', 'activated-ability')).toBe('{t}: Add {g}.');
      expect(fixed('{1}{g}, {t} Draw a card.', 'activated-ability')).toBe(
        '{1}{g}, {t}: Draw a card.',
      );
      expect(fixed('{t}, {1}: Draw a card.', 'activated-ability')).toBe('{1}, {t}: Draw a card.');
      expect(fixed('Sacrifice this creature, {t}: Draw a card.', 'activated-ability')).toBe(
        '{t}, Sacrifice this creature: Draw a card.',
      );
      expect(
        rules([
          '{2}, {t}, Sacrifice this creature: Draw a card.',
          '{ut}, Discard a card: Scry 1.',
          '{r} Draw a card.',
        ]).filter(rule => rule === 'activated-ability'),
      ).toEqual(['activated-ability']);
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
        fixed('−2: Draw a card', 'missing-period', {
          cardTypes: [CardType.Planeswalker],
          legendary: true,
        }),
      ).toBe('−2: Draw a card.');
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

    const ruleIssues = (rule: RulesTextLintRule, overrides: Partial<CardFaceInterface>) =>
      lintCardFace(face(overrides), MECHANICS).filter(issue => issue.rule === rule);

    describe('Sagas', () => {
      const saga = { cardTypes: [CardType.Enchantment, CardType.Saga], cardStats: undefined };

      it('accepts chapters and checks the text after them', () => {
        expect(
          rules(['I, II — Draw a card.', 'III — Choose one —', '* Scry 1.', '* Scry 2.'], saga),
        ).toEqual([]);
        expect(fixed('I, II — draw a card.', 'capitalization', saga)).toBe('I, II — Draw a card.');
        expect(getSelfNoun(face(saga))).toBe('Saga');
      });

      it('accepts a step without a chapter', () => {
        expect(rules(['Exile five cards.', 'I, II — Draw a card.'], saga)).toEqual([]);
      });

      it('points out missing chapters and chapters out of order', () => {
        const chapterIssues = (cardText: string[]) =>
          ruleIssues('saga-chapters', { ...saga, cardText });

        expect(chapterIssues(['Draw a card.'])).toHaveLength(1);
        expect(chapterIssues(['I — Draw a card.', 'III — Scry 1.'])).toMatchObject([{ line: 1 }]);
        expect(chapterIssues(['I, II — Draw a card.', 'III — Scry 1.'])).toEqual([]);
      });

      it('expects the keywords of a Saga creature after its chapters', () => {
        expect(
          rules(['I — Draw a card.', 'Flying'], {
            cardTypes: [CardType.Enchantment, CardType.Creature, CardType.Saga],
          }),
        ).toEqual([]);
        expect(
          rules(['Flying', 'I — Draw a card.'], {
            cardTypes: [CardType.Enchantment, CardType.Creature, CardType.Saga],
          }),
        ).toEqual(['saga-chapters']);
      });
    });

    it('offers to add the Aura subtype to an enchantment with an Enchant line', () => {
      const enchantIssue = (overrides: Partial<CardFaceInterface>) =>
        ruleIssues('card-type-text', { cardText: ['Enchant creature'], ...overrides })[0];

      expect(
        enchantIssue({ cardTypes: [CardType.Enchantment], cardSubTypes: '', cardStats: '' })
          .fieldFix,
      ).toEqual({ label: 'Add Aura subtype', field: 'cardSubTypes', value: 'Aura' });
      expect(
        enchantIssue({
          cardTypes: [CardType.Enchantment],
          cardSubTypes: ' Cartouche ',
          cardStats: '',
        }).fieldFix?.value,
      ).toBe('Cartouche Aura');
      // Only enchantments can be Auras.
      expect(enchantIssue({}).fieldFix).toBeUndefined();
    });

    it('points out text that only works on another card type', () => {
      const typeText = (overrides: Partial<CardFaceInterface>) =>
        ruleIssues('card-type-text', overrides);
      const instant = { cardTypes: [CardType.Instant], cardStats: '' };

      expect(typeText({ ...instant, cardText: ['Flash', 'Draw a card.'] })).toMatchObject([
        { line: 0 },
      ]);
      expect(
        typeText({
          cardTypes: [CardType.Sorcery],
          cardStats: '',
          cardText: ['When this sorcery enters, draw a card.'],
        })[0].message,
      ).toContain('never triggers');
      expect(typeText({ cardText: ['Enchanted creature gets +1/+1.'] })).toHaveLength(1);
      expect(typeText({ cardText: ['Enchant creature'] })).toHaveLength(1);
      expect(typeText({ cardText: ['Equipped creature gets +1/+1.'] })).toHaveLength(1);
      expect(
        typeText({ cardTypes: [CardType.Planeswalker], legendary: true, cardText: ['Flying'] }),
      ).toMatchObject([{ line: undefined }]);

      expect(
        typeText({ ...aura, cardText: ['Enchant creature', 'Enchanted creature gets +1/+1.'] }),
      ).toEqual([]);
      expect(typeText({ cardText: ['Bestow {3}{w}', 'Enchanted creature gets +1/+1.'] })).toEqual(
        [],
      );
      expect(
        typeText({ cardTypes: [CardType.Sorcery], cardStats: '', cardText: ['Flash'] }),
      ).toEqual([]);
      expect(
        typeText({
          cardTypes: [CardType.Planeswalker],
          legendary: true,
          cardText: ['+1: Draw a card.'],
        }),
      ).toEqual([]);
    });

    it('expects keywords at the top and Equip at the bottom', () => {
      const placement = (cardText: string[], overrides: Partial<CardFaceInterface> = {}) =>
        ruleIssues('keyword-placement', { cardText, ...overrides });
      expect(placement(['When this creature enters, draw a card.', 'Flying'])).toMatchObject([
        { line: 1 },
      ]);
      expect(
        placement(['Equip {2}', 'Equipped creature gets +1/+1.'], {
          cardTypes: [CardType.Artifact],
          cardSubTypes: 'Equipment',
          cardStats: '',
        }),
      ).toMatchObject([{ line: 0, message: expect.stringContaining('Equip goes last') }]);

      expect(
        placement([
          'Kicker {1}{g}',
          'Flying, vigilance',
          'When this creature enters, draw a card.',
          'Choose one --',
          '* Scry 2.',
          '[-Cycling {2}]',
          'Equip {2}',
          '[Plunder]',
        ]),
      ).toEqual([]);
    });

    it('points out duplicate and redundant keywords', () => {
      const keywords = (cardText: string[]) => ruleIssues('duplicate-keyword', { cardText });
      expect(keywords(['Flying', 'Vigilance, flying'])).toMatchObject([{ line: 1 }]);
      expect(keywords(['First strike, double strike'])[0].message).toContain(
        'first strike does nothing next to double strike',
      );
      expect(keywords(['Flying, reach'])).toHaveLength(1);
      expect(keywords(['Hexproof', 'Shroud'])).toMatchObject([{ line: 0 }]);
      expect(keywords(['Flying, vigilance', 'Ward {2}', 'Protection from red'])).toEqual([]);
      expect(keywords(['Protection from red', 'Protection from blue'])).toEqual([]);
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

  describe('common complexity', () => {
    const common = (cardText: string[], overrides: Partial<CardFaceInterface> = {}) =>
      lintCardFace(face({ cardText, ...overrides }), MECHANICS, { rarity: RarityType.Common })
        .filter(issue => issue.rule === 'common-complexity')
        .map(issue => issue.message);

    const longText = [
      'When this creature enters, look at the top four cards of your library. You may reveal a creature card from among them and put it into your hand.',
      'Put the rest on the bottom of your library in a random order, then each opponent loses 1 life.',
    ];

    it('flags long rules text on commons, without counting reminder text', () => {
      expect(common(longText)).toEqual([expect.stringContaining('47 words')]);
      expect(
        common([
          'Flying (This creature can’t be blocked except by creatures with flying or reach.)',
        ]),
      ).toEqual([]);
    });

    it('flags commons with more than three abilities, counting each keyword', () => {
      expect(common(['Flying, vigilance', 'When this creature enters, draw a card.'])).toEqual([]);
      expect(
        common(['Flying, vigilance, lifelink', 'When this creature enters, draw a card.']),
      ).toEqual([expect.stringContaining('4 abilities')]);
    });

    it('counts each mode but not the mode header as an ability', () => {
      const modal = (extra: string[]) =>
        common(['Choose one or both -', '* Target player draws a card.', ...extra], {
          cardTypes: [CardType.Sorcery],
        });
      expect(modal(['* Create a Treasure token.', '* [Creation]'])).toEqual([]);
      expect(modal(['* Create a Treasure token.', '* [Creation]', '* You gain 2 life.'])).toEqual([
        expect.stringContaining('4 abilities'),
      ]);
    });

    it('flags static effects on other creatures on commons', () => {
      expect(common(['Other Soldiers you control get +1/+1.'])).toEqual([
        expect.stringContaining('Static effects'),
      ]);
      expect(common(['Creatures your opponents control get -1/-0.'])).toHaveLength(1);
      expect(
        common(['Enchant creature', 'Enchanted creature gets +2/+2.'], {
          cardTypes: [CardType.Enchantment],
          cardSubTypes: 'Aura',
        }),
      ).toEqual([]);
      expect(
        common(['Creatures you control get +1/+1 until end of turn.'], {
          cardTypes: [CardType.Instant],
        }),
      ).toEqual([]);
      expect(common(['Whenever another creature you control dies, draw a card.'])).toEqual([]);
    });

    it('uses looser limits on uncommons and none on rares', () => {
      const uncommon = (cardText: string[]) =>
        lintCardFace(face({ cardText }), MECHANICS, { rarity: RarityType.Uncommon }).filter(
          issue => issue.rule === 'uncommon-complexity',
        );
      expect(uncommon(longText)).toEqual([]);
      expect(uncommon(['Other Soldiers you control get +1/+1.'])).toEqual([]);
      expect(
        uncommon([
          'Flying, vigilance, lifelink',
          'When this creature enters, draw a card.',
          'Whenever this creature attacks, scry 1.',
        ]),
      ).toMatchObject([{ message: expect.stringContaining('This uncommon has 5 abilities') }]);
      expect(
        uncommon([
          ...longText,
          'Whenever this creature attacks, each opponent loses 1 life and you gain 1 life for each creature you control.',
        ]),
      ).toMatchObject([{ message: expect.stringContaining('66 words') }]);

      expect(
        lintCardFace(face({ cardText: longText }), MECHANICS, { rarity: RarityType.Rare }),
      ).toEqual([]);
    });
  });

  describe('token cards', () => {
    const tokenCard = (front: Partial<CardFaceInterface>): CardInterface =>
      ({
        uuid: front.name,
        name: front.name,
        front: { cardText: [], cardTypes: [CardType.Token, CardType.Creature], ...front },
      }) as unknown as CardInterface;
    const tokenCards = getTokenCardFaces([
      tokenCard({ name: 'Soldier', cardSubTypes: 'Soldier', cardStats: '1/1' }),
      tokenCard({
        name: 'Food',
        cardSubTypes: 'Food',
        cardTypes: [CardType.Token, CardType.Artifact],
      }),
    ]);
    const tokens = (cardText: string[]) =>
      lintCardFace(face({ cardText }), MECHANICS, { tokenCards })
        .filter(issue => issue.rule === 'token-card')
        .map(issue => issue.message);

    it('accepts tokens that have a token card', () => {
      expect(
        tokens([
          'When this creature enters, create a 1/1 white Soldier creature token and a Food token.',
        ]),
      ).toEqual([]);
    });

    it('flags tokens without a token card on their line', () => {
      const [issue] = lintCardFace(
        face({ cardText: ['Flying', 'When this creature enters, create a Treasure token.'] }),
        MECHANICS,
        { tokenCards },
      );
      expect(issue).toMatchObject({
        rule: 'token-card',
        field: 'cardText',
        line: 1,
        message:
          "There's no token card for the Treasure token this creates. Add one so the token is printed with the set.",
      });
    });

    it('flags a token card with other power and toughness', () => {
      expect(tokens(['Create two 2/2 white Soldier creature tokens.'])).toEqual([
        'This creates a 2/2 Soldier token, but the Soldier token card is 1/1.',
      ]);
    });

    it('names the colors and abilities a token card of the same kind differs in', () => {
      const elfCards = getTokenCardFaces([
        tokenCard({
          name: 'Elf Warrior',
          cardSubTypes: 'Elf Warrior',
          cardStats: '1/1',
          tokenColors: [ColorType.Green],
          cardText: ['Trample'],
        }),
      ]);
      const elfTokens = (cardText: string[]) =>
        lintCardFace(face({ cardText }), MECHANICS, { tokenCards: elfCards })
          .filter(issue => issue.rule === 'token-card')
          .map(issue => issue.message);
      expect(
        elfTokens([
          'When this creature enters, create a 1/1 blue and red Elf Warrior creature token with flying.',
        ]),
      ).toEqual([
        "This creates a 1/1 Elf Warrior token, but the Elf Warrior token card is green, not blue and red, also has trample, and doesn't have flying. Add a token card for this one, or change the text to match that card.",
      ]);
      expect(
        elfTokens(['Create a 1/1 green Elf Warrior creature token with trample and haste.']),
      ).toEqual([
        "This creates a 1/1 Elf Warrior token, but the Elf Warrior token card doesn't have haste. Add a token card for this one, or change the text to match that card.",
      ]);
    });

    it('flags tokens a custom mechanic creates', () => {
      const plunder = {
        uuid: 'plunder',
        name: 'Plunder',
        description: 'Create {ref} Treasure tokens.',
      };
      const [issue] = lintCardFace(face({ cardText: ['[Plunder 2]'] }), [...MECHANICS, plunder], {
        tokenCards,
      }).filter(found => found.rule === 'token-card');
      expect(issue).toMatchObject({
        line: 0,
        message:
          "There's no token card for the Treasure token this creates through [Plunder]. Add one so the token is printed with the set.",
      });
    });

    it('is skipped without token cards', () => {
      expect(
        lintCardFace(face({ cardText: ['Create a Treasure token.'] }), MECHANICS).map(
          issue => issue.rule,
        ),
      ).not.toContain('token-card');
    });
  });
});
