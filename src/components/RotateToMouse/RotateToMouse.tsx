import React, { useEffect, useRef, useState } from 'react';

import styles from './RotateToMouse.module.scss';

const UPDATE_RATE = 2;

const RotateToMouse = ({
  children,
  ...rest
}: { children: JSX.Element | JSX.Element[] } & React.HTMLAttributes<HTMLDivElement>) => {
  const ref = useRef<HTMLDivElement>(null);
  const [covers, setCovers] = useState<HTMLCollectionOf<Element>>();
  // Transient values that must not trigger a re-render on every mousemove.
  const counterRef = useRef(0);
  const lastRelativeMouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (ref.current) {
      setCovers(ref.current.getElementsByClassName('card-cover'));
    }
  }, []);

  const isTimeToUpdate = (): boolean => {
    counterRef.current += 1;
    return counterRef.current % UPDATE_RATE === 0;
  };

  const update = (x: number, y: number) => {
    if (!ref.current) return;

    // Read layout once instead of forcing four synchronous reflows.
    const rect = ref.current.getBoundingClientRect();
    const relativeX = (x - rect.left) / rect.width;
    const relativeY = (y - rect.top) / rect.height;

    // const currentRelativeX = (lastRelativeMouseRef.current.x + relativeX) * 0.5;
    // const currentRelativeY = (lastRelativeMouseRef.current.y + relativeY) * 0.5;

    const currentRelativeX = relativeX;
    const currentRelativeY = relativeY;

    const minRotate = -1.5;
    const maxRotate = 1.5;

    const rotateX = (maxRotate - minRotate) * currentRelativeX + minRotate;
    const rotateY = (maxRotate - minRotate) * currentRelativeY + minRotate;

    const transform = `rotateX(${-rotateY}deg) rotateY(${rotateX}deg)`;
    const style = `transform: ${transform}`;
    ref.current.setAttribute('style', style);

    if (covers) {
      for (let i = 0; i < covers.length; i += 1) {
        const coverStyle = `transform: 
        translateX(${rotateX * 10}px) 
        translateY(${rotateY * 10}px) 
        scale(1.1); 
        transition: transform 1.0s;`;
        const item = covers.item(i);

        if (item) {
          item.setAttribute('style', coverStyle);
        }
      }
    }

    lastRelativeMouseRef.current = { x: currentRelativeX, y: currentRelativeY };
  };

  const reset = () => {
    if (!ref.current) return;
    ref.current.setAttribute('style', '');

    if (covers) {
      for (let i = 0; i < covers.length; i += 1) {
        const coverStyle = `transform: 
        scale(1); 
        transition: transform 0.5s;`;
        const item = covers.item(i);
        if (item) {
          item.setAttribute('style', coverStyle);
        }
      }
    }
  };

  return (
    <div className={styles.rotateToMouse} {...rest}>
      <div
        className={styles.inner}
        onMouseEnter={(e) => update(e.clientX, e.clientY)}
        onMouseMove={(e) => {
          if (isTimeToUpdate()) {
            update(e.clientX, e.clientY);
          }
        }}
        onMouseLeave={() => reset()}
        ref={ref}
      >
        {children}
      </div>
    </div>
  );
};

export default RotateToMouse;
