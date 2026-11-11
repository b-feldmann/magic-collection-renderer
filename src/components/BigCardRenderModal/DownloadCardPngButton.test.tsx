import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import DownloadCardPngButton, { toPngFileName } from './DownloadCardPngButton';
import CardInterface from '../../interfaces/CardInterface';

const renderCardToPng = vi.fn(
  async (_props: Record<string, unknown>, _mechanics: unknown[]) =>
    new Blob(['png'], { type: 'image/png' }),
);
vi.mock('../../renderCard/renderCardToPng', () => ({ default: renderCardToPng }));

const card = (overrides: Partial<CardInterface> = {}) =>
  ({
    uuid: 'card-1',
    name: 'Holo-Engineer',
    front: { name: 'Holo-Engineer', cover: '' },
    creator: { name: 'Ben', uuid: 'u1' },
    rarity: 'rare',
    manaCost: '',
    ...overrides,
  }) as unknown as CardInterface;

let downloads: string[];
beforeEach(() => {
  downloads = [];
  URL.createObjectURL = vi.fn(() => 'blob:card');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  renderCardToPng.mockClear();
});

it('names files like the render:card script', () => {
  expect(toPngFileName("V'Ger, the Intruder")).toBe('v-ger-the-intruder.png');
  expect(toPngFileName('Preparation is Key', true)).toBe('preparation-is-key-back.png');
});

it('saves one PNG per face of a double-faced card', async () => {
  render(
    <DownloadCardPngButton
      card={card({ back: { name: 'Back', cover: '' } } as Partial<CardInterface>)}
      collectionNumber={3}
      collectionSize={10}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /download png/i }));

  await waitFor(() => expect(downloads).toEqual(['holo-engineer.png', 'holo-engineer-back.png']));
  expect(renderCardToPng).toHaveBeenCalledTimes(2);
  expect(renderCardToPng.mock.calls[1][0]).toMatchObject({ backFace: true, collectionNumber: 3 });
});

it('is disabled while an uploaded cover is still loading', () => {
  render(
    <DownloadCardPngButton
      card={card({
        front: { name: 'Holo-Engineer', cover: 'loading:art.png' },
      } as Partial<CardInterface>)}
      collectionNumber={1}
      collectionSize={1}
    />,
  );
  expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();
});
