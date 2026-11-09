import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import MechanicInterface from '../interfaces/MechanicInterface';
import {
  injectForFlavour,
  injectForText,
  injectManaIcons,
  isBulletText,
  normalizeManaCost,
} from './injectUtils';

describe('normalizeManaCost', () => {
  it.each([
    ['2{b}', '{2}{b}'],
    ['{2}b', '{2}{b}'],
    ['x{R}', '{x}{R}'],
    ['2', '{2}'],
    ['wu', '{wu}'],
    ['2{wu}', '{2}{wu}'],
  ])('braces the bare symbols in %s', (input, expected) => {
    expect(normalizeManaCost(input)).toBe(expected);
  });

  it.each([
    [''],
    ['{2}{b}'],
    ['{b}{2}'],
    ['{'],
    ['}'],
    ['{}'],
    ['2{'],
    ['2{b'],
    ['2{b}}'],
    ['{{b}}'],
    ['foo'],
    ['2{foo}'],
    ['2 {b}'],
    ['21{b}'],
  ])('leaves %s as it is', input => {
    expect(normalizeManaCost(input)).toBe(input);
  });

  it('produces what the renderer already shows', () => {
    const icons = (cost: string) => renderToStaticMarkup(<p>{injectManaIcons(cost)}</p>);

    expect(icons(normalizeManaCost('2{b}'))).toBe(icons('{2}{b}'));
  });
});

