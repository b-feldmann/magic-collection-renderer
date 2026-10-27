import React from 'react';
import { render, screen } from '@testing-library/react';
import { compile } from 'sass';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import CollectionFilterControls from './CollectionFilterControls';
import { EMPTY_CARD } from '../../actions/cardActions';
import styles from './styles.module.scss';

it('sizes the actual antd 6 checkbox rather than its removed inner element', () => {
  const stylesheet = document.createElement('style');
  // Apply the real module stylesheet, resolving :global and scoped class names.
  stylesheet.textContent = compile(
    resolve('src/components/CollectionFilterControls/styles.module.scss'),
  )
    .css.replace(/:global\(([^)]+)\)/g, '$1')
    .replace(/\.([_a-zA-Z][\w-]*)/g, (selector, name: string) =>
      name.startsWith('ant-') ? selector : `.${styles[name]}`,
    );
  document.head.append(stylesheet);
  try {
    render(
      <CollectionFilterControls
        collection={[EMPTY_CARD()]}
        setNameFilter={() => {}}
        setCollectionFilter={() => {}}
      />,
    );
    const checkbox = screen
      .getByRole('checkbox', { name: 'Creature type' })
      .closest('.ant-checkbox')!;
    expect(getComputedStyle(checkbox).width).toBe('13px');
    expect(getComputedStyle(checkbox).height).toBe('13px');
    expect(getComputedStyle(checkbox).borderRadius).toBe('3px');
  } finally {
    stylesheet.remove();
  }
});
