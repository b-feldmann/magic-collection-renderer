import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import EmojiIcon from './EmojiIcon';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('EmojiIcon', () => {
  // Regression: React 19 freezes element props in development, and emoji-mart
  // v2 mutates its props (`props.skin = ...`), which used to throw
  // "Cannot add property skin, object is not extensible".
  it('should render without mutating frozen React props', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<EmojiIcon emoji="smiley" set="apple" size={16} />);
    });

    expect(container.querySelector('.emoji-mart-emoji')).not.toBeNull();
  });
});
