import React, { useEffectEvent, useLayoutEffect, useRef, useState } from 'react';

/**
 * Replacement for the unmaintained `react-resize-text` package (incompatible
 * with React 19). Shrinks the rendered font size until the content fits inside
 * its (CSS-bounded) container, staying within [minFontSize, maxFontSize].
 *
 * Fitting forces synchronous layouts, so it only runs when the rendered content,
 * the fit limits, the box size or the loaded fonts changed. Re-renders that leave
 * all of those alone cost a string comparison.
 */
export interface TextResizeProps {
  defaultFontSize?: number;
  maxFontSize?: number;
  minFontSize?: number;
  lineHeight?: number;
  /**
   * Line height (in em) used while the text still fits at maxFontSize. Printed
   * card text that didn't have to shrink is set a little looser than shrunk
   * text. Defaults to `lineHeight`.
   */
  fullSizeLineHeight?: number;
  /**
   * Keep the line height (in em) and the paragraph margins (in px) constant
   * while shrinking, like printed card text. By default both tighten as the
   * font shrinks.
   */
  fixedSpacing?: boolean;
  /**
   * Only these font sizes may be used (printed text shrinks in fixed steps).
   * Sizes outside [minFontSize, maxFontSize] are ignored; maxFontSize is always
   * tried first. By default every whole pixel size is allowed.
   */
  sizeSteps?: number[];
  /** An additional fit check, run after the box overflow check passes. */
  fits?: (el: HTMLDivElement) => boolean;
  className?: string;
  children: React.ReactNode;
}

// A late web font changes how text wraps without resizing its box, so a
// ResizeObserver can't see it. One shared listener re-fits every mounted instance.
const fontLoadListeners = new Set<() => void>();
let observingFontLoads = false;

const onFontsLoaded = (listener: () => void) => {
  const { fonts } = document;
  if (!fonts?.addEventListener) return () => {};
  if (!observingFontLoads) {
    observingFontLoads = true;
    fonts.addEventListener('loadingdone', () => fontLoadListeners.forEach(notify => notify()));
  }
  fontLoadListeners.add(listener);
  return () => {
    fontLoadListeners.delete(listener);
  };
};

const TextResize: React.FC<TextResizeProps> = ({
  defaultFontSize = 20,
  maxFontSize = 32,
  minFontSize = 14,
  lineHeight = 1.2,
  fullSizeLineHeight,
  fixedSpacing = false,
  sizeSteps,
  fits,
  className,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number>(defaultFontSize);
  const lastFit = useRef<{ content: string; width: number; height: number } | null>(null);

  const contentKey = (el: HTMLElement) =>
    `${minFontSize}|${maxFontSize}|${lineHeight}|${fullSizeLineHeight}|${fixedSpacing}|${sizeSteps?.join(',')}|${el.innerHTML}`;

  const fit = useEffectEvent(() => {
    const el = containerRef.current;
    if (!el) return;

    const paragraphs = Array.from(el.querySelectorAll<HTMLElement>('p'));
    paragraphs.forEach(p => {
      p.style.marginTop = '';
      p.style.marginBottom = '';
    });
    el.style.lineHeight = '';

    const baseMargins = paragraphs.map(p => {
      const cs = getComputedStyle(p);
      return { top: parseFloat(cs.marginTop), bottom: parseFloat(cs.marginBottom) };
    });

    const applyScale = (size: number) => {
      const scale = size / maxFontSize;
      el.style.fontSize = `${size}px`;
      const lineHeightAtSize =
        size >= maxFontSize && fullSizeLineHeight !== undefined ? fullSizeLineHeight : lineHeight;
      el.style.lineHeight = fixedSpacing
        ? String(lineHeightAtSize)
        : ((lineHeightAtSize * (1 + scale)) / 2).toFixed(2);
      if (scale < 1 && !fixedSpacing) {
        const marginScale = Math.sqrt(scale);
        paragraphs.forEach((p, i) => {
          p.style.marginTop = `${baseMargins[i].top * marginScale}px`;
          p.style.marginBottom = `${baseMargins[i].bottom * marginScale}px`;
        });
      } else {
        paragraphs.forEach(p => {
          p.style.marginTop = '';
          p.style.marginBottom = '';
        });
      }
    };

    const fitsAt = (size: number) => {
      applyScale(size);
      // Styles keyed on data-shrunk (e.g. padding) must apply while measuring.
      el.dataset.shrunk = String(size < maxFontSize);
      return (
        el.scrollHeight <= el.clientHeight &&
        el.scrollWidth <= el.clientWidth &&
        (fits ? fits(el) : true)
      );
    };

    let size = maxFontSize;
    if (!fitsAt(size) && size > minFontSize) {
      if (sizeSteps) {
        // Largest allowed step that fits; the smallest one is used even if
        // the text still overflows there.
        const steps = sizeSteps
          .filter(step => step < maxFontSize && step >= minFontSize)
          .sort((a, b) => b - a);
        if (steps.length) {
          let fitting = steps.length - 1;
          let overflowing = -1;
          while (fitting - overflowing > 1) {
            const middle = Math.floor((fitting + overflowing) / 2);
            if (fitsAt(steps[middle])) fitting = middle;
            else overflowing = middle;
          }
          size = steps[fitting];
        } else {
          size = minFontSize;
        }
      } else {
        // Binary search for the largest fitting size; minFontSize is used even
        // if the text still overflows there.
        let fitting = minFontSize;
        let overflowing = maxFontSize;
        while (overflowing - fitting > 1) {
          const middle = Math.floor((fitting + overflowing) / 2);
          if (fitsAt(middle)) fitting = middle;
          else overflowing = middle;
        }
        size = fitting;
      }
      applyScale(size);
    }
    // Lets CSS style shrunk text differently (e.g. top-align it like print).
    el.dataset.shrunk = String(size < maxFontSize);
    setFontSize(size);
    lastFit.current = { content: contentKey(el), width: el.clientWidth, height: el.clientHeight };
  });

  // Runs after every commit on purpose: `children` is a new object each render,
  // so whether the content really changed can only be told from the DOM.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el && lastFit.current?.content !== contentKey(el)) fit();
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const observer = new ResizeObserver(() => {
      const last = lastFit.current;
      if (last && last.width === el.clientWidth && last.height === el.clientHeight) return;
      fit();
    });
    observer.observe(el);
    const stopListeningToFonts = onFontsLoaded(() => fit());
    return () => {
      observer.disconnect();
      stopListeningToFonts();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        fontSize,
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        contain: 'layout paint',
      }}
    >
      {children}
    </div>
  );
};

export default TextResize;
