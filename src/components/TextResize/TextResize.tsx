import React, { useLayoutEffect, useRef, useState } from 'react';

/**
 * Replacement for the unmaintained `react-resize-text` package (incompatible
 * with React 19). Shrinks the rendered font size until the content fits inside
 * its (CSS-bounded) container, staying within [minFontSize, maxFontSize].
 */
export interface TextResizeProps {
  defaultFontSize?: number;
  maxFontSize?: number;
  minFontSize?: number;
  className?: string;
  children: React.ReactNode;
}

const TextResize: React.FC<TextResizeProps> = ({
  defaultFontSize = 20,
  maxFontSize = 32,
  minFontSize = 14,
  className,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number>(defaultFontSize);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

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
      if (scale < 1) {
        el.style.lineHeight = ((1.2 * (1 + scale)) / 2).toFixed(2);
        const marginScale = Math.sqrt(scale);
        paragraphs.forEach((p, i) => {
          p.style.marginTop = `${baseMargins[i].top * marginScale}px`;
          p.style.marginBottom = `${baseMargins[i].bottom * marginScale}px`;
        });
      } else {
        el.style.lineHeight = '';
        paragraphs.forEach(p => {
          p.style.marginTop = '';
          p.style.marginBottom = '';
        });
      }
    };

    const fit = () => {
      let size = maxFontSize;
      applyScale(size);
      while (
        size > minFontSize &&
        (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)
      ) {
        size -= 1;
        applyScale(size);
      }
      setFontSize(size);
    };

    fit();

    const observer = new ResizeObserver(() => fit());
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, maxFontSize, minFontSize]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ fontSize, height: '100%', width: '100%', overflow: 'hidden' }}
    >
      {children}
    </div>
  );
};

export default TextResize;
