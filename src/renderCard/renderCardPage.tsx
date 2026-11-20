// Entry of the headless card render page (scripts/render-card/render.html),
// driven by `npm run render:card`. Electron calls `window.__renderCard` with
// the card face to draw, waits for the returned size and captures the page.
import React from 'react';
import { createRoot } from 'react-dom/client';

import 'mana-font/css/mana.css';
import '../index.css';
import TemplatingCardRender from '../components/TemplatingCardRender';
import { MechanicsContext, TokenCardsContext } from '../store';
import { TokenCardMatch } from '../utils/tokenLinks';
import MechanicInterface from '../interfaces/MechanicInterface';
import waitForStableRender, { nextFrame } from './waitForStableRender';

type CardRenderProps = React.ComponentProps<typeof TemplatingCardRender>;

export interface RenderCardJob {
  props: CardRenderProps;
  mechanics: MechanicInterface[];
  // The collection's token cards, which token references in rules text are written out from.
  tokenCards?: TokenCardMatch[];
}

declare global {
  interface Window {
    __renderCard?: (job: RenderCardJob) => Promise<{ width: number; height: number }>;
  }
}

const container = document.getElementById('root')!;
const root = createRoot(container);

window.__renderCard = async ({ props, mechanics, tokenCards = [] }) => {
  root.render(
    <MechanicsContext.Provider value={mechanics}>
      <TokenCardsContext.Provider value={tokenCards}>
        <TemplatingCardRender {...props} />
      </TokenCardsContext.Provider>
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
