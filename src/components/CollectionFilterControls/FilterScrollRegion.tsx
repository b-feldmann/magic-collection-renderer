import React, { useEffect, useRef, useState } from 'react';
import styles from './styles.module.scss';

const FilterScrollRegion = ({ children }: React.PropsWithChildren) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [shadows, setShadows] = useState({ top: false, bottom: false });

  useEffect(() => {
    const region = scrollRef.current!;
    const update = () => {
      const top = region.scrollTop > 1;
      const bottom = region.scrollHeight - region.clientHeight - region.scrollTop > 1;
      setShadows(previous =>
        previous.top === top && previous.bottom === bottom ? previous : { top, bottom },
      );
    };
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    observer?.observe(region);
    observer?.observe(contentRef.current!);
    region.addEventListener('scroll', update, { passive: true });
    region.addEventListener('toggle', update, true);
    window.addEventListener('resize', update);
    update();
    return () => {
      observer?.disconnect();
      region.removeEventListener('scroll', update);
      region.removeEventListener('toggle', update, true);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      className={`${styles.scrollWrapper} ${shadows.top ? styles.hasTopShadow : ''} ${shadows.bottom ? styles.hasBottomShadow : ''}`}
    >
      <div
        ref={scrollRef}
        className={styles.scrollRegion}
        role="region"
        aria-label="Collection filters"
        tabIndex={0}
      >
        <div ref={contentRef} className={styles.scrollContent}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default FilterScrollRegion;
