import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import CardEditor from './CardEditor';
import CardInterface from '../../interfaces/CardInterface';
import { Store, StoreType } from '../../store';
import { CardType, CardState, ColorType, RarityType } from '../../interfaces/enums';
import { createCardFromTemplate } from '../../actions/cardActions';
import { UNKNOWN_CREATOR } from '../../utils/constants';

vi.mock('../../actions/cardActions', () => ({
  updateCard: vi.fn().mockResolvedValue({}),
  deleteCard: vi.fn(),
  createCardFromTemplate: vi.fn().mockResolvedValue({}),
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
  uuid: string,
  front: Partial<CardInterface['front']>,
  rarity = RarityType.Uncommon,
): CardInterface => ({
  name: front.name || uuid,
  uuid,
  manaCost: '{1}{w}',
  rarity,
  front: { name: uuid, cardTypes: [CardType.Creature], cardText: [], cardStats: '2/2', ...front },
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

const soldierToken = makeCard('soldier-token', {
  name: 'Soldier',
  cardTypes: [CardType.Token, CardType.Creature],
  cardSubTypes: 'Soldier',
  cardStats: '1/1',
});

// A custom mechanic whose reminder text creates a token.
const MUSTER = {
  uuid: 'muster',
  name: 'Muster',
  description: 'When this creature enters, create a 1/1 white Soldier creature token.',
};

const renderEditor = (card: CardInterface, onOpenCard = vi.fn(), others: CardInterface[] = []) => {
  const store: StoreType = {
    cards: [card, soldierToken, ...others].filter(
      (other, index, all) => all.findIndex(({ uuid }) => uuid === other.uuid) === index,
    ),
    mechanics: [MUSTER],
    annotationAccessor: {},
    user: [UNKNOWN_CREATOR],
    currentUser: UNKNOWN_CREATOR,
    dispatch: () => {},
  };
  render(
    <Store.Provider value={store}>
      <CardEditor card={card} saveTmpCard={() => {}} onOpenCard={onOpenCard} />
    </Store.Provider>,
  );
  return onOpenCard;
};

const queryHints = () => screen.queryByRole('group', { name: 'Templating hints for Card text' });

describe('CardEditor - token links and common complexity', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('links a created token to its token card', () => {
    const onOpenCard = renderEditor(
      makeCard('captain', {
        cardText: ['When this creature enters, create a 1/1 white Soldier creature token.'],
      }),
    );

    const links = screen.getByRole('region', { name: 'Token cards' });
    expect(links.closest('[data-field-key]')?.getAttribute('data-field-key')).toBe('cardText');
    const tokenCard = within(links).getByRole('button', {
      name: 'Open the 1/1 Soldier token card',
    });
    // The token card itself is rendered, not just its name.
    expect(tokenCard.querySelector('img[class*="mainframe"]')).not.toBeNull();
    expect(tokenCard.textContent).toContain('Soldier');
    fireEvent.click(tokenCard);
    expect(onOpenCard).toHaveBeenCalledWith('soldier-token');
    // The only hint offers the token reference. The token card has no colors set, so the hint
    // shows that the line would no longer say "white".
    const hints = queryHints()!;
    expect(within(hints).getAllByRole('listitem')).toHaveLength(1);
    expect(within(hints).getByText(/\[Token: 1\/1 Soldier\]/).textContent).toContain(
      'Then reads: "When this creature enters, create a 1/1 Soldier creature token."',
    );
  });

  it('replaces a written-out token with a token reference', () => {
    renderEditor(
      makeCard('captain', {
        cardText: ['When this creature enters, create a 1/1 white Soldier creature token.'],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Use token reference' }));
    expect(screen.getByLabelText('Card text')).toHaveProperty(
      'value',
      'When this creature enters, create [Token: 1/1 Soldier].',
    );
    // The reference still links to the token card.
    expect(
      within(screen.getByRole('region', { name: 'Token cards' })).getByRole('button', {
        name: 'Open the 1/1 Soldier token card',
      }),
    ).toBeTruthy();
  });

  it('links the token a custom mechanic creates to its token card', () => {
    const onOpenCard = renderEditor(makeCard('recruiter', { cardText: ['Flying, [Muster]'] }));

    const links = screen.getByRole('region', { name: 'Token cards' });
    fireEvent.click(within(links).getByRole('button', { name: 'Open the 1/1 Soldier token card' }));
    expect(onOpenCard).toHaveBeenCalledWith('soldier-token');
  });

  it('shows a token card the cards whose custom mechanic creates its token', () => {
    const recruiter = makeCard('recruiter', { name: 'Recruiter', cardText: ['[Muster]'] });
    const onOpenCard = renderEditor(soldierToken, vi.fn(), [recruiter]);

    const sources = screen.getByRole('region', { name: 'Cards that create this token' });
    fireEvent.click(within(sources).getByRole('button', { name: 'Open Recruiter' }));
    expect(onOpenCard).toHaveBeenCalledWith('recruiter');
  });

  it('links a token card to the cards that create its token', () => {
    const captain = makeCard('captain', {
      name: 'Captain',
      cardText: ['When this creature enters, create a 1/1 white Soldier creature token.'],
    });
    const onOpenCard = renderEditor(soldierToken, vi.fn(), [captain]);

    const sources = screen.getByRole('region', { name: 'Cards that create this token' });
    expect(sources.closest('[data-field-key]')?.getAttribute('data-field-key')).toBe('cardText');
    const source = within(sources).getByRole('button', { name: 'Open Captain' });
    expect(source.querySelector('img[class*="mainframe"]')).not.toBeNull();
    fireEvent.click(source);
    expect(onOpenCard).toHaveBeenCalledWith('captain');
  });

  it('does not list cards that create another token on a token card', () => {
    renderEditor(soldierToken, vi.fn(), [
      makeCard('big', { cardText: ['Create a 3/3 white Soldier creature token.'] }),
    ]);

    expect(screen.queryByRole('region', { name: 'Cards that create this token' })).toBeNull();
  });

  it('points out a token without a token card', () => {
    renderEditor(
      makeCard('prospector', { cardText: ['When this creature enters, create a Treasure token.'] }),
    );

    expect(screen.queryByRole('region', { name: 'Token cards' })).toBeNull();
    expect(queryHints()?.textContent).toContain("There's no token card for the Treasure token");
  });

  it('creates the missing token card from a hint', () => {
    renderEditor(
      makeCard('prospector', { cardText: ['When this creature enters, create a Treasure token.'] }),
    );

    fireEvent.click(within(queryHints()!).getByRole('button', { name: 'Create token card' }));
    expect(createCardFromTemplate).toHaveBeenCalledWith(
      expect.any(Function),
      {
        name: 'Treasure',
        front: {
          name: 'Treasure',
          cardTypes: [CardType.Token, CardType.Artifact],
          cardSubTypes: 'Treasure',
          cardText: ['{t}, Sacrifice this token: Add one mana of any color.'],
          tokenColors: [ColorType.Colorless],
        },
      },
      UNKNOWN_CREATOR,
    );
  });

  it('offers a token card with the right stats when the existing one differs', () => {
    renderEditor(makeCard('captain', { cardText: ['Create a 2/2 white Soldier creature token.'] }));

    fireEvent.click(within(queryHints()!).getByRole('button', { name: 'Create token card' }));
    expect(vi.mocked(createCardFromTemplate).mock.lastCall?.[1].front).toMatchObject({
      name: 'Soldier',
      cardStats: '2/2',
    });
  });

  it('checks the complexity of commons only', () => {
    const cardText = ['Flying, vigilance, lifelink', 'When this creature enters, scry 1.'];

    renderEditor(makeCard('uncommon', { cardText }));
    expect(queryHints()).toBeNull();
  });

  it('points out a common with too many abilities', () => {
    renderEditor(
      makeCard(
        'common',
        { cardText: ['Flying, vigilance, lifelink', 'When this creature enters, scry 1.'] },
        RarityType.Common,
      ),
    );
    expect(queryHints()?.textContent).toContain('This common has 4 abilities');
  });
});
