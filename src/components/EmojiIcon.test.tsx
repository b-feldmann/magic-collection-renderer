import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import EmojiIcon from './EmojiIcon';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('EmojiIcon', () => {
  it('should render the accessible emoji trigger icon', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<EmojiIcon size={16} />);
    });

    expect(container.querySelector('.anticon-smile')).not.toBeNull();
  });
});
