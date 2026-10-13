import React from 'react';

import styles from './TrainerGalleryHolofoil.module.scss';

interface TrainerGalleryHolofoilProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const TrainerGalleryHolofoil = ({ children, className, style }: TrainerGalleryHolofoilProps) => {
  const updatePointerPosition = (event: React.PointerEvent<HTMLDivElement>) => {
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
      className={`${styles.holofoilWrapper}${className ? ` ${className}` : ''}`}
      style={style}
      onPointerMove={updatePointerPosition}
    >
      {children}
      <div className={styles.shine} aria-hidden="true" />
      <div className={styles.glare} aria-hidden="true" />
    </div>
  );
};

export default TrainerGalleryHolofoil;
