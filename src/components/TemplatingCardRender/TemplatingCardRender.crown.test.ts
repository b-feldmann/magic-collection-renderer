import { afterEach, beforeAll, afterAll, describe, expect, it } from 'vitest';
import { compileString } from 'sass';
import { readFileSync } from 'node:fs';

describe('crown thumbnail sizing', () => {
  let stylesheet: HTMLStyleElement;

  beforeAll(() => {
    // Apply both real stylesheets so the image loader's full-height placeholder
    // rule participates in the cascade, just as it does for rendered cards.
    stylesheet = document.createElement('style');
    const cardScss = readFileSync(
      'src/components/TemplatingCardRender/TemplatingCardRender.module.scss',
      'utf8',
    );
    const imageLoaderScss = readFileSync(
      'src/components/ImageLoader/ImageLoader.module.scss',
      'utf8',
    );
    stylesheet.textContent = compileString(`${imageLoaderScss}\n${cardScss}`).css;
    document.head.appendChild(stylesheet);
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  afterAll(() => stylesheet.remove());

  it.each([
    ['regular', 'cardRender', 'crown', '1435px'],
    ['full art', 'cardRender', 'crownFloating', '1420px'],
    ['nickname', 'cardRender nicknameFrame', 'crownFloating', '1432px'],
  ])(
    '%s crowns preserve their aspect ratio while the thumbnail is shown',
    (_, cardClass, crownClass, width) => {
      const card = document.createElement('div');
      card.className = cardClass;
      const thumbnail = document.createElement('img');
      thumbnail.className = `${crownClass} lowResPlaceholder imgLoaded`;
      card.appendChild(thumbnail);
      document.body.appendChild(card);

      expect(getComputedStyle(thumbnail).width).toBe(width);
      expect(getComputedStyle(thumbnail).height).toBe('auto');
    },
  );
});
