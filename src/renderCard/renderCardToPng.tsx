// Renders a card face offscreen at its native 1500x2100 size and captures it
// as an image, for downloads from the app (the CLI `npm run render:card` uses
// Electron's capturePage instead).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { domToBlob, domToCanvas } from 'modern-screenshot';

import TemplatingCardRender from '../components/TemplatingCardRender';
import { MechanicsContext } from '../store';
import MechanicInterface from '../interfaces/MechanicInterface';
import { CARD_WIDTH } from '../utils/constants';
import waitForStableRender, { nextFrame } from './waitForStableRender';
import styles from './renderCardToPng.module.scss';

export type CardRenderProps = React.ComponentProps<typeof TemplatingCardRender>;

export interface CardImageOptions {
  type?: 'image/png' | 'image/jpeg';
  // JPEG only, 0–1.
  quality?: number;
  // Output size relative to the native 1500x2100 (0.5 → 750x1050).
  scale?: number;
}

export const renderCardToImage = async (
  props: CardRenderProps,
  mechanics: MechanicInterface[],
  { type = 'image/png', quality, scale = 1 }: CardImageOptions = {},
): Promise<Blob> => {
  const host = document.createElement('div');
  host.className = styles.host;
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(
      <MechanicsContext.Provider value={mechanics}>
        <TemplatingCardRender {...props} containerWidth={CARD_WIDTH} />
      </MechanicsContext.Provider>,
    );
    await nextFrame();
    await waitForStableRender(host);
    await nextFrame();

    // Draws through an SVG foreignObject, so the browser itself paints the card
    // (fonts, masks, zoom) instead of a re-implementation like html2canvas.
    const card = (host.firstElementChild as HTMLElement | null) ?? host;
    if (type === 'image/png' && scale === 1) return await domToBlob(card, { type, scale: 1 });

    // Smaller sizes and JPEG are made from the full-size capture: letting
    // modern-screenshot scale or encode them itself loses the card art.
    const capture = await domToCanvas(card, { scale: 1 });
    const output = document.createElement('canvas');
    output.width = Math.round(capture.width * scale);
    output.height = Math.round(capture.height * scale);
    const context = output.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not available');
    if (type === 'image/jpeg') {
      // JPEG has no alpha: rounded corners would turn black without a fill.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, output.width, output.height);
    }
    context.imageSmoothingQuality = 'high';
    context.drawImage(capture, 0, 0, output.width, output.height);
    return await new Promise<Blob>((resolve, reject) =>
      output.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
        type,
        quality,
      ),
    );
  } finally {
    root.unmount();
    host.remove();
  }
};

const renderCardToPng = (props: CardRenderProps, mechanics: MechanicInterface[]) =>
  renderCardToImage(props, mechanics);

export default renderCardToPng;
