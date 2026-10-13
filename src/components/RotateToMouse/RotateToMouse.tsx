import React, { useEffect, useRef, useState } from 'react';

import styles from './RotateToMouse.module.scss';

const MIN_ROTATE = -0.7;
const MAX_ROTATE = 0.7;
const ROTATION_STIFFNESS = 0.066;
const ROTATION_DAMPING = 0.25;

const RotateToMouse = ({
  children,
  ...rest
}: { children: JSX.Element | JSX.Element[] } & React.HTMLAttributes<HTMLDivElement>) => {
  const ref = useRef<HTMLDivElement>(null);
  const [covers, setCovers] = useState<HTMLCollectionOf<Element>>();
  // Transient values that must not trigger a re-render on every mousemove.
  const rectRef = useRef<DOMRect | null>(null);
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const targetCoverRef = useRef({ x: 0, y: 0, scale: 1 });
  const coverRef = useRef({ x: 0, y: 0, scale: 1 });
  const coverVelocityRef = useRef({ x: 0, y: 0, scale: 0 });
  const frameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (ref.current) {
      setCovers(ref.current.getElementsByClassName('card-cover'));
    }

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const animateRotation = (timestamp: number) => {
    frameRef.current = null;
    const elapsed =
      lastFrameTimeRef.current === null
        ? 1
        : Math.min((timestamp - lastFrameTimeRef.current) / (1000 / 60), 2);
    lastFrameTimeRef.current = timestamp;

    const rotation = rotationRef.current;
    const target = targetRotationRef.current;
    const velocity = velocityRef.current;
    const cover = coverRef.current;
    const coverTarget = targetCoverRef.current;
    const coverVelocity = coverVelocityRef.current;

    velocity.x +=
      ((target.x - rotation.x) * ROTATION_STIFFNESS - velocity.x * ROTATION_DAMPING) * elapsed;
    velocity.y +=
      ((target.y - rotation.y) * ROTATION_STIFFNESS - velocity.y * ROTATION_DAMPING) * elapsed;
    rotation.x += velocity.x * elapsed;
    rotation.y += velocity.y * elapsed;

    coverVelocity.x +=
      ((coverTarget.x - cover.x) * ROTATION_STIFFNESS - coverVelocity.x * ROTATION_DAMPING) *
      elapsed;
    coverVelocity.y +=
      ((coverTarget.y - cover.y) * ROTATION_STIFFNESS - coverVelocity.y * ROTATION_DAMPING) *
      elapsed;
    coverVelocity.scale +=
      ((coverTarget.scale - cover.scale) * ROTATION_STIFFNESS -
        coverVelocity.scale * ROTATION_DAMPING) *
      elapsed;
    cover.x += coverVelocity.x * elapsed;
    cover.y += coverVelocity.y * elapsed;
    cover.scale += coverVelocity.scale * elapsed;

    if (
      Math.abs(target.x - rotation.x) < 0.001 &&
      Math.abs(target.y - rotation.y) < 0.001 &&
      Math.abs(velocity.x) < 0.001 &&
      Math.abs(velocity.y) < 0.001 &&
      Math.abs(coverTarget.x - cover.x) < 0.001 &&
      Math.abs(coverTarget.y - cover.y) < 0.001 &&
      Math.abs(coverTarget.scale - cover.scale) < 0.001 &&
      Math.abs(coverVelocity.x) < 0.001 &&
      Math.abs(coverVelocity.y) < 0.001 &&
      Math.abs(coverVelocity.scale) < 0.001
    ) {
      rotation.x = target.x;
      rotation.y = target.y;
      velocity.x = 0;
      velocity.y = 0;
      cover.x = coverTarget.x;
      cover.y = coverTarget.y;
      cover.scale = coverTarget.scale;
      coverVelocity.x = 0;
      coverVelocity.y = 0;
      coverVelocity.scale = 0;
      lastFrameTimeRef.current = null;
    }

    ref.current?.style.setProperty(
      'transform',
      `rotateX(${-rotation.y}deg) rotateY(${rotation.x}deg)`,
    );

    if (covers) {
      for (let i = 0; i < covers.length; i += 1) {
        (covers.item(i) as HTMLElement | null)?.style.setProperty(
          'transform',
          `translateX(${cover.x}px) translateY(${cover.y}px) scale(${cover.scale})`,
        );
      }
    }

    if (
      velocity.x !== 0 ||
      velocity.y !== 0 ||
      coverVelocity.x !== 0 ||
      coverVelocity.y !== 0 ||
      coverVelocity.scale !== 0
    ) {
      frameRef.current = requestAnimationFrame(animateRotation);
    }
  };

  const scheduleRotation = () => {
    if (frameRef.current === null) {
      lastFrameTimeRef.current = null;
      frameRef.current = requestAnimationFrame(animateRotation);
    }
  };

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

    targetRotationRef.current = { x: rotateX, y: rotateY };
    targetCoverRef.current = { x: rotateX * 10, y: rotateY * 10, scale: 1.1 };
    scheduleRotation();
  };

  const reset = () => {
    rectRef.current = null;
    targetRotationRef.current = { x: 0, y: 0 };
    targetCoverRef.current = { x: 0, y: 0, scale: 1 };
    scheduleRotation();
  };

  return (
    <div
      className={styles.rotateToMouse}
      // Track the pointer on this untransformed wrapper: its hit area stays
      // static, so a rotated card sliding out from under the cursor cannot
      // re-trigger enter/leave loops (flicker at the edges).
      onMouseEnter={e => {
        cacheRect();
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
