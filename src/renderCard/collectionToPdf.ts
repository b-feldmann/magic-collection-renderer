// Renders cards into an A4 print-and-play PDF: 3x3 cards per sheet at real
// size, centered with cut marks (see utils/printSheet). Each face is captured
// like the PNG download, as a full-size 1500x2100 JPEG (≈600 dpi at card
// size) so small rules text stays sharp in print and when zoomed in.
import { jsPDF } from 'jspdf';

import CardInterface from '../interfaces/CardInterface';
import MechanicInterface from '../interfaces/MechanicInterface';
import { fetchCoverImage } from '../actions/imageActions';
import { getCoverFileName, isLoadingCover } from '../utils/cover';
import { A4_HEIGHT, A4_WIDTH, CARDS_PER_SHEET, CUT_MARKS, SHEET_SLOTS } from '../utils/printSheet';
import { CardRenderProps, renderCardToImage } from './renderCardToPng';

const JPEG_QUALITY = 0.9;
const RENDER_SCALE = 1;

// Every printed face in collection order; a double-faced card's back follows
// its front. The collector number is the card's position in `numberedIn` (the
// list the card view numbers by), defaulting to `cards`.
export const getPrintFaces = (
  cards: CardInterface[],
  numberedIn: CardInterface[] = cards,
): CardRenderProps[] => {
  const numbers = new Map(numberedIn.map((card, index) => [card.uuid, index + 1]));
  return cards.flatMap((card, index) => {
    const shared = {
      cardID: card.uuid,
      creator: card.creator.name,
      rarity: card.rarity,
      manaCost: card.manaCost,
      collectionNumber: numbers.get(card.uuid) ?? index + 1,
      collectionSize: numberedIn.length,
    };
    const front = { ...card.front, ...shared };
    return card.back ? [front, { ...card.back, ...shared, backFace: true }] : [front];
  });
};

// Uploaded covers live in the middleware until a card is shown; fetch them here.
const withCoverImage = async (face: CardRenderProps): Promise<CardRenderProps> => {
  if (!isLoadingCover(face.cover)) return face;
  const name = getCoverFileName(face.cover);
  const data = await fetchCoverImage(face.cardID, face.backFace ? 1 : 0);
  return { ...face, cover: `base64:${name ? `${name}|` : ''}${data}` };
};

export interface PdfProgress {
  done: number;
  total: number;
}

const collectionToPdf = async (
  cards: CardInterface[],
  mechanics: MechanicInterface[],
  {
    numberedIn,
    onProgress,
    signal,
  }: {
    numberedIn?: CardInterface[];
    onProgress?: (progress: PdfProgress) => void;
    signal?: AbortSignal;
  } = {},
): Promise<Blob> => {
  const faces = getPrintFaces(cards, numberedIn);
  const pdf = new jsPDF({ unit: 'mm', format: [A4_WIDTH, A4_HEIGHT], compress: true });
  pdf.setProperties({ title: 'Magic collection', creator: 'BJennWare' });
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.2);
  onProgress?.({ done: 0, total: faces.length });

  for (const [index, face] of faces.entries()) {
    signal?.throwIfAborted();
    const slot = index % CARDS_PER_SHEET;
    if (slot === 0) {
      if (index > 0) pdf.addPage();
      CUT_MARKS.forEach(({ x1, y1, x2, y2 }) => pdf.line(x1, y1, x2, y2));
    }

    const blob = await renderCardToImage(await withCoverImage(face), mechanics, {
      type: 'image/jpeg',
      quality: JPEG_QUALITY,
      scale: RENDER_SCALE,
    });
    const { x, y, width, height } = SHEET_SLOTS[slot];
    // The JPEG is embedded as is (no re-encoding).
    pdf.addImage(
      new Uint8Array(await blob.arrayBuffer()),
      'JPEG',
      x,
      y,
      width,
      height,
      undefined,
      'NONE',
    );
    onProgress?.({ done: index + 1, total: faces.length });
  }

  signal?.throwIfAborted();
  return pdf.output('blob');
};

export default collectionToPdf;