describe('injectUtils', () => {
  it.each([
    ['*Bold*', '<strong>Bold</strong>'],
    ['_Italic_', '<em>Italic</em>'],
    ['~Deleted~', '<s>Deleted</s>'],
    ['*Bold _and italic_*', '<strong>Bold <em>and italic</em></strong>'],
    ['*Bold* _italic_ ~deleted~', '<strong>Bold</strong> <em>italic</em> <s>deleted</s>'],
    ['**Literal** __literal__', '**Literal** __literal__'],
    ['Unmatched *marker', 'Unmatched *marker'],
    ['2 * 3 = 6', '2 * 3 = 6'],
  ])('renders single-marker formatting in rules and flavour: %s', (input, expected) => {
    expect(renderToStaticMarkup(<p>{injectForText(input, 'Test', [])}</p>)).toBe(
      `<p>${expected}</p>`,
    );
    expect(renderToStaticMarkup(<p>{injectForFlavour(input, 'Test')}</p>)).toBe(
      `<p>${expected}</p>`,
    );
  });

  it('preserves bullets and name references alongside formatted mana', () => {
    const markup = renderToStaticMarkup(
      <p>{injectForText('* *Pay {w}* then ~ deals ~damage~.', 'Test', [])}</p>,
    );
    const container = document.createElement('div');
    container.innerHTML = markup;
    expect(container.textContent).toBe('• Pay  then Test deals damage.');
    expect(container.querySelector('strong .ms-w')).not.toBeNull();
    expect(container.querySelector('s')?.textContent).toBe('damage');
    expect(isBulletText('*Bold*')).toBe(false);
    expect(isBulletText('**Literal**')).toBe(false);
  });

  it('renders formatted card names in name references without changing saved text', () => {
    const line = '~ attacks.';
    const name = '*Hero* "Name"...';
    const markup = renderToStaticMarkup(<p>{injectForText(line, name, [])}</p>);
    expect(markup).toBe('<p><strong>Hero</strong> “Name”… attacks.</p>');
    expect(line).toBe('~ attacks.');
    expect(name).toBe('*Hero* "Name"...');
  });

  it.each(['[Scry -]', '[Scry 1]'])(
    'renders formatting and smart punctuation in expanded mechanics: %s',
    input => {
      const container = document.createElement('div');
      container.innerHTML = renderToStaticMarkup(
        <p>
          {injectForText(input, 'Hero', [
            { uuid: 'scry', name: 'Scry', description: '*Look* at "this"...' },
          ])}
        </p>,
      );
      expect(container.querySelector('strong')?.textContent).toBe('Look');
      expect(container.textContent).toContain('Look at “this”…');
    },
  );

  it('keeps HTML-like user input as text', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(
      <p>{injectForText('*<img src=x onerror=alert(1)>*', 'Test', [])}</p>,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it.each([
    ['He said "Hello" and "Goodbye"...', 'He said “Hello” and “Goodbye”…'],
    ["It's 'magic'...", 'It’s ‘magic’…'],
    ['"*Hello*" and _"goodbye"_...', '“Hello” and “goodbye”…'],
    ['Already “curly” and …', 'Already “curly” and …'],
  ])('renders smart punctuation without losing text: %s', (input, expected) => {
    for (const content of [injectForText(input, 'Test', []), injectForFlavour(input, 'Test')]) {
      const container = document.createElement('div');
      container.innerHTML = renderToStaticMarkup(<p>{content}</p>);
      expect(container.textContent).toBe(expected);
    }
  });

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
    ['[-Ravage 1]', '(Draw 1 cards.)'],
    ['[- Ravage 1]', '(Draw 1 cards.)'],
    ['[-Ravage -1]', '(Draw -1 cards.)'],
    ['[-Ravage]', '(Draw  cards.)'],
    ['[Ravage -]', '(Draw  cards.)'],
    ['[-Ravage two more]', '(Draw two more cards.)'],
    ['[Ravage]', 'Ravage (Draw  cards.)'],
    ['[Ravage -1]', 'Ravage -1 (Draw -1 cards.)'],
    ['[Ravage two more]', 'Ravage two more (Draw two more cards.)'],
    ['[Ravage] and more', 'Ravage (Draw  cards.) and more'],
    ['[Ravage 1] and more', 'Ravage 1 (Draw 1 cards.) and more'],
    ['[Ravage -- 1]', 'Ravage—1 (Draw 1 cards.)'],
    ['[Ravage--1]', 'Ravage—1 (Draw 1 cards.)'],
    ['[Ravage -- two more]', 'Ravage—two more (Draw two more cards.)'],
    ['[Ravage --]', 'Ravage— (Draw  cards.)'],
    ['[Ravage two -- more]', 'Ravage two — more (Draw two — more cards.)'],
    ['[Ravage two--more]', 'Ravage two — more (Draw two — more cards.)'],
    ['Before -- [Ravage 1] -- after', 'Before — Ravage 1 (Draw 1 cards.) — after'],
    ['[Unknown--mechanic]', '[Unknown — mechanic]'],
  ])('renders the mechanic ref and reminder of %s', (line, expected) => {
    const mechanic: MechanicInterface = {
      uuid: 'mechanic-1',
      name: 'Ravage',
      description: 'Draw {ref} cards.',
    };
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(<p>{injectForText(line, 'Test', [mechanic])}</p>);

    expect(container.textContent).toBe(expected);
  });

  it.each([
    ['[Flashback -- {2}{W}, Sacrifice a creature.]', 'Flashback—, Sacrifice a creature. '],
    ['[Flashback {2}{W}, Sacrifice a creature.]', 'Flashback , Sacrifice a creature. '],
  ])('renders the ref of %s followed by italic reminder text', (line, expectedPrefix) => {
    const reminder =
      'You may cast this card from your graveyard for its flashback cost. Then exile it.';
    const mechanic: MechanicInterface = {
      uuid: 'flashback',
      name: 'Flashback',
      description: reminder,
    };
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(<p>{injectForText(line, 'Test', [mechanic])}</p>);

    // The mana icons sit where the ref text shows a gap.
    expect(container.textContent).toBe(`${expectedPrefix}(${reminder})`);
    const italic = container.querySelector<HTMLElement>('span[style*="italic"]');
    expect(italic?.textContent).toBe(`(${reminder})`);
    expect(container.querySelectorAll('.ms-2, .ms-w')).toHaveLength(2);
  });

  it.each([
    ['Pay {w}{u}{1}.', ['1', 'w', 'u']],
    ['Pay {W}{R}{2}, then {G}{B}{X}.', ['2', 'r', 'w', 'x', 'b', 'g']],
    ['Pay {wu}{G}{1}.', ['1', 'g', 'wu']],
    ['Pay {u}{r}{ur}.', ['u', 'ur', 'r']],
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

  it.each([
    ['Tap--draw a card'],
    ['Tap --draw a card'],
    ['Tap-- draw a card'],
    ['Tap   --   draw a card'],
  ])('should render exactly one space on each side of the dash in %s', line => {
    const markup = renderToStaticMarkup(<div>{injectForText(line, 'Test', [])}</div>);
    expect(markup).toContain('Tap — draw a card');
  });

  it('should space every -- on a line, including next to formatted text', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(
      <div>{injectForText('One--*two*--three', 'Test', [])}</div>,
    );
    expect(container.textContent).toBe('One — two — three');
  });

  it.each([
    ['[Ravage 1]', 'Ravage 1 (Draw — then say “Go”…  Test it’s 1.)'],
    ['[-Ravage 1]', '(Draw — then say “Go”…  Test it’s 1.)'],
    ['[Ravage -- 1]', 'Ravage—1 (Draw — then say “Go”…  Test it’s 1.)'],
  ])('converts dashes, quotes and ellipses in the mechanic text of %s', (line, expected) => {
    const mechanic: MechanicInterface = {
      uuid: 'mechanic-1',
      name: 'Ravage',
      description: `Draw--then say "Go"... {w} ~ it's {ref}.`,
    };
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(<p>{injectForText(line, 'Test', [mechanic])}</p>);

    // The double space is where the mana icon sits; it has no text of its own.
    expect(container.textContent).toBe(expected);
    expect(container.querySelector('.ms-w')).not.toBeNull();
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

    expect(markup).toContain('— Indented paragraph.');
    expect(markup).not.toContain('•');
  });
});
