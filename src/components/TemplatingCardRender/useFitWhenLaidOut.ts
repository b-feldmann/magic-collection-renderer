import { RefObject, useCallback, useLayoutEffect, useRef } from 'react';

/** Whether the element takes up space, i.e. text inside it can be measured. */
const isLaidOut = (el: HTMLElement) => el.offsetWidth > 0 || el.offsetHeight > 0;

/**
 * Wraps a text fit that measures the rendered card. A card that isn't laid
 * out (e.g. in a modal that hasn't opened yet, or under `display: none`)
 * measures every text as empty, and a fit cached from that would stay wrong
 * once the card is shown. So the returned function skips the fit while
 * `frameRef` (the card's 1500×2100 frame) has no size, and fits as soon as the
 * frame gets laid out. Visible cards are never refitted by the observer.
 *
 * The returned function is stable and always runs the latest `fit`; call it
 * from effects declared after this hook.
 */
const useFitWhenLaidOut = (frameRef: RefObject<HTMLElement | null>, fit: () => void) => {
  const latestFit = useRef(fit);
  const skippedWhileHidden = useRef(false);

  // Declared before the caller's effects, so they see this render's `fit`.
  useLayoutEffect(() => {
    latestFit.current = fit;
  });

  const fitIfLaidOut = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (!isLaidOut(frame)) {
      skippedWhileHidden.current = true;
      return;
    }
    skippedWhileHidden.current = false;
    latestFit.current();
  }, [frameRef]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      if (skippedWhileHidden.current && isLaidOut(frame)) fitIfLaidOut();
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frameRef, fitIfLaidOut]);

  return fitIfLaidOut;
};

export default useFitWhenLaidOut;
