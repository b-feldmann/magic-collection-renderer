import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { theme } from 'antd';

import MobileBigCardRenderModal from './MobileBigCardRenderModal';
import { EMPTY_CARD } from '../../actions/cardActions';
import styles from './BigCardRenderModal.module.scss';

vi.mock('../TemplatingCardRender/index', () => ({
  NonMemoCardRender: () => <div>Card preview</div>,
}));

beforeEach(() => {
  const getStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => getStyle(element));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function SizingProbe() {
  const { token } = theme.useToken();
  return (
    <output data-testid="sizing">
      {JSON.stringify({
        height: token.controlHeight,
        smallHeight: token.controlHeightSM,
        font: token.fontSize,
        smallFont: token.fontSizeSM,
      })}
    </output>
  );
}

it('supplies consistent touch sizing to all mobile editor controls without changing desktop defaults', () => {
  render(
    <MobileBigCardRenderModal
      card={EMPTY_CARD()}
      visible
      hide={() => {}}
      collectionNumber={1}
      collectionSize={1}
      width={390}
      height={844}
      mobileEditorOpen
      mobileEditor={<SizingProbe />}
    />,
  );

  expect(JSON.parse(screen.getByTestId('sizing').textContent!)).toEqual({
    height: 44,
    smallHeight: 44,
    font: 16,
    smallFont: 16,
  });

  cleanup();
  render(<SizingProbe />);
  expect(JSON.parse(screen.getByTestId('sizing').textContent!)).toEqual({
    height: 32,
    smallHeight: 24,
    font: 14,
    smallFont: 12,
  });
});

it.each([
  { width: 320, height: 720, contentWidth: 280, cardWidth: 280 },
  { width: 390, height: 844, contentWidth: 350, cardWidth: 350 },
  { width: 844, height: 390, contentWidth: 804, cardWidth: 257.14285714285717 },
])(
  'uses twenty-pixel side margins for a $width-pixel viewport without stretching the card',
  ({ width, height, contentWidth, cardWidth }) => {
    render(
      <MobileBigCardRenderModal
        card={EMPTY_CARD()}
        visible
        hide={() => {}}
        collectionNumber={1}
        collectionSize={1}
        width={width}
        height={height}
      >
        <div>Card comments</div>
      </MobileBigCardRenderModal>,
    );

    const positioner = document.querySelector<HTMLElement>(`.${styles.mobilePositioner}`)!;
    const card = document.querySelector<HTMLElement>(`.${styles.mobileCard}`)!;
    expect(positioner.style.width).toBe(`${contentWidth}px`);
    expect(parseFloat(card.style.width)).toBeCloseTo(cardWidth);
    expect(screen.getByText('Card comments').parentElement?.parentElement).toBe(positioner);
  },
);
