import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { compileString } from 'sass';
import { readFileSync } from 'node:fs';

describe('extended-art artifact type-line color', () => {
  let stylesheet: HTMLStyleElement;

  beforeAll(() => {
    stylesheet = document.createElement('style');
    stylesheet.textContent = compileString(
      readFileSync('src/components/TemplatingCardRender/TemplatingCardRender.module.scss', 'utf8'),
    ).css;
    document.head.appendChild(stylesheet);
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  afterAll(() => stylesheet.remove());

  it('colors the type-line text white on an extended-art artifact', () => {
    const card = document.createElement('div');
    card.className = 'cardRender artifact extended';
    const typeLine = document.createElement('div');
    typeLine.className = 'type';
    typeLine.textContent = 'Artifact';
    card.appendChild(typeLine);
    document.body.appendChild(card);

    expect(getComputedStyle(typeLine).color).toBe('rgb(255, 255, 255)');
  });
});
