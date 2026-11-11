import { afterEach, describe, expect, it, vi } from 'vitest';

import CardInterface from '../interfaces/CardInterface';

const { renderCardToImage, fetchCoverImage, pdfs } = vi.hoisted(() => ({
  renderCardToImage: vi.fn(
    async (_props: Record<string, unknown>, _mechanics: unknown[], _options: object) => ({
      arrayBuffer: async () => new ArrayBuffer(4),
    }),
  ),
  fetchCoverImage: vi.fn(async () => 'data:image/png;base64,abc'),
  pdfs: [] as { pages: number; images: number[]; lines: number }[],
}));

vi.mock('./renderCardToPng', () => ({ renderCardToImage }));
vi.mock('../actions/imageActions', () => ({ fetchCoverImage }));
vi.mock('jspdf', () => ({
  jsPDF: class {
    record = { pages: 1, images: [] as number[], lines: 0 };
    constructor() {
      pdfs.push(this.record);
    }
    setProperties() {}
    setDrawColor() {}
    setLineWidth() {}
    line() {
      this.record.lines += 1;
    }
    addPage() {
      this.record.pages += 1;
    }
    addImage() {
      this.record.images.push(this.record.pages);
    }
    output() {
      return new Blob(['pdf']);
    }
  },
}));

import collectionToPdf, { getPrintFaces } from './collectionToPdf';

const card = (name: string, extra: Partial<CardInterface> = {}) =>
  ({
    uuid: `id-${name}`,
    name,
    front: { name, cover: '' },
    creator: { name: 'Ben', uuid: 'u1' },
    rarity: 'rare',
    manaCost: '',
    ...extra,
  }) as unknown as CardInterface;

afterEach(() => {
  vi.clearAllMocks();
  pdfs.length = 0;
});

describe('getPrintFaces', () => {
  it('puts the back right after its front and numbers cards by position', () => {
    const faces = getPrintFaces([
      card('A'),
      card('B', { back: { name: 'B back', cover: '' } } as Partial<CardInterface>),
    ]);
    expect(faces.map(face => [face.name, face.backFace ?? false, face.collectionNumber])).toEqual([
      ['A', false, 1],
      ['B', false, 2],
      ['B back', true, 2],
    ]);
    expect(faces[0].collectionSize).toBe(2);
  });

  it('numbers cards by their position in the full list when given one', () => {
    const all = [card('A'), card('B'), card('C')];
    const faces = getPrintFaces([all[2]], all);
    expect(faces[0]).toMatchObject({ collectionNumber: 3, collectionSize: 3 });
  });
});

describe('collectionToPdf', () => {
  it('fills A4 sheets with nine cards each and draws cut marks on every sheet', async () => {
    const cards = Array.from({ length: 10 }, (_, index) => card(`Card ${index}`));
    const progress = vi.fn();
    await collectionToPdf(cards, [], { onProgress: progress });

    expect(pdfs[0].pages).toBe(2);
    expect(pdfs[0].images).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 2]);
    expect(pdfs[0].lines).toBe(48);
    expect(progress).toHaveBeenLastCalledWith({ done: 10, total: 10 });
    expect(renderCardToImage.mock.calls[0][1]).toEqual([]);
    expect(renderCardToImage.mock.calls[0][2]).toMatchObject({ type: 'image/jpeg', quality: 0.9 });
  });

  it('fetches uploaded covers before rendering', async () => {
    await collectionToPdf(
      [card('Art', { front: { name: 'Art', cover: 'loading:art.png' } } as Partial<CardInterface>)],
      [],
    );
    expect(fetchCoverImage).toHaveBeenCalledWith('id-Art', 0);
    expect(renderCardToImage.mock.calls[0][0]).toMatchObject({
      cover: 'base64:art.png|data:image/png;base64,abc',
    });
  });

  it('stops when cancelled', async () => {
    const controller = new AbortController();
    const cards = [card('A'), card('B')];
    const run = collectionToPdf(cards, [], {
      signal: controller.signal,
      onProgress: ({ done }) => {
        if (done === 1) controller.abort();
      },
    });
    await expect(run).rejects.toThrow();
    expect(renderCardToImage).toHaveBeenCalledTimes(1);
  });
});
