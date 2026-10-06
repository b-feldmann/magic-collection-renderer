import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import MechanicInterface from '../interfaces/MechanicInterface';
import { injectForText, injectManaIcons } from './injectUtils';

describe('injectUtils', () => {
  it('should not trigger "unique key" warnings when rendering injected arrays', () => {
    const warningSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mechanics: MechanicInterface[] = [
      { id: '1', name: 'Resolve', description: 'damage. {u}' } as unknown as MechanicInterface,
    ];
    const content = (
      <div>
        <p>{injectForText('Deal {u} [Resolve-]', 'Test', mechanics)}</p>
        <div>{injectManaIcons('{2g}{w}{r}{t}')}</div>
      </div>
    );

    renderToStaticMarkup(content);

    const keyWarnings = warningSpy.mock.calls.filter(args =>
      args.some(arg => String(arg).includes('unique "key" prop')),
    );
    expect(keyWarnings).toEqual([]);
    warningSpy.mockRestore();
  });

  it('should render -- in card text as an em dash', () => {
    const markup = renderToStaticMarkup(
      <div>{injectForText('Tap -- draw a card', 'Test', [])}</div>,
    );
    expect(markup).toContain('Tap — draw a card');
  });

  it('should render -- together with other injections (mana icons, card name)', () => {
    const markup = renderToStaticMarkup(
      <div>{injectForText('~ attacks -- {w} card', 'Test', [])}</div>,
    );
    expect(markup).toContain('Test');
    expect(markup).toContain('—');
    expect(markup).not.toContain('--');
  });
});
