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

const QUIET_MS = 300;
const POLL_MS = 100;
const TIMEOUT_MS = 30_000;

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// The card settles over several passes (image loads, text fitting in layout
// effects), so wait until its images are in and the DOM has been quiet.
const waitForStableRender = async (element: HTMLElement) => {
  let lastChange = performance.now();
  const observer = new MutationObserver(() => {
    lastChange = performance.now();
  });
  observer.observe(element, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });

  const deadline = performance.now() + TIMEOUT_MS;
  try {
    while (performance.now() < deadline) {
      await sleep(POLL_MS);
      await document.fonts.ready;
      const imagesLoaded = [...element.querySelectorAll('img')].every(img => img.complete);
      const animating = document
        .getAnimations()
        .some(animation => animation.playState === 'running' || animation.pending);
      if (imagesLoaded && !animating && performance.now() - lastChange >= QUIET_MS) return;
    }
    console.warn('Card render did not settle in time; capturing the current state.');
  } finally {
    observer.disconnect();
  }
};

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
