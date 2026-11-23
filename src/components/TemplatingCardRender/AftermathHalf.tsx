import React, { useContext } from 'react';

import { AftermathType, ColorType, CoverFit } from '../../interfaces/enums';
import { MechanicsContext } from '../../store';
import { getColor } from '../../utils/cardToColor';
import { getCoverImageSrc } from '../../utils/cover';
import { formatCardText } from '../../utils/formatCardText';
import { injectForText, injectManaIcons, isBulletText } from '../../utils/injectUtils';
import ImageLoader from '../ImageLoader/ImageLoader';
import TextResize from '../TextResize/TextResize';
import { getAftermathMainframe, getAftermathParts, getFallbackCover } from './assetLoader';
import { fitAtDesignSize } from './designSizeLayout';
import getCoverFitClass from './getCoverFitClass';
import { balancePrintedLines, resetPrintedLines } from './printedLineBreaks';
import { AFTERMATH_LINE_HEIGHT, PRINTED_AFTERMATH_SIZES } from './printedTextFit';
import styles from './TemplatingCardRender.module.scss';

interface AftermathFrameProps {
  color: ColorType;
  colors: ColorType[];
  hexColor?: string;
  isLand?: boolean;
  // Which half of the frame image to show; every image holds both.
  turned?: boolean;
}

/** One half's frame, with two-color pinlines and text box on a two-color gold frame. */
export const AftermathFrame = ({
  color,
  colors,
  hexColor,
  isLand = false,
  turned = false,
}: AftermathFrameProps) => {
  const mainframe = getAftermathMainframe(color, isLand);
  const parts = getAftermathParts(colors);
  const halfClass = turned ? styles.aftermathFrameTurned : styles.aftermathFrameUpright;

  return (
    <>
      <ImageLoader
        src={mainframe.highRes}
        lowResSrc={mainframe.lowRes}
        className={`${styles.mainframe} ${halfClass}`}
        fallBackColor={hexColor}
      />
      {parts ? (
        <img className={`${styles.aftermathParts} ${halfClass}`} src={parts} alt="" />
      ) : null}
    </>
  );
};

export interface AftermathHalfProps {
  cardID: string;
  // The card's own colors, used when the half has no cost.
  color: ColorType;
  colors: ColorType[];
  hexColor?: string;
  aftermathName?: string;
  aftermathCost?: string;
  aftermathText?: string[];
  aftermathType?: AftermathType;
  aftermathCover?: string;
  aftermathCoverFit?: CoverFit;
}

/**
 * The second half of an Aftermath card, turned clockwise by 90 degrees on the
 * lower half of the frame. Each part of the text only appears when it is set.
 */
const AftermathHalf = ({
  cardID,
  color,
  colors,
  hexColor,
  aftermathName = '',
  aftermathCost,
  aftermathText,
  aftermathType,
  aftermathCover,
  aftermathCoverFit,
}: AftermathHalfProps) => {
  const mechanics = useContext(MechanicsContext);
  const costColors = aftermathCost ? getColor(aftermathCost) : undefined;

  return (
    <>
      {/* The unturned window carries the parallax (RotateToMouse), so the art moves the same way as
          the upright half's. */}
      <div className={`${styles.aftermathCoverWindow} card-cover`}>
        <ImageLoader
          src={getCoverImageSrc(aftermathCover) || getFallbackCover()}
          alt="aftermath cover"
          className={`${styles.aftermathCover} ${getCoverFitClass(styles, aftermathCoverFit)}`}
        />
      </div>

      <AftermathFrame
        color={costColors?.color ?? color}
        colors={costColors?.allColors ?? colors}
        hexColor={costColors?.hexColor ?? hexColor}
        turned
      />

      <div className={styles.aftermathTurned} data-testid="aftermath-half">
        <div className={styles.aftermathTitleRow}>
          <div className={styles.aftermathTitle}>
            {/* Shrinks a long name so it stays clear of the cost. */}
            <TextResize defaultFontSize={75} maxFontSize={75} minFontSize={28}>
              {formatCardText(aftermathName)}
            </TextResize>
          </div>
          {costColors ? (
            <div className={`${styles.cost} ${styles.aftermathCost}`}>
              {injectManaIcons(costColors.orderedCost, true)}
            </div>
          ) : null}
        </div>
        {aftermathType ? (
          <div className={styles.aftermathTypeLine}>{formatCardText(aftermathType)}</div>
        ) : null}
        {aftermathText?.length ? (
          <div className={`${styles.text} ${styles.aftermathText}`}>
            <TextResize
              defaultFontSize={42}
              maxFontSize={PRINTED_AFTERMATH_SIZES[0]}
              minFontSize={28}
              lineHeight={AFTERMATH_LINE_HEIGHT}
              fixedSpacing
              sizeSteps={PRINTED_AFTERMATH_SIZES}
              beforeFit={resetPrintedLines}
              afterFit={balancePrintedLines}
              layout={fitAtDesignSize}
              className={`${styles.textWrap} ${styles.aftermathRules}`}
            >
              <div>
                {aftermathText.map((val, i) => (
                  <p
                    key={`aftermath-text-${cardID}-${i}`}
                    className={isBulletText(val) ? styles.bulletText : undefined}
                    style={val.trimStart().startsWith('--') ? { marginLeft: '0.5em' } : undefined}
                  >
                    {injectForText(val, aftermathName, mechanics)}
                  </p>
                ))}
              </div>
            </TextResize>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default AftermathHalf;
