import React, { useEffect, useRef, useState } from 'react';

import styles from './RotateToMouse.module.scss';

const MIN_ROTATE = -1.5;
const MAX_ROTATE = 1.5;
const HOVER_TRANSITION = 'transform 0.1s';
const RESET_TRANSITION = 'transform 0.5s';

const RotateToMouse = ({
  children,
  ...rest
}: { children: JSX.Element | JSX.Element[] } & React.HTMLAttributes<HTMLDivElement>) => {
  const ref = useRef<HTMLDivElement>(null);
  const [covers, setCovers] = useState<HTMLCollectionOf<Element>>();
  // Transient values that must not trigger a re-render on every mousemove.
  const rectRef = useRef<DOMRect | null>(null);
  // Ease-in the tilt on entry; per-move transitions restart on every mousemove
  // and read as jitter, so moves themselves stay transition-free.
  const easeInRef = useRef(false);

  useEffect(() => {
    if (ref.current) {
      setCovers(ref.current.getElementsByClassName('card-cover'));
    }
  }, []);

  const cacheRect = () => {
    if (ref.current) {
      rectRef.current = ref.current.getBoundingClientRect();
    }
  };

  const update = (x: number, y: number) => {
    const rect = rectRef.current;
    if (!rect) return;

    const relativeX = (x - rect.left) / rect.width;
    const relativeY = (y - rect.top) / rect.height;

    const rotateX = (MAX_ROTATE - MIN_ROTATE) * relativeX + MIN_ROTATE;
    const rotateY = (MAX_ROTATE - MIN_ROTATE) * relativeY + MIN_ROTATE;

    const transform = `transform: rotateX(${-rotateY}deg) rotateY(${rotateX}deg)`;
    if (easeInRef.current) {
      ref.current?.setAttribute('style', `${transform}; transition: ${HOVER_TRANSITION}`);
      easeInRef.current = false;
    } else {
      ref.current?.setAttribute('style', transform);
    }

    if (covers) {
      for (let i = 0; i < covers.length; i += 1) {
        const item = covers.item(i);
        if (item) {
          item.setAttribute(
            'style',
            `transform: translateX(${rotateX * 10}px) translateY(${rotateY * 10}px) scale(1.1); transition: ${HOVER_TRANSITION};`,
          );
        }
      }
    }
  };

  const reset = () => {
    rectRef.current = null;
    // Glide back flat in sync with the cover parallax instead of snapping,
    // which flickers when the rotation moved the card out from under the cursor.
    ref.current?.setAttribute(
      'style',
      'transform: rotateX(0deg) rotateY(0deg); transition: transform 0.5s',
    );

    if (covers) {
      for (let i = 0; i < covers.length; i += 1) {
        const item = covers.item(i);
        if (item) {
          item.setAttribute('style', `transform: scale(1); transition: ${RESET_TRANSITION};`);
        }
      }
    }
  };

  return (
    <div
      className={styles.rotateToMouse}
      // Track the pointer on this untransformed wrapper: its hit area stays
      // static, so a rotated card sliding out from under the cursor cannot
      // re-trigger enter/leave loops (flicker at the edges).
      onMouseEnter={e => {
        cacheRect();
        easeInRef.current = true;
        update(e.clientX, e.clientY);
      }}
      onMouseMove={e => update(e.clientX, e.clientY)}
      onMouseLeave={() => reset()}
      {...rest}
    >
      <div className={styles.inner} ref={ref}>
        {children}
      </div>
    </div>
  );
};

export default RotateToMouse;
