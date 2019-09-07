import React, { useEffect, useRef, useState } from 'react';

import AutoSizer from 'react-virtualized-auto-sizer';

export interface CardCollectionInterface {
  children: JSX.Element | JSX.Element[];
  defaultFontSize?: number;
  minFontSize?: number;
  maxFontSize?: number;
  className?: string;
}

enum DIRECTION {
  NONE,
  UP,
  DOWN
}

const STEP = 0.1;

const TextResizer = ({
  children,
  defaultFontSize = 16,
  minFontSize,
  maxFontSize,
  className
}: CardCollectionInterface) => {
  const [direction, setDirection] = useState(DIRECTION.NONE);
  const [fontSize, setFontSize] = useState(defaultFontSize);
  const childRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (minFontSize && fontSize <= minFontSize) return;
    if (maxFontSize && fontSize >= maxFontSize) return;

    const isUp = direction === DIRECTION.NONE || direction === DIRECTION.UP;
    const isDown = direction === DIRECTION.NONE || direction === DIRECTION.DOWN;

    if (parentRef.current && childRef.current) {
      if (isDown && parentRef.current.clientHeight < childRef.current.clientHeight) {
        setFontSize(fontSize - STEP);
        setDirection(DIRECTION.DOWN);
      } else if (isUp && parentRef.current.clientHeight > childRef.current.clientHeight) {
        setFontSize(fontSize + STEP);
        setDirection(DIRECTION.UP);
      }
    }
  }, [fontSize, children]);

  return (
    <div style={{ width: `100%`, height: `100%` }} ref={parentRef} className={className}>
      <div
        style={{ width: `100%`, fontSize: `${fontSize}px`, lineHeight: `${fontSize}px` }}
        ref={childRef}
      >
        {children}
      </div>
    </div>
  );
};

export default TextResizer;
