import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CollectionFilterControls from './CollectionFilterControls';
import { CardType, RarityType } from '../../interfaces/enums';
import styles from './styles.module.scss';

vi.mock('antd', () => ({
  Checkbox: ({
    children,
    checked,
    onChange,
    'aria-label': ariaLabel,
  }: React.PropsWithChildren<{
    checked: boolean;
    onChange: (event: { target: { checked: boolean } }) => void;
    'aria-label'?: string;
  }>) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        aria-label={ariaLabel}
        onChange={event => onChange({ target: { checked: event.target.checked } })}
      />
      {children}
    </label>
  ),
  Input: () => <input />,
  Row: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Slider: () => <input type="range" />,
}));

vi.mock('../TemplatingCardRender/assetLoader', () => ({
  getRarityIcon: (rarity: RarityType) => `${rarity}.png`,
}));

describe('CollectionFilterControls rarity filters', () => {
  it('renders without an update loop when mobile omits availableTags', () => {
    // Stop a regression at React's first warning rather than hanging the runner.
    const consoleError = vi.spyOn(console, 'error').mockImplementation((message, ...args) => {
      if (String(message).includes('Maximum update depth exceeded')) {
        throw new Error(String(message));
      }
      console.warn(message, ...args);
    });
    try {
      expect(() =>
        render(<CollectionFilterControls collection={[]} setNameFilter={vi.fn()} />),
      ).not.toThrow();
      expect(screen.getByText('Filter by name')).toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('shows rarity icons and counts without rarity names', () => {
    const availableTags: string[] = [];
    const collection = [
      {
        name: 'Test Card',
        rarity: RarityType.Common,
        creator: { uuid: 'creator-1', name: 'Creator' },
        uuid: 'card-1',
        manaCost: '',
        front: { name: 'Test Card', cardTypes: [CardType.Creature], cardText: [] },
        meta: {},
      },
    ] as never[];

    render(
      <CollectionFilterControls
        collection={collection}
        availableTags={availableTags}
        setCollectionFilter={vi.fn()}
        setNameFilter={vi.fn()}
      />,
    );

    const rarityCheckbox = screen.getByRole('checkbox', { name: /Common/ });
    const rarityOption = rarityCheckbox.closest('label')!;
    const rarityContent = rarityOption.querySelector(`.${styles.rarityOptionContent}`);
    const rarityGrid = screen.getByTestId('rarity-filter-grid');
    const colorGrid = screen.getByTestId('color-filter-grid');
    expect(rarityCheckbox).toHaveAttribute('aria-label', 'Common rarity');
    expect(rarityGrid).toHaveClass(styles.filterOptionGrid);
    expect(colorGrid).toHaveClass(styles.filterOptionGrid);
    expect(rarityContent).toHaveClass(styles.rarityOptionContent);
    expect(rarityContent).toHaveTextContent('(1)');
    expect(rarityContent?.querySelector('img')).toHaveAttribute('src', 'Common.png');
    expect(rarityContent?.querySelector('img')).toHaveAttribute('width', '24');
    expect(rarityContent?.querySelector('img')).toHaveAttribute('height', '24');
    expect(rarityContent?.querySelector('img')).toHaveClass(styles.rarityIcon);
    expect(rarityContent).not.toHaveTextContent('Common');
  });
});
