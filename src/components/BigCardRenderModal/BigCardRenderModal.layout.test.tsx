import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BigCardRenderModal from './BigCardRenderModal';
import { EMPTY_CARD } from '../../actions/cardActions';
import { CARD_HEIGHT, CARD_WIDTH } from '../../utils/constants';
import styles from './BigCardRenderModal.module.scss';

vi.mock('../TemplatingCardRender/index', () => ({
  NonMemoCardRender: () => <div>Card face</div>,
}));
vi.mock('../AnnotationList/AnnotationList', () => ({ default: () => null }));

beforeEach(() => {
  const getStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => getStyle(element));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('desktop card and chat layout', () => {
  it.each([1920, 1440, 900])(
    'uses the available band at %ipx without shrinking the card',
    width => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width);
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1080);
      const card = EMPTY_CARD();
      render(
        <BigCardRenderModal
          card={card}
          visible
          hide={() => {}}
          collectionNumber={1}
          collectionSize={1}
        />,
      );

      const view = document.querySelector(`.${styles.view}`) as HTMLElement;
      const cardGroup = document.querySelector(`.${styles.modalCardGroupWrapper}`) as HTMLElement;
      const chat = document.querySelector(`.${styles.annotationView}`) as HTMLElement;
      const viewWidth = parseFloat(view.style.width);
      const cardWidth = parseFloat(cardGroup.style.width);
      const chatWidth = parseFloat(chat.style.width);

      // Leave a small gutter to each sidebar (or viewport edge below the breakpoint).
      const availableWidth = width > 900 ? width * 0.65625 : width;
      expect(availableWidth - viewWidth).toBeCloseTo(32);
      expect(cardWidth).toBeCloseTo(Math.min(width * 0.625 - 50, (880 * CARD_WIDTH) / CARD_HEIGHT));
      expect(cardWidth + chatWidth + 16).toBeCloseTo(viewWidth);
      expect(chatWidth).toBeGreaterThan(width * 0.625 - 50 - cardWidth);
    },
  );
});
