import React, { useEffect, useRef, useState } from 'react';

import { CARD_WIDTH } from '../../utils/constants';
import styles from './TrainerGalleryHolofoil.module.scss';

interface TrainerGalleryHolofoilProps {
  children: React.ReactNode;
  cardWidth: number;
  className?: string;
}

const TrainerGalleryHolofoil = ({
  children,
  cardWidth,
  className,
}: TrainerGalleryHolofoilProps) => {
  const [isActive, setIsActive] = useState(false);
  const fadeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFadeTimeout = () => {
    if (fadeTimeout.current !== null) {
      clearTimeout(fadeTimeout.current);
      fadeTimeout.current = null;
    }
  };

  useEffect(() => clearFadeTimeout, []);

  const activateHolofoil = () => {
    clearFadeTimeout();
    setIsActive(true);
  };

  const deactivateHolofoil = () => {
    clearFadeTimeout();
    fadeTimeout.current = setTimeout(() => {
      setIsActive(false);
      fadeTimeout.current = null;
    }, 1000);
  };

  const updatePointerPosition = (event: React.PointerEvent<HTMLDivElement>) => {
    activateHolofoil();
    const { currentTarget, clientX, clientY } = event;
    const bounds = currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;

    const x = ((clientX - bounds.left) / bounds.width) * 100;
    const y = ((clientY - bounds.top) / bounds.height) * 100;
    const distanceFromCenter = Math.min(Math.hypot(x - 50, y - 50) / Math.sqrt(5000), 1);

    currentTarget.style.setProperty('--pointer-x', `${x}%`);
    currentTarget.style.setProperty('--pointer-y', `${y}%`);
    currentTarget.style.setProperty('--background-y', `${y}%`);
    currentTarget.style.setProperty('--pointer-from-center', `${1 - distanceFromCenter}`);
  };

  return (
    <div
      className={`${styles.holofoilWrapper}${isActive ? ` ${styles.isActive}` : ''}${className ? ` ${className}` : ''}`}
      style={{
        width: cardWidth,
        borderRadius: `${(cardWidth / CARD_WIDTH) * 60}px`,
      }}
      onPointerEnter={activateHolofoil}
      onPointerMove={updatePointerPosition}
      onPointerLeave={deactivateHolofoil}
    >
      {children}
      <div className={styles.shine} aria-hidden="true" />
      <div className={styles.glare} aria-hidden="true" />
    </div>
  );
};

export default TrainerGalleryHolofoil;
