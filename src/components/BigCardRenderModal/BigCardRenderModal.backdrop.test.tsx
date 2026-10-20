import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compileString } from 'sass';
import { readFileSync } from 'node:fs';

import BigCardRenderModal from './BigCardRenderModal';
import CardInterface from '../../interfaces/CardInterface';
import { CardState, CardType, RarityType } from '../../interfaces/enums';

// Vitest stubs CSS imports; compile the real stylesheet for coverage assertions.
const modalCss = compileString(readFileSync('src/card-modal.scss', 'utf8')).css;

vi.mock('../TemplatingCardRender/index', () => ({
  NonMemoCardRender: () => <div>Card face</div>,
}));

vi.mock('../AnnotationList/AnnotationList', () => ({
  default: () => null,
}));

const card: CardInterface = {
  name: 'Backdrop Test',
  rarity: RarityType.Rare,
  creator: { name: 'Creator', uuid: 'creator', seenCards: [], lastSeenVersion: 0 },
  uuid: 'backdrop-card',
  manaCost: '',
  front: { name: 'Backdrop Test', cardTypes: [CardType.Creature], cardText: [] },
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: 0,
    createdAt: 0,
    state: CardState.Draft,
  },
};

beforeEach(() => {
  // antd measures scrollbar pseudo-elements, which jsdom does not implement.
  const getStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => getStyle(element));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe.each([false, true])('card modal backdrop (mobile: %s)', mobile => {
  it('covers the full viewport so no background cards can receive clicks', () => {
    render(
      <>
        <style>{modalCss}</style>
        <BigCardRenderModal
          card={card}
          visible
          mobile={mobile}
          hide={() => {}}
          collectionNumber={1}
          collectionSize={1}
        />
      </>,
    );

    const wrapper = document.querySelector('.ant-modal-wrap.card-view') as HTMLElement;
    const style = getComputedStyle(wrapper);
    expect(style.width).toBe(`${window.innerWidth}px`);
    expect(style.marginLeft).toBe('0px');
  });

  it('closes on an outside click but not a click on the card', () => {
    const hide = vi.fn();
    render(
      <BigCardRenderModal
        card={card}
        visible
        mobile={mobile}
        hide={hide}
        collectionNumber={1}
        collectionSize={1}
      />,
    );

    const face = screen.getByText('Card face');
    fireEvent.mouseDown(face);
    fireEvent.click(face);
    expect(hide).not.toHaveBeenCalled();

    const wrapper = document.querySelector('.ant-modal-wrap.card-view') as HTMLElement;
    fireEvent.mouseDown(wrapper);
    fireEvent.click(wrapper);
    expect(hide).toHaveBeenCalledOnce();
  });
});
