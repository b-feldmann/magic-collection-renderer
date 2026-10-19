import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BigCardRenderModal from './BigCardRenderModal';
import TrainerGalleryHolofoil from './TrainerGalleryHolofoil';
import CardInterface from '../../interfaces/CardInterface';
import { CardState, CardType, RarityType } from '../../interfaces/enums';
import holofoilStyles from './TrainerGalleryHolofoil.module.scss';

vi.mock('antd', () => ({
  Button: () => null,
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../TemplatingCardRender/index', () => ({
  NonMemoCardRender: () => <div data-testid="rendered-card" />,
}));

vi.mock('../RotateToMouse/RotateToMouse', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../AnnotationList/AnnotationList', () => ({
  default: () => null,
}));

const card: CardInterface = {
  name: 'Holo Test',
  rarity: RarityType.Rare,
  creator: { name: 'Creator', uuid: 'creator', seenCards: [], lastSeenVersion: 0 },
  uuid: 'card-uuid',
  manaCost: '',
  front: {
    name: 'Holo Test',
    cardTypes: [CardType.Creature],
    cardText: [],
  },
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: 0,
    createdAt: 0,
    state: CardState.Draft,
  },
};

describe('BigCardRenderModal Trainer Gallery holofoil', () => {
  it('scales the holofoil corner radius with the card width', () => {
    const { container } = render(
      <TrainerGalleryHolofoil cardWidth={300}>
        <div />
      </TrainerGalleryHolofoil>,
    );
    const wrapper = container.querySelector(`.${holofoilStyles.holofoilWrapper}`);

    expect(wrapper).toHaveStyle({ width: '300px', borderRadius: '12px' });
  });

  it('layers the holofoil effect over each rendered card face', () => {
    const { container } = render(
      <BigCardRenderModal
        card={card}
        visible
        hide={() => {}}
        collectionNumber={1}
        collectionSize={1}
      />,
    );

    expect(container.querySelectorAll('[data-testid="rendered-card"]')).toHaveLength(1);
    expect(
      container.querySelectorAll(`.${holofoilStyles.shine}, .${holofoilStyles.glare}`),
    ).toHaveLength(2);
  });

  it('shows a heart on a favorited card model', () => {
    render(
      <BigCardRenderModal
        card={{ ...card, favorite: true }}
        visible
        hide={() => {}}
        collectionNumber={1}
        collectionSize={1}
      />,
    );

    expect(screen.getByRole('img', { name: 'Favorite card' })).toBeVisible();
  });

  it('moves the foil highlight with the pointer', () => {
    const { getByTestId } = render(
      <BigCardRenderModal
        card={card}
        visible
        hide={() => {}}
        collectionNumber={1}
        collectionSize={1}
      />,
    );
    const wrapper = getByTestId('rendered-card').parentElement as HTMLElement;

    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 200,
      width: 100,
      height: 200,
      toJSON: () => ({}),
    });

    fireEvent.pointerMove(wrapper, { clientX: 75, clientY: 50 });

    expect(wrapper).toHaveStyle('--pointer-x: 75%; --pointer-y: 25%');
  });
});
