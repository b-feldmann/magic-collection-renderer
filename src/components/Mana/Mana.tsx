import React from 'react';

/**
 * Lightweight replacement for `@saeris/react-mana`'s `Mana` component.
 * Renders a mana-font glyph (https://github.com/andrewgioia/mana) directly via
 * its CSS classes. The global stylesheet is imported once in `src/index.tsx`
 * (`mana-font/css/mana.css`).
 */
export interface ManaProps {
  /** mana-font symbol suffix, e.g. "w", "2u", "tap", "loyalty-up", "artist-nib". */
  symbol: string;
  /** Render the symbol on a circular background (`ms-cost`). */
  cost?: boolean;
  /** Add a drop shadow (`ms-shadow`). */
  shadow?: boolean;
  /** Loyalty value rendered inside loyalty symbols (`ms-loyalty-<value>`). */
  loyalty?: number | string;
  className?: string;
}

export const Mana: React.FC<ManaProps> = ({ symbol, cost, shadow, loyalty, className }) => {
  const classes = ['ms', `ms-${symbol}`];
  if (cost) classes.push('ms-cost');
  if (shadow) classes.push('ms-shadow');
  if (loyalty !== undefined && loyalty !== null) {
    classes.push(`ms-loyalty-${String(loyalty).toLowerCase()}`);
  }
  if (className) classes.push(className);

  return <i className={classes.join(' ')} />;
};

export default Mana;
