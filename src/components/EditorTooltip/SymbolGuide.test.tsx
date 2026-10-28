import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SymbolGuide from './SymbolGuide';

afterEach(() => vi.unstubAllGlobals());

function clipboard(writeText: (text: string) => Promise<void>) {
  vi.stubGlobal('navigator', { clipboard: { writeText } });
}

describe('SymbolGuide', () => {
  it('organizes the supported codes into the approved sections without search', () => {
    render(<SymbolGuide onClose={() => {}} />);
    for (const heading of ['Symbol guide', 'Mana & Actions', 'Loyalty', 'Text & Mechanics']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    for (const [name, code] of [
      ['White', '{w}'],
      ['Blue', '{u}'],
      ['Black', '{b}'],
      ['Red', '{r}'],
      ['Green', '{g}'],
      ['Colorless', '{c}'],
      ['Tap', '{t}'],
      ['Untap', '{ut}'],
      ['Generic mana', '{1}'],
      ['Variable mana', '{x}'],
    ]) {
      expect(screen.getByRole('button', { name: `Copy ${name}: ${code}` })).toBeInTheDocument();
    }
    expect(screen.getByText('{0} – {20}')).toBeInTheDocument();
    expect(screen.getByText('{x}{y}{z}')).toBeInTheDocument();
    for (const code of [
      '{loy+5}',
      '{loy-5}',
      '{loy0}',
      '{loy5}',
      '{loy+x}',
      '{loy-x}',
      '{loyx}',
      '~',
      '[-MECHANIC]',
      '[MECHANIC {2}]',
      '[MECHANIC]',
    ]) {
      expect(screen.getByText(code)).toBeInTheDocument();
    }
  });

  it('shows the em dash used when rendering a mechanic with a text reference', () => {
    render(<SymbolGuide onClose={() => {}} />);

    expect(screen.getByText('[MECHANIC text]')).toBeInTheDocument();
    expect(screen.getByText('MECHANIC — text')).toBeInTheDocument();
  });

  it('makes every advanced code available through a native expandable summary', () => {
    render(<SymbolGuide onClose={() => {}} />);
    const summary = screen.getByText('Hybrid & Phyrexian Mana');
    const details = summary.closest('details')!;
    expect(details.open).toBe(false);
    expect(summary.tagName).toBe('SUMMARY');
    fireEvent.click(summary);
    expect(details.open).toBe(true);
    for (const code of [
      'wu',
      'wb',
      'ub',
      'ur',
      'br',
      'bg',
      'rg',
      'rw',
      'gw',
      'gu',
      '2w',
      '2u',
      '2b',
      '2r',
      '2g',
      'wp',
      'up',
      'bp',
      'rp',
      'gp',
      'p',
    ]) {
      const button = within(details).getByRole('button', { name: new RegExp(`\\{${code}\\}$`) });
      expect(button.querySelector(`.ms-${code}`)).toHaveClass('ms-cost');
    }
  });

  it.each([
    ['Tap', '{t}'],
    ['Untap', '{ut}'],
    ['Generic mana', '{1}'],
    ['Variable mana', '{x}'],
    ['Two-color hybrid', '{rg}'],
    ['Gain loyalty', '{loy+5}'],
  ])(
    'copies a valid individual %s code without submitting a surrounding form',
    async (name, code) => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      clipboard(writeText);
      const submit = vi.fn(event => event.preventDefault());
      render(
        <form onSubmit={submit}>
          <SymbolGuide onClose={() => {}} />
        </form>,
      );
      if (name === 'Two-color hybrid') fireEvent.click(screen.getByText('Hybrid & Phyrexian Mana'));
      fireEvent.click(screen.getByRole('button', { name: `Copy ${name}: ${code}` }));
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(`Copied ${code}`));
      expect(writeText).toHaveBeenCalledExactlyOnceWith(code);
      expect(submit).not.toHaveBeenCalled();
    },
  );

  it.each(['missing', 'rejected'])(
    'offers selectable code when the clipboard is %s',
    async failure => {
      if (failure === 'missing') vi.stubGlobal('navigator', {});
      else clipboard(vi.fn().mockRejectedValue(new Error('Permission denied')));
      render(<SymbolGuide onClose={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: 'Copy Tap: {t}' }));
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('select and copy manually'),
      );
      expect(within(screen.getByRole('status')).getByText('{t}').tagName).toBe('CODE');
      expect(screen.getByRole('status')).not.toHaveTextContent('Copied');
    },
  );

  it('closes through its named close button', () => {
    const close = vi.fn();
    render(<SymbolGuide onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close symbol guide' }));
    expect(close).toHaveBeenCalledOnce();
  });
});
