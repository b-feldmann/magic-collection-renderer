import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import useTabsOverCards from './useTabsOverCards';

let report: (tabKey: string, scrolled: boolean) => void;

const Host = ({ activeTabKey }: { activeTabKey: string }) => {
  const { hostRef, reportScrolled } = useTabsOverCards(activeTabKey);
  report = reportScrolled;
  return <div ref={hostRef} data-testid="host" />;
};

describe('useTabsOverCards', () => {
  it('follows the scroll position of the active tab', () => {
    render(<Host activeTabKey="a" />);
    const host = screen.getByTestId('host');
    expect(host).not.toHaveAttribute('data-tabs-over-cards');

    act(() => report('a', true));
    expect(host).toHaveAttribute('data-tabs-over-cards');

    act(() => report('a', false));
    expect(host).not.toHaveAttribute('data-tabs-over-cards');
  });

  it('ignores hidden tabs and restores each tab when switching to it', () => {
    const { rerender } = render(<Host activeTabKey="a" />);
    const host = screen.getByTestId('host');

    act(() => report('b', true));
    expect(host).not.toHaveAttribute('data-tabs-over-cards');

    rerender(<Host activeTabKey="b" />);
    expect(host).toHaveAttribute('data-tabs-over-cards');

    rerender(<Host activeTabKey="a" />);
    expect(host).not.toHaveAttribute('data-tabs-over-cards');
  });
});
