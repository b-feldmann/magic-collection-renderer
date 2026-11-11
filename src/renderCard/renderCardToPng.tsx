// Renders a card face offscreen at its native 1500x2100 size and captures it
// as a PNG, for downloads from the app (the CLI `npm run render:card` uses
// Electron's capturePage instead).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { domToBlob } from 'modern-screenshot';

import TemplatingCardRender from '../components/TemplatingCardRender';
import { MechanicsContext } from '../store';
import MechanicInterface from '../interfaces/MechanicInterface';
import { CARD_WIDTH } from '../utils/constants';
import waitForStableRender, { nextFrame } from './waitForStableRender';
import styles from './renderCardToPng.module.scss';

export type CardRenderProps = React.ComponentProps<typeof TemplatingCardRender>;

const renderCardToPng = async (
  props: CardRenderProps,
  mechanics: MechanicInterface[],
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
    return await domToBlob(card, { type: 'image/png', scale: 1 });
  } finally {
    root.unmount();
    host.remove();
  }
};

export default renderCardToPng;
