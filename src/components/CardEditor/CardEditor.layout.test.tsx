import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CardEditor from './CardEditor';
import type CardInterface from '../../interfaces/CardInterface';
import { CardArtStyles, CardState, CardType, RarityType } from '../../interfaces/enums';
import { Store, StoreType } from '../../store';
import { EDIT_SAVE_OFFSET, UNKNOWN_CREATOR } from '../../utils/constants';
import { updateCard } from '../../actions/cardActions';

vi.mock('../../actions/cardActions', () => ({
  updateCard: vi.fn(() => Promise.resolve()),
  createCardVariant: vi.fn(() => Promise.resolve()),
  deleteCard: vi.fn(() => Promise.resolve()),
}));

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  });
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const creator = { ...UNKNOWN_CREATOR, uuid: 'creator', name: 'Creator' };
const otherCreator = { ...UNKNOWN_CREATOR, uuid: 'other', name: 'Other creator' };
const makeCard = (cardTypes = [CardType.Creature]): CardInterface => ({
  uuid: 'layout-card',
  name: 'Test card',
  manaCost: '{2}{u}',
  rarity: RarityType.Common,
  creator,
  tags: ['Collection'],
  front: {
    name: 'Test card',
    nickname: '',
    artStyle: CardArtStyles.Regular,
    cardTypes,
    cardSubTypes: '',
    cardText: [],
  },
  meta: {
    state: CardState.Draft,
    comment: '',
    likes: [],
    dislikes: [],
    createdAt: 0,
    lastUpdated: 0,
  },
});

function renderEditor(card = makeCard()) {
  const store: StoreType = {
    cards: [card],
    mechanics: [],
    tags: ['Collection'],
    annotationAccessor: {},
    user: [creator, otherCreator],
    currentUser: creator,
    dispatch: vi.fn(),
  };
  return render(
    <Store.Provider value={store}>
      <CardEditor card={card} saveTmpCard={() => {}} />
    </Store.Provider>,
  );
}

