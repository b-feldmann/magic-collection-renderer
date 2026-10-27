import React from 'react';
import { act, fireEvent, render as renderComponent, screen, waitFor } from '@testing-library/react';
import Button from 'antd/es/button';
import ConfigProvider from 'antd/es/config-provider';
import { describe, expect, it } from 'vitest';
import EditorTooltip from './EditorTooltip';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.matchMedia ??= (media: string) => ({
  matches: false,
  media,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
});

function ExplicitGuide() {
  return (
    <EditorTooltip className="">
      <Button>Symbol guide</Button>
    </EditorTooltip>
  );
}

function render(ui: React.ReactNode) {
  // jsdom cannot finish CSS animations; keep real popover behavior without motion.
  return renderComponent(
    <ConfigProvider theme={{ token: { motion: false } }}>{ui}</ConfigProvider>,
  );
}

describe('EditorTooltip', () => {
  it('opens the approved guide from the editor button', async () => {
    render(<ExplicitGuide />);
    fireEvent.click(screen.getByRole('button', { name: 'Symbol guide' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Symbol guide' })).toBeVisible(),
    );
    expect(screen.getByRole('heading', { name: 'Mana & Actions' })).toBeVisible();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it.each(['close button', 'Escape'])(
    'dismisses using %s and restores focus to the trigger',
    async method => {
      render(<ExplicitGuide />);
      const trigger = screen.getByRole('button', { name: 'Symbol guide' });
      act(() => trigger.focus());
      fireEvent.click(trigger);
      const close = await screen.findByRole('button', { name: 'Close symbol guide' });
      fireEvent.keyDown(trigger, { key: 'Tab' });
      expect(close).toHaveFocus();
      if (method === 'close button') fireEvent.click(close);
      else fireEvent.keyDown(close, { key: 'Escape' });
      await waitFor(() =>
        expect(screen.queryByRole('heading', { name: 'Symbol guide' })).not.toBeInTheDocument(),
      );
      expect(trigger).toHaveFocus();
    },
  );

  it('opens the legacy help trigger on hover', async () => {
    render(<EditorTooltip className="" />);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Symbol guide' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Symbol guide' })).toBeVisible(),
    );
  });

  it('supports legacy keyboard focus, moving into the guide, and dismissal without reopening', async () => {
    render(<EditorTooltip className="" />);
    const trigger = screen.getByRole('button', { name: 'Symbol guide' });
    act(() => trigger.focus());
    const close = await screen.findByRole('button', { name: 'Close symbol guide' });
    fireEvent.keyDown(trigger, { key: 'Tab' });
    expect(close).toHaveFocus();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Symbol guide' })).toBeVisible(),
    );
    fireEvent.keyDown(close, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Symbol guide' })).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  // mana-font's two-color halves require ms-cost to position correctly.
  it('renders every hybrid in mana-cost mode', async () => {
    render(<ExplicitGuide />);
    fireEvent.click(screen.getByRole('button', { name: 'Symbol guide' }));
    fireEvent.click(await screen.findByText('Hybrid & Phyrexian Mana'));
    for (const symbol of ['wu', 'wb', 'ub', 'ur', 'br', 'bg', 'rg', 'rw', 'gw', 'gu']) {
      const button = screen.getByRole('button', { name: `Copy Two-color hybrid: {${symbol}}` });
      expect(button.querySelector(`.ms-${symbol}`)).toHaveClass('ms-cost');
    }
  });

  it('disables the legacy help action with the editor', () => {
    render(
      <ConfigProvider componentDisabled>
        <EditorTooltip className="" />
      </ConfigProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Symbol guide' });
    expect(trigger).toBeDisabled();
    fireEvent.mouseEnter(trigger);
    fireEvent.click(trigger);
    expect(screen.queryByRole('heading', { name: 'Symbol guide' })).not.toBeInTheDocument();
  });
});
