import { describe, expect, it } from 'vitest';

import { CardType } from '../interfaces/enums';
import { getRulesTextTags } from './rulesTextTags';

interface Example {
  // Paste the rules text exactly as on the card (several lines are fine).
  text: string;
  // Card types of the face; only needed for type-dependent tags such as Ramp.
  types?: CardType[];
  // All tags expected for the text, in any order. [] means "no tag".
  tags: string[];
}

const creature = [CardType.Creature];

// Add new cases here: paste rules text and list the tags you expect.
const examples: Example[] = [
  // Creature Removal
  { text: 'Destroy target creature.', tags: ['Creature Removal'] },
  {
    text:
      'When ~ enters the battlefield create a food token.\n' +
      '\n' +
      '{t}: Add one mana of any color',
    tags: ['Ramp'],
  },
  {
    text: 'Search your library for up to two basic land cards, put them onto the battlefield, then shuffle. Create a Food token for each basic land type among lands you control and a Junk token for each basic land type among land cards in your graveyard.',
    tags: ['Ramp'],
  },
  {
    text:
      'Prompt {1}{G}\n' +
      '\n' +
      '~ enters with a +1/+1 counter on it.\n' +
      '\n' +
      'When ~ enters, if you cast it from exile, proliferate.\n' +
      '\n' +
      '{T}: Add X mana of any one color, where X is the number of counters on ~.',
    tags: ['Ramp'],
  },
  {
    text: '~ deals 3 damage to target creature. When you cast ~ targeting a creature with toughness 4 or greater, you may discard a card. If you do, draw two cards.',
    tags: ['Creature Removal'],
  },
  {
    text:
      '[Cleave {1}{W}]\n' +
      'Choose target creature [your opponent or] you control. Move all counters from that creature to target permanent you control. Destroy the chosen creature.',
    tags: ['Creature Removal'],
  },
  {
    text:
      'When ~ enters, it deals 2 damage to any target.\n' +
      '\n' +
      '{2}, {t}, Sacrifice ~: Search your library for a Mountain card, reveal it, put it in your hand, then shuffle.',
    tags: ['Creature Removal'],
  },
  {
    text: 'Destroy target nonblack creature. It can’t be regenerated.',
    tags: ['Creature Removal'],
  },
  {
    text: "Choose any number of creatures you control. Each chosen creatures deals damage equals to it's attack to target creature you don't control. You choose the order.",
    tags: ['Creature Removal'],
  },
  {
    text:
      '~ deals damage equal to the number of lands you control to target creature. If this spell was cast from a graveyard, it deals damage equal to the number of land cards in your graveyard to that creature instead.\n' +
      '\n' +
      'Flashback {4}{R}',
    tags: ['Creature Removal'],
  },
  { text: 'Exile target creature an opponent controls.', tags: ['Creature Removal'] },
  { text: 'Exile target nonland permanent.', tags: ['Creature Removal'] },
  { text: 'Destroy up to two target creatures.', tags: ['Creature Removal'] },
  { text: 'Destroy all creatures. They can’t be regenerated.', tags: ['Creature Removal'] },
  { text: 'Lightning Bolt deals 3 damage to any target.', tags: ['Creature Removal'] },
  {
    text: 'This spell deals 4 damage to target creature or planeswalker.',
    tags: ['Creature Removal'],
  },
  { text: 'Pyroclasm deals 2 damage to each creature.', tags: ['Creature Removal'] },
  {
    text: 'Target creature you control deals damage equal to its power to target creature you don’t control.',
    tags: ['Creature Removal'],
  },
  { text: 'Target creature gets -3/-3 until end of turn.', tags: ['Creature Removal'] },
  {
    text: 'Creatures your opponents control get -1/-1 until end of turn.',
    tags: ['Creature Removal'],
  },
  { text: 'Each opponent sacrifices a creature.', tags: ['Creature Removal'] },
  {
    text: 'Target creature you control fights target creature you don’t control.',
    tags: ['Creature Removal'],
  },
  { text: 'Destroy target artifact.', tags: [] },
  { text: 'Exile target creature card from a graveyard.', tags: [] },
  { text: 'Target creature gets -2/-0 until end of turn.', tags: [] },
  { text: 'This creature deals 2 damage to target player.', tags: [] },

  // Ramp
  { text: '{T}: Add {G}.', types: creature, tags: ['Ramp'] },
  { text: '[Flying]\n{T}: Add one mana of any color.', types: creature, tags: ['Ramp'] },
  { text: '{T}, Pay 1 life: Add {B}.', types: creature, tags: ['Ramp'] },
  { text: '{T}: Add {G}.', types: [CardType.Land], tags: [] },
  { text: '{T}: Add {C}.', types: [CardType.Artifact], tags: ['Ramp'] },
  { text: '{T}: Draw a card.', types: creature, tags: [] },
  {
    text: '{T}: Add X mana of any one color, where X is the number of counters on ~.',
    types: creature,
    tags: ['Ramp'],
  },

  // Flicker
  {
    text: 'Exile target creature you control, then return it to the battlefield.',
    tags: ['Flicker'],
  },
  {
    text: 'Exile target creature you control, then return that card to the battlefield under its owner’s control.',
    tags: ['Flicker'],
  },
  {
    text: 'Exile target nontoken creature you control. Return it to the battlefield under its owner’s control at the beginning of the next end step.',
    tags: ['Flicker'],
  },
  {
    text: 'When ~ enters, exile another target creature you control, then return that card to the battlefield under your control.',
    types: creature,
    tags: ['Flicker'],
  },
  {
    text: 'Exile any number of target creatures you control. Return those cards to the battlefield under their owner’s control.',
    tags: ['Flicker'],
  },
  {
    text: 'Exile target creature. Its controller creates a 1/1 token.',
    tags: ['Creature Removal'],
  },
  {
    text: 'Return target creature you control to its owner’s hand.',
    tags: [],
  },

  // Combat Trick
  { text: 'Target creature gets +2/+2 until end of turn.', tags: ['Combat Trick'] },
  {
    text: 'Target creature gets +3/+3 until end of turn.',
    types: [CardType.Instant],
    tags: ['Combat Trick'],
  },
  {
    text: 'Target creature you control gets +1/+0 and gains first strike until end of turn.',
    types: [CardType.Instant],
    tags: ['Combat Trick'],
  },
  {
    text: 'Target creature you control gains indestructible until end of turn.',
    types: [CardType.Instant],
    tags: ['Combat Trick'],
  },
  {
    text: 'Creatures you control get +2/+2 and gain trample until end of turn.',
    types: [CardType.Instant],
    tags: ['Combat Trick'],
  },
  {
    text: 'Put two +1/+1 counters on target creature.',
    types: [CardType.Instant],
    tags: ['Combat Trick'],
  },
  {
    text: 'Flash\nWhen this creature enters, target creature you control gets +2/+2 until end of turn.',
    types: creature,
    tags: ['Combat Trick'],
  },
  {
    text: 'Target creature gets +2/+2 until end of turn.',
    types: [CardType.Sorcery],
    tags: [],
  },
  {
    text: 'When this creature enters, target creature gets +1/+1 until end of turn.',
    types: creature,
    tags: [],
  },
  {
    text: 'Target creature gets +2/+2.',
    types: [CardType.Enchantment],
    tags: [],
  },
  {
    text: 'Target creature gets -3/-3 until end of turn.',
    types: [CardType.Instant],
    tags: ['Creature Removal'],
  },

  // Small Reanimator
  {
    text: 'Return target creature card with mana value 2 or less from your graveyard to the battlefield.',
    tags: ['Small Reanimator'],
  },
  {
    text: 'When ~ enters, return target permanent with mana value 2 or less from your graveyard to the battlefield. It gains haste. Sacrifice it at the beginning of the next end step.',
    tags: ['Small Reanimator'],
  },
  {
    text: 'When ~ enters, you may return target permanent with mana value 2 or less from your graveyard to the battlefield.',
    tags: ['Small Reanimator'],
  },
  {
    text:
      'Return target creature card with mana value 3 or less from your graveyard to the battlefield with an additional +1/+1 counter on it.\n' +
      '\n' +
      '[Flashback -- {2}{W}, Sacrifice a creature.]',
    tags: ['Small Reanimator'],
  },
  {
    text: 'When this creature enters, return target creature card with power 2 or less from your graveyard to the battlefield.',
    types: creature,
    tags: ['Small Reanimator'],
  },
  {
    text: 'Put target creature card with mana value 3 or less from a graveyard onto the battlefield under your control.',
    tags: ['Small Reanimator'],
  },
  {
    text: 'Return target creature card from your graveyard to the battlefield.',
    tags: [],
  },
  {
    text: 'Return target creature card with mana value 2 or less from your graveyard to your hand.',
    tags: [],
  },

  // Graveyard Leave
  {
    text: 'Whenever one or more cards leave your graveyard, put a +1/+1 counter on this creature.',
    tags: ['Graveyard Leave'],
  },
  { text: 'When this card leaves your graveyard, draw a card.', tags: ['Graveyard Leave'] },
  {
    text: 'At the beginning of your end step, if a card left your graveyard this turn, draw a card.',
    tags: ['Graveyard Leave'],
  },
  { text: 'Whenever this creature leaves the battlefield, draw a card.', tags: [] },

  // Combinations
  {
    text: '{T}: Add {G}.\n{2}{G}, {T}: This creature fights target creature you don’t control.',
    types: creature,
    tags: ['Creature Removal', 'Ramp'],
  },
];

describe('getRulesTextTags', () => {
  it.each(examples)('$text → $tags', ({ text, types, tags }) => {
    expect([...getRulesTextTags(text, types)].sort()).toEqual([...tags].sort());
  });
});
