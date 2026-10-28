import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TemplatingCardRender from './TemplatingCardRender';
import InvocationCardRender from './InvocationCardRender';
import PlaneswalkerCardRender from './PlaneswalkerCardRender';
import { CardType, RarityType } from '../../interfaces/enums';
import FlavourText from './FlavourText';

describe('card field formatting', () => {
  it.each([
    ['standard', TemplatingCardRender],
    ['invocation', InvocationCardRender],
    ['planeswalker', PlaneswalkerCardRender],
  ] as const)('formats titles, types, and rules in %s', (_name, Renderer) => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(
      <Renderer
        name={'*Hero* "Name"...'}
        rarity={RarityType.Common}
        cardID="formatted-card"
        manaCost="{W}"
        cardTypes={[CardType.Creature]}
        cardSubTypes={'_Wizard_ "Type"...'}
        cardText={['*Draw* a card...']}
        collectionNumber={1}
        collectionSize={1}
      />,
    );
    expect(container.querySelector('strong')?.textContent).toBe('Hero');
    expect(container.querySelector('em')?.textContent).toBe('Wizard');
    expect(container.textContent).toContain('“Name”…');
    expect(container.textContent).toContain('“Type”…');
    expect(Array.from(container.querySelectorAll('strong'), el => el.textContent)).toContain(
      'Draw',
    );
  });

  it('renders formatted flavour with author quotes as nodes, not stringified arrays', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(
      <FlavourText name="Hero" flavourText={"*Wait*... _It's magic_"} flavourAuthor="Author" />,
    );
    expect(container.textContent).toBe('“Wait… It’s magic”— Author');
    expect(container.querySelector('strong')?.textContent).toBe('Wait');
    expect(container.querySelector('em')?.textContent).toBe('It’s magic');
  });
});
