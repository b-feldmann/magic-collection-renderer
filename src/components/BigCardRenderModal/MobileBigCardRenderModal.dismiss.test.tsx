import React, { StrictMode, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MobileBigCardRenderModal from './MobileBigCardRenderModal';
import styles from './BigCardRenderModal.module.scss';
import CardInterface from '../../interfaces/CardInterface';
import { CardState, CardType, RarityType } from '../../interfaces/enums';

vi.mock('../TemplatingCardRender/index', () => ({
  NonMemoCardRender: () => <div>Card face</div>,
}));

const card: CardInterface = {
  name: 'Dismiss test',
  rarity: RarityType.Rare,
  creator: { name: 'Creator', uuid: 'creator' },
  uuid: 'dismiss-card',
  manaCost: '',
  front: { name: 'Dismiss test', cardTypes: [CardType.Creature], cardText: [] },
  back: { name: 'Other face', cardTypes: [CardType.Creature], cardText: [] },
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: 0,
    createdAt: 0,
    state: CardState.Draft,
  },
};

const pageState = { page: 'collection' };
const props = { card, collectionNumber: 1, collectionSize: 1, width: 800, height: 400 };

beforeEach(() => {
  window.history.replaceState(pageState, '', '/?collection=dismiss-test');
  const getStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => getStyle(element));
});

afterEach(async () => {
  cleanup();
  await waitFor(() => expect(window.history.state).toEqual(pageState));
  vi.restoreAllMocks();
});

describe('mobile card dismissal', () => {
  it.each(['mobilePositioner', 'mobileFaces', 'mobileCardControls'] as const)(
    'closes when tapping transparent space in %s',
    className => {
      const hide = vi.fn();
      render(<MobileBigCardRenderModal {...props} visible hide={hide} />);
      fireEvent.click(document.querySelector(`.${styles[className]}`)!);
      expect(hide).toHaveBeenCalledOnce();
    },
  );

  it('keeps card faces, face controls, variants and comments interactive without closing', () => {
    const hide = vi.fn();
    const selectVariant = vi.fn();
    const comment = vi.fn();
    render(
      <MobileBigCardRenderModal
        {...props}
        visible
        hide={hide}
        variantNavigation={<button onClick={selectVariant}>Next variant</button>}
      >
        <button onClick={comment}>Comment action</button>
      </MobileBigCardRenderModal>,
    );
    fireEvent.click(screen.getByText('Card face'));
    fireEvent.click(screen.getByRole('button', { name: 'Show other face' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Comment action' }));
    expect(selectVariant).toHaveBeenCalledOnce();
    expect(comment).toHaveBeenCalledOnce();
    expect(hide).not.toHaveBeenCalled();
  });

  it('uses one same-page history entry and closes on native Back, including in StrictMode', async () => {
    const hide = vi.fn();
    const pushState = vi.spyOn(window.history, 'pushState');
    const url = window.location.href;
    render(
      <StrictMode>
        <MobileBigCardRenderModal {...props} visible hide={hide} />
      </StrictMode>,
    );
    await act(async () => {});
    expect(pushState).toHaveBeenCalledOnce();
    expect(window.history.state).toMatchObject(pageState);
    expect(window.location.href).toBe(url);
    window.history.back();
    await waitFor(() => expect(hide).toHaveBeenCalledOnce());
    expect(window.history.state).toEqual(pageState);
    expect(window.location.href).toBe(url);
  });

  it('removes its history entry after background dismissal and can reopen cleanly', async () => {
    function Example() {
      const [visible, setVisible] = useState(false);
      return (
        <>
          <button onClick={() => setVisible(true)}>Open card</button>
          <output aria-label="Card visibility">{visible ? 'Open' : 'Closed'}</output>
          <MobileBigCardRenderModal {...props} visible={visible} hide={() => setVisible(false)} />
        </>
      );
    }
    render(<Example />);
    expect(window.history.state).toEqual(pageState);
    fireEvent.click(screen.getByRole('button', { name: 'Open card' }));
    expect(window.history.state).not.toEqual(pageState);
    const wrapper = document.querySelector('.ant-modal-wrap.card-view')!;
    fireEvent.mouseDown(wrapper);
    fireEvent.click(wrapper);
    await waitFor(() => expect(window.history.state).toEqual(pageState));

    fireEvent.click(screen.getByRole('button', { name: 'Open card' }));
    expect(window.history.state).not.toEqual(pageState);
    window.history.back();
    await waitFor(() =>
      expect(screen.getByLabelText('Card visibility')).toHaveTextContent('Closed'),
    );
    expect(window.history.state).toEqual(pageState);
  });

  it('keeps one entry when switching cards and uses the latest close callback', async () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    const initialHide = vi.fn();
    const latestHide = vi.fn();
    const { rerender } = render(<MobileBigCardRenderModal {...props} visible hide={initialHide} />);
    rerender(
      <MobileBigCardRenderModal
        {...props}
        card={{ ...card, uuid: 'variant' }}
        visible
        hide={latestHide}
      />,
    );
    expect(pushState).toHaveBeenCalledOnce();
    window.history.back();
    await waitFor(() => expect(latestHide).toHaveBeenCalledOnce());
    expect(initialHide).not.toHaveBeenCalled();
  });

  it('keeps a reopened modal open when the previous dismissal is still traversing history', async () => {
    const hide = vi.fn();
    const originalBack = window.history.back.bind(window.history);
    // Hold the traversal at the browser boundary so reopening wins the race.
    const back = vi.spyOn(window.history, 'back').mockImplementationOnce(() => {});
    const { rerender } = render(<MobileBigCardRenderModal {...props} visible hide={hide} />);
    rerender(<MobileBigCardRenderModal {...props} visible={false} hide={hide} />);
    await act(async () => {});
    expect(back).toHaveBeenCalledOnce();
    rerender(<MobileBigCardRenderModal {...props} visible hide={hide} />);

    const traversed = new Promise<void>(resolve => {
      window.addEventListener('popstate', () => resolve(), { once: true });
    });
    await act(async () => {
      originalBack();
      await traversed;
    });
    expect(hide).not.toHaveBeenCalled();
    expect(window.history.state).not.toEqual(pageState);
    expect(window.history.state).toMatchObject(pageState);
  });

  it('consumes the modal history entry only once when immediately unmounted in StrictMode', async () => {
    const back = vi.spyOn(window.history, 'back');
    const { unmount } = render(
      <StrictMode>
        <MobileBigCardRenderModal {...props} visible hide={() => {}} />
      </StrictMode>,
    );
    unmount();
    await act(async () => {});
    expect(back).toHaveBeenCalledOnce();
    await waitFor(() => expect(window.history.state).toEqual(pageState));
  });
});
