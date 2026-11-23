import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
import { CardArtStyles, CardType, RarityType } from '../../interfaces/enums';

// jsdom polyfills required by TextResize.
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}

const renderSaga = (props: Partial<React.ComponentProps<typeof TemplatingCardRender>> = {}) =>
  render(
    <TemplatingCardRender
      name="Amok Time"
      rarity={RarityType.Uncommon}
      cardID="test-saga"
      manaCost="{2}{G}"
      cardTypes={[CardType.Enchantment, CardType.Saga]}
      cardText={['I, II — Draw two cards.', 'III — You gain 3 life.']}
      collectionNumber={1}
      collectionSize={10}
      {...props}
    />,
  );

const creatureProps = {
  cardTypes: [CardType.Enchantment, CardType.Creature, CardType.Saga],
  cardStats: '7/7',
};

const sourceOf = (className: string) =>
  Array.from(document.querySelectorAll('img'))
    .find(img => img.className.includes(className))
    ?.getAttribute('src');

describe('TemplatingCardRender - saga frame', () => {
  it('renders every ability with its chapter numbers, without the typed prefix', () => {
    renderSaga();

    const [first, second] = screen.getAllByTestId('saga-step');
    expect(within(first).getByText('I')).toBeInTheDocument();
    expect(within(first).getByText('II')).toBeInTheDocument();
    expect(within(first).getByText('Draw two cards.')).toBeInTheDocument();
    expect(within(second).getByText('III')).toBeInTheDocument();
    expect(within(second).getByText('You gain 3 life.')).toBeInTheDocument();
  });

  it('renders a step without a chapter number', () => {
    renderSaga({ cardText: ['Exile five cards.', 'I, II, III — Draw a card.'] });

    const [first, second] = screen.getAllByTestId('saga-step');
    expect(first).toHaveTextContent(/^Exile five cards\.$/);
    expect(within(second).getByText('III')).toBeInTheDocument();
  });

  it('adds the reminder text with the last chapter', () => {
    renderSaga();

    expect(screen.getByTestId('saga-reminder')).toHaveTextContent('Sacrifice after III.');
  });

  it('writes Saga as the first subtype', () => {
    renderSaga();
    expect(screen.getByText('Enchantment — Saga')).toBeInTheDocument();
  });

  it('draws the frame in the color of the card', () => {
    renderSaga();

    expect(sourceOf('mainframe')).toMatch(/saga\/nyx\/g/);
    expect(sourceOf('pinline')).toBeUndefined();
  });

  it('gives a two-color Saga a gold frame with two-color parts, in any order', () => {
    renderSaga({ manaCost: '{1}{R}{U}' });

    expect(sourceOf('mainframe')).toMatch(/saga\/nyx\/m/);
    expect(sourceOf('pinline')).toMatch(/sagaParts\/ur/);
  });

  it('uses the land frame for a land Saga', () => {
    renderSaga({
      manaCost: '',
      cardTypes: [CardType.Enchantment, CardType.Land, CardType.Saga],
      cardSubTypes: 'Urza’s Saga',
    });

    expect(sourceOf('mainframe')).toMatch(/saga\/regular\/l/);
    expect(screen.getByText('Enchantment Land — Urza’s Saga')).toBeInTheDocument();
  });

  it('uses the artifact frame for a colorless artifact Saga', () => {
    renderSaga({
      manaCost: '{3}',
      cardTypes: [CardType.Enchantment, CardType.Artifact, CardType.Saga],
    });

    expect(sourceOf('mainframe')).toMatch(/saga\/nyx\/a/);
    expect(screen.getByText('Enchantment Artifact — Saga')).toBeInTheDocument();
  });

  it('keeps the saga frame whatever art style is stored on the card', () => {
    renderSaga({ artStyle: CardArtStyles.Borderless });

    expect(sourceOf('mainframe')).toMatch(/saga\/nyx\/g/);
  });

  it('shows neither a rules box nor P/T', () => {
    renderSaga({ flavourText: 'A long story.', cardStats: '7/7' });

    expect(screen.queryByTestId('saga-rules')).toBeNull();
    expect(screen.queryByText('A long story.')).toBeNull();
    expect(screen.queryByText('7/7')).toBeNull();
  });

  it('draws no chapters on other cards', () => {
    renderSaga({ cardTypes: [CardType.Enchantment] });

    expect(screen.queryByTestId('saga-step')).toBeNull();
    expect(sourceOf('mainframe')).not.toMatch(/saga/);
  });
});

describe('TemplatingCardRender - saga creature frame', () => {
  it('draws the creature frame with P/T', () => {
    renderSaga({ ...creatureProps, cardSubTypes: 'Giant' });

    expect(sourceOf('mainframe')).toMatch(/saga\/creature\/g/);
    expect(screen.getByText('7/7')).toBeInTheDocument();
    expect(screen.getByText('Enchantment Creature — Saga Giant')).toBeInTheDocument();
  });

  it('puts abilities without a chapter and the flavour text in the rules box', () => {
    renderSaga({
      ...creatureProps,
      cardText: ['I — Mill five cards.', 'Reach, trample'],
      flavourText: 'It awoke.',
    });

    const rules = screen.getByTestId('saga-rules');
    expect(rules).toHaveTextContent('Reach, trample');
    expect(rules).toHaveTextContent('It awoke.');
    expect(rules).not.toHaveTextContent('Mill five cards.');
  });

  it('has its own two-color parts', () => {
    renderSaga({ ...creatureProps, manaCost: '{1}{R}{G}' });

    expect(sourceOf('mainframe')).toMatch(/saga\/creature\/m/);
    expect(sourceOf('pinline')).toMatch(/sagaCreatureParts\/rg/);
  });
});