describe('CardEditor compact layout', () => {
  beforeEach(() => vi.mocked(updateCard).mockClear());
  afterEach(() => vi.useRealTimers());

  it('groups editable fields into named sections without tabs or a manual save action', () => {
    renderEditor();

    expect(screen.getByRole('heading', { name: 'Card editor', level: 2 })).toBeVisible();

    for (const name of ['The essentials', 'Words & abilities', 'Artwork & frame']) {
      expect(screen.getByRole('heading', { name })).toBeVisible();
      expect(screen.getByRole('region', { name })).toBeVisible();
    }
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
    expect(screen.getByText('Changes save automatically')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Delete Card' })).toBeVisible();
  });

  it('labels and pairs the six main fields in the approved reading order', () => {
    renderEditor();
    const essentials = screen.getByRole('region', { name: 'The essentials' });
    const controls = [
      'Card Name',
      'Nickname',
      'Mana Cost',
      'Rarity',
      'Card Types',
      'Card Sub Types',
    ].map(name => within(essentials).getByLabelText(name));

    controls.slice(1).forEach((control, index) => {
      expect(
        controls[index].compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
    for (const control of [controls[0], controls[4], controls[5]]) {
      expect(control.closest('[data-field-key]')).toHaveStyle({ gridColumn: 'span 1' });
    }
    expect(controls[2].parentElement?.querySelector('.mana')).toBeNull();
  });

  it('retains half-width card name when its art style has no nickname', () => {
    const card = makeCard([CardType.Artifact]);
    card.front.artStyle = CardArtStyles.Invention;
    renderEditor(card);

    expect(screen.queryByLabelText('Nickname')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Card Name').closest('[data-field-key]')).toHaveStyle({
      gridColumn: 'span 1',
    });
  });

  it.each([
    ['Nickname', 'An alternate name'],
    ['Card Sub Types', 'e.g. Human Wizard'],
    ['Flavour Text', 'Every card has a story…'],
    ['Flavour Text Author', 'Who said it?'],
  ])('shows the mockup placeholder and optional hint for %s', (name, placeholder) => {
    renderEditor();
    const input = screen.getByPlaceholderText(placeholder);
    expect(input).toHaveAccessibleName(name);
    expect(input).toHaveAccessibleDescription('optional');
    expect(input).not.toBeRequired();
    const descriptionId = input.getAttribute('aria-describedby')!;
    expect(document.getElementById(descriptionId)).toBeVisible();
  });

  it('shows the artwork URL placeholder for regular cards and basic lands', () => {
    const { unmount } = renderEditor();
    expect(screen.getByPlaceholderText('https://…')).toHaveAccessibleName('Cover (URL)');
    unmount();
    renderEditor(makeCard([CardType.BasicLand]));
    expect(screen.getByPlaceholderText('https://…')).toHaveAccessibleName('Cover (URL)');
  });

  it.each([[CardType.Creature], [CardType.BasicLand]])(
    'shows one full-width mockup upload panel above the artwork fields for %s',
    cardType => {
      renderEditor(makeCard([cardType]));
      const artwork = screen.getByRole('region', { name: 'Artwork & frame' });
      const panel = within(artwork).getByRole('group', { name: 'Give your card a world' });
      expect(within(panel).getByText('Upload artwork or paste a URL below')).toBeVisible();
      expect(within(panel).getByRole('button', { name: 'Choose file' })).toBeVisible();
      expect(artwork.querySelectorAll('input[type="file"]')).toHaveLength(1);
      expect(within(artwork).getByLabelText('Cover (URL)')).toBeVisible();
      expect(within(artwork).getByLabelText('Cover Fit')).toBeVisible();
      expect(
        panel.compareDocumentPosition(within(artwork).getByLabelText('Cover (URL)')) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    },
  );

  it('shows the mockup tags placeholder when no tags have been added', () => {
    const card = makeCard();
    card.tags = [];
    renderEditor(card);
    fireEvent.click(screen.getByText('Organization & credits'));
    expect(screen.getByText('Add tags…')).toBeVisible();
  });

  it('decorates Legendary with a crown without changing its accessible name or toggle', () => {
    renderEditor();
    const toggle = screen.getByRole('switch', { name: 'Legendary?' });
    const crown = toggle.closest('[data-field-key]')!.querySelector('[data-icon="crown"]');
    expect(crown).toBeInTheDocument();
    expect(crown!.closest('[aria-hidden="true"]')).not.toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });

  it.each([
    ['legendary', 'Legendary?'],
    ['vehicle', 'Vehicle?'],
  ])(
    'autosaves the %s switch in both directions and supports its visible label',
    async (field, name) => {
      vi.useFakeTimers();
      renderEditor(makeCard([CardType.Artifact]));
      const toggle = screen.getByRole('switch', { name });
      expect(toggle).not.toBeChecked();
      fireEvent.click(screen.getByText(name));
      expect(toggle).toBeChecked();
      await act(async () => vi.advanceTimersByTime(EDIT_SAVE_OFFSET + 100));
      expect(updateCard).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({
          front: expect.objectContaining({ [field]: true }),
        }),
      );
      fireEvent.click(toggle);
      expect(toggle).not.toBeChecked();
      await act(async () => vi.advanceTimersByTime(EDIT_SAVE_OFFSET + 100));
      expect(updateCard).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({
          front: expect.objectContaining({ [field]: false }),
        }),
      );
    },
  );

  it('uses an accessible pressed state for the favorite action', () => {
    renderEditor();
    const favorite = screen.getByRole('button', { name: 'Mark as favorite' });
    expect(favorite).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(favorite);
    expect(screen.getByRole('button', { name: 'Unmark as favorite' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('makes variant and back-face actions available through the overflow menu', () => {
    renderEditor();
    expect(screen.queryByRole('menuitem', { name: 'Create Variant' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More card actions' }));
    expect(screen.getByRole('menuitem', { name: 'Create Variant' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Add Back Face' })).toBeInTheDocument();
  });

  it('does not render irrelevant basic-land controls into the form', () => {
    renderEditor(makeCard([CardType.BasicLand]));
    expect(screen.getByLabelText('Land Types')).toBeVisible();
    expect(screen.getByLabelText('Card Types')).toBeVisible();
    expect(screen.queryByLabelText('Mana Cost')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Card Name')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Art Style')).toBeInTheDocument();
  });

  it('switches faces through the menu without exposing front-only rarity or mana controls', () => {
    const card = makeCard();
    card.back = { name: 'Back face', cardTypes: [CardType.Creature], cardText: [] };
    renderEditor(card);
    fireEvent.click(screen.getByRole('button', { name: 'More card actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit Back Face' }));

    expect(screen.getByLabelText('Card Name')).toHaveValue('Back face');
    expect(screen.queryByLabelText('Mana Cost')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Rarity')).not.toBeInTheDocument();
  });

  it('retains organization edits across disclosure changes and supports undo', async () => {
    vi.useFakeTimers();
    renderEditor();
    const disclosure = screen.getByText('Organization & credits').closest('details')!;
    expect(disclosure).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('Organization & credits'));
    expect(screen.getByLabelText('Tags')).toBeVisible();
    fireEvent.mouseDown(screen.getByLabelText('Card Creator'));
    fireEvent.click(screen.getByText('Other creator'));
    fireEvent.click(screen.getByText('Organization & credits'));
    fireEvent.click(screen.getByText('Organization & credits'));
    expect(disclosure).toHaveTextContent('Other creator');
    expect(disclosure).toHaveTextContent('Collection');
    await act(async () => vi.advanceTimersByTime(EDIT_SAVE_OFFSET + 100));
    expect(updateCard).toHaveBeenLastCalledWith(
      expect.any(Function),
      expect.objectContaining({ creator: otherCreator }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo Changes' }));
    expect(updateCard).toHaveBeenLastCalledWith(
      expect.any(Function),
      expect.objectContaining({ creator }),
    );
  });
});
