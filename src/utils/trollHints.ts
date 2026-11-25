import { RulesTextLintIssue, RulesTextLintRule } from './rulesTextLint';

/**
 * Troll mode: a passive-aggressive remark for every templating rule, put in front of the hint. The
 * hint itself stays as it is, so it remains useful. A remark has to fit every message of its rule.
 */
export const TROLL_REMARKS: Record<RulesTextLintRule, string[]> = {
  'unknown-symbol': [
    "Oh, we're inventing symbols now? How creative.",
    "I'm sure that symbol means a lot to you.",
  ],
  'unknown-mechanic': [
    'Bold of you to assume anyone else knows what this is.',
    "I looked everywhere for this one. Don't worry, I had nothing better to do.",
  ],
  'unclosed-symbol': [
    "Brackets come in pairs, but I'm sure you were busy.",
    'No, no, leave it half finished. Everyone loves a cliffhanger.',
  ],
  'bare-mana': [
    "Braces are only two extra keystrokes, but I get it, you're tired.",
    "Plain letters and numbers. Sure. We'll all just guess, shall we?",
  ],
  'loyalty-cost': [
    'What an interesting way to write a planeswalker ability.',
    'Planeswalkers have only been around since 2007, so no pressure.',
  ],
  'cardname-placeholder': [
    'CARDNAME. What a lovely name. Did you pick it yourself?',
    "I'm sure you were going to come back to this. Eventually.",
  ],
  'tap-symbol': [
    "There's a symbol for that. There has been for a while. No rush.",
    'Doing it without the symbol is charming, in a 1993 kind of way.',
  ],
  'literal-name': [
    "Oh good, the name again. In case we'd forgotten it.",
    "It's fine, the card can talk about itself in the third person. Very regal.",
  ],
  'self-reference': [
    'I see someone stopped reading release notes in 2024.',
    'Not every card is legendary, as much as you may want yours to be.',
  ],
  enters: [
    "Everyone else moved on, but it's sweet that you're holding on.",
    'Were you paid by the word?',
  ],
  'mana-value': ['Somebody misses the good old days.', "I'll just pretend it's 2020 again, then."],
  pronoun: [
    'Why use one word when you can use three words nobody prints anymore?',
    'Per the memo you surely read years ago:',
  ],
  'until-end-of-turn': ["So close. I'm almost proud.", 'Four little words, and yet here we are.'],
  'your-choice-of': [
    "It's your choice, of course. It's just the wrong one.",
    'I love how you put the words in an order.',
  ],
  'create-token': [
    "I'm sure your token will be very special anyway.",
    "Don't mind me, I only know how every other token card is worded.",
  ],
  'number-words': [
    'Digits. How efficient. You must be in a terrible hurry.',
    "I'd count the reasons this is wrong, but I'd have to spell them out.",
  ],
  'when-whenever': [
    "When, whenever, what's the difference? Apart from the rules, obviously.",
    'You flipped a coin for this one, right? No judgment.',
  ],
  dies: [
    'We have a word for this, but please, take the scenic route.',
    "A little wordy for a funeral, don't you think?",
  ],
  'outdated-term': [
    'Wow, vintage. Did you find this in the attic?',
    "My grandmother's cards say that too.",
  ],
  article: [
    'Two options, and you still picked that one. Interesting.',
    'Try reading it out loud. Or at all.',
  ],
  spacing: ['I see the space bar got away from you.', 'I needed some space too, but not here.'],
  'enchant-line': [
    'No worries, players love a puzzle.',
    "It's only the one line every Aura is built around. Easily overlooked.",
  ],
  'equip-line': [
    'A lovely decoration. Shame nobody can pick it up.',
    'I assume it equips itself through sheer willpower?',
  ],
  'crew-line': ['A parked car. How ambitious.', "I'm sure it looks great in the garage."],
  modes: [
    'Choices are overrated anyway, right?',
    'You promised options. I was looking forward to them.',
  ],
  'saga-chapters': [
    "What a gripping story. I just can't follow it.",
    "Storytelling is hard. I'm a computer, so I wouldn't know.",
  ],
  'off-color-cost': [
    "The color pie is more of a suggestion, isn't it?",
    "I'm sure you had a very good reason for this. I'd love to hear it someday.",
  ],
  'missing-stats': ["Don't tell me, it's a surprise?", 'I see we left the hard part for later.'],
  capitalization: [
    'The shift key is right there, next to your excuses.',
    "Capital letters aren't a matter of taste, but it's cute that you tried.",
  ],
  'missing-period': [
    'Were you going to finish that, or…',
    "It's one tiny dot. I'm not upset, just disappointed.",
  ],
  'double-punctuation': [
    'You feel strongly about punctuation, just not about where it goes.',
    'I admire your enthusiasm for the period key, if not the aim.',
  ],
  'card-type-text': [
    'You do know what kind of card this is, right? Just checking.',
    "I'm sure this works in a different game.",
  ],
  'duplicate-keyword': [
    'Subtle. I almost missed what this card does.',
    "I'll say it once, since one of us should.",
  ],
  'common-complexity': [
    'This was going to be a simple card, I hear.',
    'I hope your players brought reading glasses and a packed lunch.',
  ],
  'uncommon-complexity': [
    'Somebody really wanted to design a rare.',
    'Editing is a skill too, you know.',
  ],
  'vanilla-creature': [
    'Wow. You must have worked on this one all night.',
    'Minimalism. Or did you just give up?',
  ],
  'activated-ability': [
    'Players will figure it out. They always have to, with your cards.',
    "I'm sure that cost made sense in your head.",
  ],
  'keyword-placement': [
    "Oh, you put it there. No, it's fine. I'll find it.",
    'Every other card agrees on where this goes, but you do you.',
  ],
  'token-card': [
    'Players can always use a coin, I suppose.',
    "Don't mind me, I only give advice nobody takes.",
  ],
  'token-reference': [
    'I tried to work out what you meant. I really did.',
    'A token reference! Almost used correctly, too.',
  ],
  'token-shorthand': [
    'You typed all of that by hand? You poor thing.',
    "There's a shortcut, but I see you have plenty of time.",
  ],
};

// The same hint keeps its remark while the card is edited; hints of neighboring lines differ.
const remarkIndex = (key: string, count: number) =>
  [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0) % count;

/** The hint's message as troll mode words it. */
export const getTrollMessage = ({
  key,
  rule,
  message,
}: Pick<RulesTextLintIssue, 'key' | 'rule' | 'message'>): string => {
  const remarks = TROLL_REMARKS[rule];
  return `${remarks[remarkIndex(key, remarks.length)]} ${message}`;
};
