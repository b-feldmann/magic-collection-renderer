import React, { useEffect, useRef } from 'react';

import { CARD_WIDTH, CARD_HEIGHT } from '../../utils/constants';
import { getPlaneswalkerAbilityDivider, getPlaneswalkerRulesMask } from './assetLoader';
import {
  getAbilityBands,
  getAbilityDividers,
  PLANESWALKER_BAND_DARK,
  PLANESWALKER_BAND_LIGHT,
  PLANESWALKER_DIVIDER_HEIGHT,
} from './planeswalkerGeometry';

interface PlaneswalkerRulesBackgroundProps {
  lineCount: number;
  isTall: boolean;
  className?: string;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Draws the planeswalker rules-area background onto a canvas: alternating
 * translucent light/dark bands (one per ability) separated by textured
 * dividers, clipped to the rules mask. Rendered as a raster canvas (rather than
 * a CSS mask) so it survives DOM rasterization during PDF export.
 */
const PlaneswalkerRulesBackground = ({
  lineCount,
  isTall,
  className,
}: PlaneswalkerRulesBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let cancelled = false;

    const dividers = getAbilityDividers(lineCount, isTall);
    const sources = [
      getPlaneswalkerRulesMask(isTall),
      getPlaneswalkerAbilityDivider(true),
      getPlaneswalkerAbilityDivider(false),
    ];

    Promise.all(sources.map(loadImage))
      .then(([mask, oddDivider, evenDivider]) => {
        if (cancelled) return;

        ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

        // Fill the alternating bands across the full width; the mask clips the
        // left/right edges, rounded corners and loyalty-plate notch.
        getAbilityBands(lineCount, isTall).forEach(band => {
          ctx.fillStyle = band.light ? PLANESWALKER_BAND_LIGHT : PLANESWALKER_BAND_DARK;
          ctx.fillRect(0, band.top, CARD_WIDTH, band.height);
        });

        // Replace the band pixels under each boundary with the divider texture so
        // its edge rows match the neighbouring band colors exactly.
        dividers.forEach(divider => {
          ctx.clearRect(0, divider.top, CARD_WIDTH, PLANESWALKER_DIVIDER_HEIGHT);
          ctx.drawImage(
            divider.odd ? oddDivider : evenDivider,
            0,
            divider.top,
            CARD_WIDTH,
            PLANESWALKER_DIVIDER_HEIGHT,
          );
        });

        // Clip everything to the rules-area shape.
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(mask, 0, 0, CARD_WIDTH, CARD_HEIGHT);
        ctx.globalCompositeOperation = 'source-over';
      })
      .catch(() => {
        /* missing asset - leave the background blank */
      });

    return () => {
      cancelled = true;
    };
  }, [lineCount, isTall]);

  return (
    <canvas
      ref={canvasRef}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
};

export default PlaneswalkerRulesBackground;
