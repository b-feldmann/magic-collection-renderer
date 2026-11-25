import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

import CardEditor from './CardEditor';
import CardInterface from '../../interfaces/CardInterface';
import { Store, StoreType } from '../../store';
import { updateCard } from '../../actions/cardActions';
import { CardType, CardState, RarityType } from '../../interfaces/enums';
import { setTrollMode } from '../../utils/useTrollMode';
import { EDIT_SAVE_OFFSET, EDIT_TIME_OFFSET, UNKNOWN_CREATOR } from '../../utils/constants';

vi.mock('../../actions/cardActions', () => ({
  updateCard: vi.fn().mockResolvedValue({}),
  deleteCard: vi.fn(),
}));

// jsdom polyfills required by antd components.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}

const makeCard = (
  cardText: string[],
  face: Partial<CardInterface['front']> = {},
): CardInterface => ({
  name: 'Grizzled Scout',
  uuid: 'lint-test',
  manaCost: '{1}{g}',
  rarity: RarityType.Common,
  front: {
    name: 'Grizzled Scout',
    cardTypes: [CardType.Creature],
    cardText,
    cardStats: '2/2',
    ...face,
  },
  creator: UNKNOWN_CREATOR,
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: 0,
    createdAt: 0,
    state: CardState.Draft,
  },
});

const mockStoreValue: StoreType = {
  cards: [],
  mechanics: [{ uuid: 'mech-1', name: 'Enrage', description: 'Whenever this is dealt damage.' }],
  annotationAccessor: {},
  user: [UNKNOWN_CREATOR],
  currentUser: UNKNOWN_CREATOR,
  dispatch: () => {},
};

const renderEditor = (card: CardInterface) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <CardEditor card={card} saveTmpCard={() => {}} />
    </Store.Provider>,
  );

const getHints = (fieldName = 'Card text') =>
  screen.getByRole('group', { name: `Templating hints for ${fieldName}` });
const queryHints = (fieldName = 'Card text') =>
  screen.queryByRole('group', { name: `Templating hints for ${fieldName}` });
// The editor field (data-field-key) a hints panel is shown in.
const fieldOf = (element: HTMLElement) =>
  element.closest('[data-field-key]')?.getAttribute('data-field-key');

describe('CardEditor - templating hints', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (updateCard as Mock).mockClear();
  });

  afterEach(() => {
    act(() => setTrollMode(false));
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows no hints for text templated like current cards', () => {
    renderEditor(makeCard(['Flying', 'When this creature enters, draw a card.']));
    expect(queryHints()).toBeNull();
  });

  it('points out a common creature without rules text', () => {
    renderEditor(makeCard([]));
    expect(getHints().textContent).toContain('This creature has no rules text');
  });

  it('lists hints with their line', () => {
    renderEditor(makeCard(['Flying', 'When ~ enters the battlefield, draw a card.']));

    const items = within(getHints()).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(fieldOf(getHints())).toBe('cardText');
    expect(items[0].textContent).toContain('Line 2');
    expect(within(items[0]).getByRole('button', { name: 'Use "this creature"' })).toBeDefined();
    expect(within(items[1]).getByRole('button', { name: 'Use "enters"' })).toBeDefined();
  });

  it('marks text that renders wrong as a warning', () => {
    renderEditor(makeCard(['[Enrag] Draw a card.']));
    expect(within(getHints()).getByRole('img', { name: 'Warning' })).toBeDefined();
  });

  it('applies a fix to the card text and saves it', async () => {
    renderEditor(makeCard(['Flying', 'When ~ enters the battlefield, draw a card.']));

    fireEvent.click(within(getHints()).getByRole('button', { name: 'Use "enters"' }));
    await act(async () => {
      vi.advanceTimersByTime(EDIT_SAVE_OFFSET + EDIT_TIME_OFFSET + 100);
    });

    const textarea = screen.getByLabelText('Card text') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Flying\nWhen ~ enters, draw a card.');
    const persisted = (updateCard as Mock).mock.calls.slice(-1)[0][1] as CardInterface;
    expect(persisted.front.cardText).toEqual(['Flying', 'When ~ enters, draw a card.']);
    expect(within(getHints()).getAllByRole('listitem')).toHaveLength(1);
  });

  it('shows hints for the Adventure text below that field', async () => {
    renderEditor(
      makeCard(['Flying'], {
        cardTypes: [CardType.Creature, CardType.Adventure],
        adventureText: ['Draw a card', 'Until the end of turn, creatures get +1/+0.'],
      }),
    );

    expect(queryHints()).toBeNull();
    const hints = getHints('Adventure text');
    expect(fieldOf(hints)).toBe('adventureText');
    expect(within(hints).getAllByRole('listitem')).toHaveLength(2);

    fireEvent.click(within(hints).getByRole('button', { name: 'Add period' }));
    await act(async () => {
      vi.advanceTimersByTime(EDIT_SAVE_OFFSET + EDIT_TIME_OFFSET + 100);
    });

    const persisted = (updateCard as Mock).mock.calls.slice(-1)[0][1] as CardInterface;
    expect(persisted.front.adventureText).toEqual([
      'Draw a card.',
      'Until the end of turn, creatures get +1/+0.',
    ]);
    expect(persisted.front.cardText).toEqual(['Flying']);
  });

  it('shows hints for level text below its level', () => {
    renderEditor(
      makeCard(['Draw a card'], {
        cardTypes: [CardType.Evolution],
        level1Text: ['converted mana cost matters.'],
      }),
    );

    expect(fieldOf(getHints())).toBe('cardText');
    const levelHints = getHints('Level 1 text');
    expect(fieldOf(levelHints)).toBe('level1Text');
    expect(within(levelHints).getAllByRole('listitem')).toHaveLength(2);
  });
  it('shows card structure hints without a line or fix', () => {
    renderEditor(
      makeCard(['Enchanted creature gets +1/+1.'], {
        cardTypes: [CardType.Enchantment],
        cardSubTypes: 'Aura',
      }),
    );

    const [item] = within(getHints()).getAllByRole('listitem');
    expect(item.textContent).toContain('Enchant line');
    expect(item.textContent).not.toContain('Line 1');
    expect(within(item).queryByRole('button')).toBeNull();
  });

  it('shows a missing power and toughness below the stats field', () => {
    renderEditor(makeCard(['Flying'], { cardStats: '' }));

    const hints = getHints('Power/Toughness');
    expect(fieldOf(hints)).toBe('cardStats');
    expect(hints.textContent).toContain('no power and toughness');
  });

  it('rewords open hints when troll mode is switched, but keeps their advice and fixes', () => {
    renderEditor(makeCard(['When ~ enters the battlefield, draw a card.']));
    const messages = () =>
      within(getHints())
        .getAllByRole('listitem')
        .map(item => item.querySelector('p')!.textContent!);
    const plain = messages();

    act(() => setTrollMode(true));
    messages().forEach((message, index) => {
      expect(message).not.toBe(plain[index]);
      expect(message.endsWith(plain[index])).toBe(true);
    });
    expect(within(getHints()).getByRole('button', { name: 'Use "enters"' })).toBeDefined();

    act(() => setTrollMode(false));
    expect(messages()).toEqual(plain);
  });
});
