const QUIET_MS = 300;
const POLL_MS = 100;
const TIMEOUT_MS = 30_000;

export const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// A card settles over several passes (image loads, text fitting in layout
// effects), so wait until its images are in and the DOM has been quiet.
// Only animations inside `element` count, so the rest of the page may animate.
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
      const animating = element
        .getAnimations({ subtree: true })
        .some(animation => animation.playState === 'running' || animation.pending);
      if (imagesLoaded && !animating && performance.now() - lastChange >= QUIET_MS) return;
    }
    console.warn('Card render did not settle in time; capturing the current state.');
  } finally {
    observer.disconnect();
  }
};

export default waitForStableRender;
