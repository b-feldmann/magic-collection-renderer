import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FilterScrollRegion from './FilterScrollRegion';
import styles from './styles.module.scss';

afterEach(() => vi.unstubAllGlobals());

describe('directional filter scroll shadows', () => {
  it('shows shadows only in directions with remaining content, including after resize', () => {
    let onResize: () => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          onResize = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const { unmount } = render(
      <FilterScrollRegion>
        <p>Filters</p>
      </FilterScrollRegion>,
    );
    const region = screen.getByRole('region', { name: 'Collection filters' });
    const wrapper = region.parentElement!;
    Object.defineProperties(region, {
      scrollHeight: { configurable: true, value: 600 },
      clientHeight: { configurable: true, value: 200 },
    });
    act(() => onResize());
    expect(wrapper).not.toHaveClass(styles.hasTopShadow);
    expect(wrapper).toHaveClass(styles.hasBottomShadow);
    region.scrollTop = 100;
    fireEvent.scroll(region);
    expect(wrapper).toHaveClass(styles.hasTopShadow, styles.hasBottomShadow);
    region.scrollTop = 400;
    fireEvent.scroll(region);
    expect(wrapper).toHaveClass(styles.hasTopShadow);
    expect(wrapper).not.toHaveClass(styles.hasBottomShadow);
    region.scrollTop = 0;
    Object.defineProperty(region, 'scrollHeight', { configurable: true, value: 200 });
    act(() => onResize());
    expect(wrapper).not.toHaveClass(styles.hasTopShadow, styles.hasBottomShadow);
    expect(region).toHaveAttribute('tabindex', '0');
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('keeps scrolling usable without ResizeObserver and updates on window resize', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    render(
      <FilterScrollRegion>
        <p>Filters</p>
      </FilterScrollRegion>,
    );
    const region = screen.getByRole('region', { name: 'Collection filters' });
    Object.defineProperties(region, {
      scrollHeight: { configurable: true, value: 300 },
      clientHeight: { configurable: true, value: 100 },
    });
    fireEvent(window, new Event('resize'));
    expect(region.parentElement).toHaveClass(styles.hasBottomShadow);
  });
});
