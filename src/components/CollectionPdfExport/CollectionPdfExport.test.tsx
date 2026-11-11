import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import CardInterface from '../../interfaces/CardInterface';
import { CollectionPdfProgress, useCollectionPdfExport } from './CollectionPdfExport';

type Options = {
  onProgress?: (progress: { done: number; total: number }) => void;
  signal?: AbortSignal;
};
const { collectionToPdf } = vi.hoisted(() => ({
  collectionToPdf: vi.fn(
    async (_cards: unknown[], _mechanics: unknown[], _options: Options) => new Blob(['pdf']),
  ),
}));
vi.mock('../../renderCard/collectionToPdf', () => ({ default: collectionToPdf }));

const cards = [{ uuid: 'a', name: 'A' }] as unknown as CardInterface[];

const Harness = () => {
  const { start, cancel, progress } = useCollectionPdfExport();
  return (
    <>
      <button onClick={() => start(cards)}>Export</button>
      <CollectionPdfProgress progress={progress} onCancel={cancel} />
    </>
  );
};

let downloads: string[];
beforeEach(() => {
  downloads = [];
  URL.createObjectURL = vi.fn(() => 'blob:pdf');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  collectionToPdf.mockClear();
});

it('shows the progress while rendering and saves the PDF', async () => {
  let finish: (blob: Blob) => void = () => {};
  collectionToPdf.mockImplementationOnce(
    (_cards, _mechanics, { onProgress }) =>
      new Promise(resolve => {
        onProgress?.({ done: 1, total: 4 });
        finish = resolve;
      }),
  );
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Export' }));

  expect(await screen.findByText('Rendering card 2 of 4…')).toBeInTheDocument();
  finish(new Blob(['pdf']));
  await waitFor(() => expect(downloads).toEqual(['magic-collection.pdf']));
});

it('cancels the export without saving', async () => {
  collectionToPdf.mockImplementationOnce(
    (_cards, _mechanics, { signal }) =>
      new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason));
      }),
  );
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Export' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

  const { signal } = collectionToPdf.mock.calls[0][2];
  expect(signal?.aborted).toBe(true);
  await act(async () => {});
  expect(downloads).toEqual([]);
});
