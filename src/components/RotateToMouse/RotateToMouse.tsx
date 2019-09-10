import React, { useEffect, useRef, useState } from 'react';

import styles from './RotateToMouse.module.scss';

const UPDATE_RATE = 10;

const RotateToMouse = ({
  children,
  ...rest
}: { children: JSX.Element | JSX.Element[] } & React.HTMLAttributes<HTMLDivElement>) => {
  const ref = useRef<HTMLDivElement>(null);
  const [covers, setCovers] = useState<HTMLCollectionOf<Element>>();
  const [counter, setCounter] = useState(0);
  const [lastRelativeMouse, setLastRelativeMouse] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (ref.current) {
      setCovers(ref.current.getElementsByClassName('card-cover'));
    }
  }, [ref.current]);

  const isTimeToUpdate = (): boolean => {
    setCounter(counter + 1);
    return counter % UPDATE_RATE === 0;
  };

  const update = (x: number, y: number) => {
    if (!ref.current) return;

    const relativeX =
      (x - ref.current.getBoundingClientRect().left) / ref.current.getBoundingClientRect().width;
    const relativeY =
      (y - ref.current.getBoundingClientRect().top) / ref.current.getBoundingClientRect().height;

    const currentRelativeX = (lastRelativeMouse.x + relativeX) * 0.5;
    const currentRelativeY = (lastRelativeMouse.y + relativeY) * 0.5;

    const minRotate = -1;
    const maxRotate = 1;

    const rotateX = (maxRotate - minRotate) * currentRelativeX + minRotate;
    const rotateY = (maxRotate - minRotate) * currentRelativeY + minRotate;

    const transform = `rotateX(${-rotateY}deg) rotateY(${rotateX}deg)`;
    const style = `transform: ${transform}`;
    ref.current.setAttribute('style', style);

    if (covers) {
      for (let i = 0; i < covers.length; i += 1) {
        const coverStyle = `transform: 
        translateX(${rotateX * 20}px) 
        translateY(${rotateY * 20}px) 
        rotateX(${-rotateY * -0.5}deg) 
        rotateY(${rotateX * -0.5}deg)
        scale(1.1); 
        transition: transform 1.5s;`;
        const item = covers.item(i);

        if (item) {
          item.setAttribute('style', coverStyle);
        }
      }
    }

    setLastRelativeMouse({ x: currentRelativeX, y: currentRelativeY });
  };

  const reset = () => {
    if (!ref.current) return;
    ref.current.setAttribute('style', '');

    if (covers) {
      for (let i = 0; i < covers.length; i += 1) {
        const coverStyle = `transform: 
        scale(1); 
        transition: transform 1.5s;`;
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
        onMouseEnter={e => update(e.clientX, e.clientY)}
        onMouseMove={e => {
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
