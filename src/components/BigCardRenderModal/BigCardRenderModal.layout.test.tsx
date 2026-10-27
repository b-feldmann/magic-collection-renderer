import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileString } from 'sass';
import BigCardRenderModal from './BigCardRenderModal';
import { EMPTY_CARD } from '../../actions/cardActions';
import { CARD_HEIGHT, CARD_WIDTH } from '../../utils/constants';
import styles from './BigCardRenderModal.module.scss';

// Vitest stubs CSS modules, so apply the real positioning rules to the modal.
const modalCss = compileString(
  readFileSync('src/components/BigCardRenderModal/BigCardRenderModal.module.scss', 'utf8'),
).css.replace(/\.(view|modalCardViewWrapper)\b/g, (_, name: string) => `.${styles[name]}`);

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
  it.each([false, true])(
    'centers the complete content vertically (double-faced: %s)',
    doubleFaced => {
      const card = EMPTY_CARD();
      if (doubleFaced) card.back = { ...card.front };
      render(
        <>
          <style>{modalCss}</style>
          <BigCardRenderModal
            card={card}
            visible
            hide={() => {}}
            collectionNumber={1}
            collectionSize={1}
          />
        </>,
      );

      const modal = document.querySelector(`.${styles.modalCardViewWrapper}`) as HTMLElement;
      const view = document.querySelector(`.${styles.view}`) as HTMLElement;
      expect(parseFloat(getComputedStyle(modal).top)).toBeCloseTo(window.innerHeight / 2);
      // Offset by half the content's own height, including comments and controls.
      expect(getComputedStyle(view).transform).toBe('translate(-50%, -50%)');
    },
  );

  it.each([
    [1920, 304, 1388],
    [1440, 304, 908],
    [1024, 304, 492],
    [900, 304, 368],
    [899, 0, 367],
    [768, 0, 236],
  ])('fits between the sidebars at %ipx', (width, left, right) => {
    for (const doubleFaced of [false, true]) {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width);
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1080);
      const card = EMPTY_CARD();
      if (doubleFaced) card.back = { ...card.front };
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

      expect(viewWidth).toBeLessThanOrEqual(right - left - 32);
      const modal = document.querySelector(`.${styles.modalCardViewWrapper}`) as HTMLElement;
      const center = width / 2 + parseFloat(modal.style.left);
      expect(center - viewWidth / 2).toBeGreaterThanOrEqual(left + 16 - 0.01);
      expect(center + viewWidth / 2).toBeLessThanOrEqual(right - 16 + 0.01);
      expect(cardWidth).toBeGreaterThan(0);
      expect(cardWidth).toBeLessThanOrEqual(viewWidth);
      expect(chatWidth).toBeGreaterThan(0);
      if (view.style.flexDirection === 'column') {
        expect(chatWidth).toBeCloseTo(cardWidth);
      } else {
        expect(cardWidth + chatWidth + 16).toBeCloseTo(viewWidth);
        if (width === 1920) {
          expect(cardWidth).toBeCloseTo((880 * CARD_WIDTH) / CARD_HEIGHT);
        }
      }
      cleanup();
    }
  });

  it.each([
    [1440, 1080, 'column'],
    [1024, 1080, 'column'],
    [1024, 600, 'column'],
    [1024, 400, 'column'],
    [1384, 840, 'column'],
    [1384, 839, 'row'],
    [1920, 1080, 'row'],
    [1440, 600, 'row'],
  ])('chooses the card/chat layout at %i × %ipx', (width, height, direction) => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(height);
    render(
      <BigCardRenderModal
        card={EMPTY_CARD()}
        visible
        hide={() => {}}
        collectionNumber={1}
        collectionSize={1}
      />,
    );

    const view = document.querySelector(`.${styles.view}`) as HTMLElement;
    const cardGroup = document.querySelector(`.${styles.modalCardGroupWrapper}`) as HTMLElement;
    const chat = document.querySelector(`.${styles.annotationView}`) as HTMLElement;
    expect(view.style.flexDirection).toBe(direction);
    if (direction === 'column') {
      const cardHeight = (parseFloat(cardGroup.style.width) * CARD_HEIGHT) / CARD_WIDTH;
      expect(cardHeight).toBeLessThanOrEqual(height / 2);
      expect(parseFloat(chat.style.height)).toBeGreaterThanOrEqual(height / 2);
      expect(cardHeight + 16 + parseFloat(chat.style.height)).toBeLessThanOrEqual(
        height - 32 + 0.01,
      );
      expect(parseFloat(chat.style.width)).toBeCloseTo(parseFloat(cardGroup.style.width));
      // Reclaim horizontal chat space for a larger card when switching layouts.
      if (width === 1440) expect(cardHeight).toBeCloseTo(492);
    }
  });

  it('recalculates the available area when the viewport is resized', () => {
    const width = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1920);
    render(
      <BigCardRenderModal
        card={EMPTY_CARD()}
        visible
        hide={() => {}}
        collectionNumber={1}
        collectionSize={1}
      />,
    );
    const view = document.querySelector(`.${styles.view}`) as HTMLElement;
    expect(view.style.flexDirection).toBe('row');
    width.mockReturnValue(1024);
    fireEvent(window, new Event('resize'));

    expect(view.style.flexDirection).toBe('column');
    expect(parseFloat(view.style.width)).toBeCloseTo(156);
  });
});
