import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CardCollection from './CardCollection';
import styles from './styles.module.scss';

vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({
    renderProp,
  }: {
    renderProp: (size: { width: number; height: number }) => React.ReactNode;
  }) => renderProp({ width: 800, height: 600 }),
}));

describe('collection grid scroll shadows', () => {
  it('shows shadows only where more cards are available while scrolling', () => {
    render(
      <CardCollection
        cards={[]}
        editCard={vi.fn()}
        addSeenCard={vi.fn()}
        seenCardUuids={{}}
        currentEditId=""
      />,
    );

    const grid = screen.getByRole('grid');
    const wrapper = grid.parentElement!;
    Object.defineProperties(grid, {
      scrollHeight: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 600 },
    });

    fireEvent.scroll(grid);
    expect(wrapper).not.toHaveClass(styles.hasTopShadow);
    expect(wrapper).toHaveClass(styles.hasBottomShadow);

    grid.scrollTop = 150;
    fireEvent.scroll(grid);
    expect(wrapper).toHaveClass(styles.hasTopShadow, styles.hasBottomShadow);

    grid.scrollTop = 300;
    fireEvent.scroll(grid);
    expect(wrapper).toHaveClass(styles.hasTopShadow);
    expect(wrapper).not.toHaveClass(styles.hasBottomShadow);
  });

  it('hides both shadows when the grid content fits', () => {
    render(
      <CardCollection
        cards={[]}
        editCard={vi.fn()}
        addSeenCard={vi.fn()}
        seenCardUuids={{}}
        currentEditId=""
      />,
    );

    const grid = screen.getByRole('grid');
    Object.defineProperties(grid, {
      scrollHeight: { configurable: true, value: 600 },
      clientHeight: { configurable: true, value: 600 },
    });
    fireEvent.scroll(grid);

    expect(grid.parentElement).not.toHaveClass(styles.hasTopShadow);
    expect(grid.parentElement).not.toHaveClass(styles.hasBottomShadow);
  });

  it('refreshes shadows when the grid layout setting changes', () => {
    const props = {
      cards: [],
      editCard: vi.fn(),
      addSeenCard: vi.fn(),
      seenCardUuids: {},
      currentEditId: '',
      colSpanSetting: 4,
    };
    const { rerender } = render(<CardCollection {...props} />);
    const grid = screen.getByRole('grid');
    const wrapper = grid.parentElement!;
    Object.defineProperties(grid, {
      scrollHeight: { configurable: true, value: 600 },
      clientHeight: { configurable: true, value: 600 },
    });
    fireEvent.scroll(grid);
    expect(wrapper).not.toHaveClass(styles.hasBottomShadow);

    Object.defineProperty(grid, 'scrollHeight', { configurable: true, value: 900 });
    rerender(<CardCollection {...props} colSpanSetting={2} />);

    expect(wrapper).toHaveClass(styles.hasBottomShadow);
  });
});
