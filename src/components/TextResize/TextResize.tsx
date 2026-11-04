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
  className,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number>(defaultFontSize);
  const lastFit = useRef<{ content: string; width: number; height: number } | null>(null);

  const contentKey = (el: HTMLElement) =>
    `${minFontSize}|${maxFontSize}|${lineHeight}|${el.innerHTML}`;

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
      el.style.lineHeight = ((lineHeight * (1 + scale)) / 2).toFixed(2);
      if (scale < 1) {
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
      return el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth;
    };

    let size = maxFontSize;
    if (!fitsAt(size) && size > minFontSize) {
      // Binary search for the largest fitting size; minFontSize is used even if
      // the text still overflows there.
      let fitting = minFontSize;
      let overflowing = maxFontSize;
      while (overflowing - fitting > 1) {
        const middle = Math.floor((fitting + overflowing) / 2);
        if (fitsAt(middle)) fitting = middle;
        else overflowing = middle;
      }
      size = fitting;
      applyScale(size);
    }
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
