// Entry of the headless card render page (scripts/render-card/render.html),
// driven by `npm run render:card`. Electron calls `window.__renderCard` with
// the card face to draw, waits for the returned size and captures the page.
import React from 'react';
import { createRoot } from 'react-dom/client';

import 'mana-font/css/mana.css';
import '../index.css';
import TemplatingCardRender from '../components/TemplatingCardRender';
import { MechanicsContext } from '../store';
import MechanicInterface from '../interfaces/MechanicInterface';
import waitForStableRender, { nextFrame } from './waitForStableRender';

type CardRenderProps = React.ComponentProps<typeof TemplatingCardRender>;

export interface RenderCardJob {
  props: CardRenderProps;
  mechanics: MechanicInterface[];
}

declare global {
  interface Window {
    __renderCard?: (job: RenderCardJob) => Promise<{ width: number; height: number }>;
  }
}

const container = document.getElementById('root')!;
const root = createRoot(container);

window.__renderCard = async ({ props, mechanics }) => {
  root.render(
    <MechanicsContext.Provider value={mechanics}>
      <TemplatingCardRender {...props} />
    </MechanicsContext.Provider>,
  );
  await nextFrame();
  await waitForStableRender(container);
  await nextFrame();
  await nextFrame();

  const card = (container.firstElementChild as HTMLElement | null) ?? container;
  const { width, height } = card.getBoundingClientRect();
  return { width, height };
};
