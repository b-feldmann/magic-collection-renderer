import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import MechanicInterface from '../interfaces/MechanicInterface';
import { injectForText, injectManaIcons, isBulletText } from './injectUtils';

describe('injectUtils', () => {
  it.each(['1', '123'])('renders unbraced numeric mechanic refs such as %s', number => {
    const mechanic: MechanicInterface = {
      uuid: 'mechanic-1',
      name: 'Surveil',
      description: 'Draw {ref} cards.',
    };
    const markup = renderToStaticMarkup(
      <p>{injectForText(`[Surveil ${number}]`, 'Test', [mechanic])}</p>,
    );
    const container = document.createElement('div');
    container.innerHTML = markup;

    expect(container.textContent).toBe(`Surveil ${number} (Draw ${number} cards.)`);
  });

  it.each([
    ['Pay {w}{u}{1}.', ['1', 'w', 'u']],
    ['Pay {W}{R}{2}, then {G}{B}{X}.', ['2', 'r', 'w', 'x', 'b', 'g']],
    ['Pay {wu}{G}{1}.', ['1', 'g', 'wu']],
    ['Pay {2g}{w}{1}.', ['1', 'w', '2g']],
    ['Pay {g2}{w}{1}.', ['1', 'w', '2g']],
    ['Add {w} {u}{1} or {g}, {b}{2}.', ['w', '1', 'u', 'g', '2', 'b']],
    ['Pay {w}{t}{u}{1}{ut}{g}{2}.', ['w', 'tap', '1', 'u', 'untap', '2', 'g']],
    ['Pay {w}{unknown}{u}{1}.', ['w', '1', 'u']],
    ['Pay {w}\n{u}{1}.', ['w', '1', 'u']],
  ])('sorts only adjacent mana runs when rendering %s', (line, expectedSymbols) => {
    const markup = renderToStaticMarkup(<div>{injectForText(line, 'Test', [])}</div>);
    const container = document.createElement('div');
    container.innerHTML = markup;

    expect(
      Array.from(container.querySelectorAll('.ms'), icon =>
        Array.from(icon.classList).find(className => /^ms-(?!cost|shadow)/.test(className)),
      ),
    ).toEqual(expectedSymbols.map(symbol => `ms-${symbol}`));
    expect(container.textContent).toBe(line.replace(/\{(?!unknown\})[^}]+\}/g, ''));
  });

  it('leaves source text arrays and existing JSX unchanged while rendering sorted mana', () => {
    const existing = <strong>Reminder</strong>;
    const text = ['Pay {w}{u}{1}', existing];
    const markup = renderToStaticMarkup(<div>{injectManaIcons(text, true)}</div>);

    expect(text).toEqual(['Pay {w}{u}{1}', existing]);
    expect(markup.indexOf('ms-1')).toBeLessThan(markup.indexOf('ms-w'));
    expect(markup).toContain('<strong>Reminder</strong>');
    expect(markup).toContain('ms-shadow');
  });

  it('identifies card text lines that render with a bullet', () => {
    expect(isBulletText('* First item')).toBe(true);
    expect(isBulletText('  - Second item')).toBe(true);
    expect(isBulletText('--Indented paragraph.')).toBe(false);
    expect(isBulletText('Regular paragraph.')).toBe(false);
  });

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

  it('renders leading asterisk and hyphen markers as bullets, allowing leading whitespace', () => {
    const markup = renderToStaticMarkup(
      <div>
        <p>{injectForText('* First item', 'Test', [])}</p>
        <p>{injectForText('  - Second item', 'Test', [])}</p>
      </div>,
    );

    expect(markup).toContain('<p>• First item</p>');
    expect(markup).toContain('<p>• Second item</p>');
    expect(markup).not.toContain('* First item');
    expect(markup).not.toContain('- Second item');
  });

  it('keeps the existing double-hyphen em dash convention', () => {
    const markup = renderToStaticMarkup(
      <p>{injectForText('--Indented paragraph.', 'Test', [])}</p>,
    );

    expect(markup).toContain('—Indented paragraph.');
    expect(markup).not.toContain('•');
  });
});
