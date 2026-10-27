import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MobileBigCardRenderModal from './MobileBigCardRenderModal';
import styles from './BigCardRenderModal.module.scss';
import { EMPTY_CARD } from '../../actions/cardActions';

vi.mock('../TemplatingCardRender/index', () => ({
  NonMemoCardRender: () => <div>Card preview</div>,
}));

let contentHeight = 1200;
let notifyResize: () => void;

beforeEach(() => {
  contentHeight = 1200;
  window.history.replaceState(null, '', '/');
  const getStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => getStyle(element));
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() => contentHeight);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        notifyResize = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(async () => {
  cleanup();
  await waitFor(() => expect(window.history.state).toBeNull());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderModal() {
  render(
    <MobileBigCardRenderModal
      card={{ ...EMPTY_CARD(), uuid: 'scroll-card' }}
      visible
      hide={() => {}}
      collectionNumber={1}
      collectionSize={1}
      width={390}
      height={844}
    />,
  );
  return document.querySelector(`.${styles.mobilePositioner}`)!;
}

describe('mobile modal scroll shadows', () => {
  it('shows shadows only at edges with more content, including fractional scroll positions', () => {
    const scroller = renderModal();
    expect(scroller).toHaveAttribute('data-scroll-top', 'false');
    expect(scroller).toHaveAttribute('data-scroll-bottom', 'true');

    fireEvent.scroll(scroller, { target: { scrollTop: 200 } });
    expect(scroller).toHaveAttribute('data-scroll-top', 'true');
    expect(scroller).toHaveAttribute('data-scroll-bottom', 'true');

    fireEvent.scroll(scroller, { target: { scrollTop: 599.5 } });
    expect(scroller).toHaveAttribute('data-scroll-top', 'true');
    expect(scroller).toHaveAttribute('data-scroll-bottom', 'false');

    fireEvent.scroll(scroller, { target: { scrollTop: 0 } });
    expect(scroller).toHaveAttribute('data-scroll-top', 'false');
    expect(scroller).toHaveAttribute('data-scroll-bottom', 'true');
  });

  it('hides both shadows when content fits and updates after resizing', () => {
    contentHeight = 600;
    const scroller = renderModal();
    expect(scroller).toHaveAttribute('data-scroll-top', 'false');
    expect(scroller).toHaveAttribute('data-scroll-bottom', 'false');

    contentHeight = 900;
    notifyResize();
    expect(scroller).toHaveAttribute('data-scroll-bottom', 'true');

    contentHeight = 500;
    notifyResize();
    expect(scroller).toHaveAttribute('data-scroll-bottom', 'false');
  });
});
