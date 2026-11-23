import React, { useContext, useLayoutEffect, useRef, useState } from 'react';

import { MechanicsContext } from '../../store';
import { injectForText, isBulletText } from '../../utils/injectUtils';
import { parseSagaText } from '../../utils/sagaChapters';
import TextResize from '../TextResize/TextResize';
import { getSagaChapterIcon, getSagaDivider } from './assetLoader';
import { fitAtDesignSize, layOutAtDesignSize } from './designSizeLayout';
import FlavourText from './FlavourText';
import { balancePrintedLines, resetPrintedLines } from './printedLineBreaks';
import { PRINTED_WHOLE_STEP_SIZES } from './printedTextFit';
import {
  getSagaArea,
  getSagaFontSizes,
  layoutSaga,
  SAGA_LINE_HEIGHT,
  SagaLayout,
} from './sagaGeometry';
import styles from './TemplatingCardRender.module.scss';
import useFitWhenLaidOut from './useFitWhenLaidOut';

// Sizes of the reminder text above the chapters, and of a creature's rules box.
const REMINDER_SIZES = PRINTED_WHOLE_STEP_SIZES.filter(size => size <= 63.4);
const CREATURE_REMINDER_SIZES = PRINTED_WHOLE_STEP_SIZES.filter(size => size <= 65.5);
const RULES_SIZES = PRINTED_WHOLE_STEP_SIZES.filter(size => size <= 69.7);

const STEP_TEXT = '[data-step-text]';

interface SagaFit {
  key: string;
  fontSize: number;
  layout: SagaLayout;
}

export interface SagaTextProps {
  cardID: string;
  name: string;
  cardText: string[];
  isCreature: boolean;
  flavourText: string;
  flavourAuthor?: string;
  containerWidth: number;
}

/** All text of a Saga: its reminder text, its steps and a creature's rules box. */
const SagaText = ({
  cardID,
  name,
  cardText,
  isCreature,
  flavourText,
  flavourAuthor,
  containerWidth,
}: SagaTextProps) => {
  const mechanics = useContext(MechanicsContext);
  const { reminder, steps, rules } = parseSagaText(cardText, isCreature);
  const sizes = getSagaFontSizes(isCreature);
  const reminderSizes = isCreature ? CREATURE_REMINDER_SIZES : REMINDER_SIZES;

  const paragraphs = (lines: string[], key: string) =>
    lines.map((line, i) => (
      <p
        key={`${key}-${cardID}-${i}`}
        className={isBulletText(line) ? styles.bulletText : undefined}
        style={line.trimStart().startsWith('--') ? { marginLeft: '0.5em' } : undefined}
      >
        {injectForText(line, name, mechanics)}
      </p>
    ));

  // All steps share one font size: the largest at which they fit the column (layoutSaga).
  // Measured from the rendered text, so it reruns when the text, the display width (line breaks
  // are pinned per zoom, see designSizeLayout) or the loaded fonts change.
  const stepsRef = useRef<HTMLDivElement>(null);
  const fitKey = JSON.stringify([name, steps, isCreature, containerWidth]);
  const [fit, setFit] = useState<SagaFit | null>(null);
  const fittedMechanics = useRef<typeof mechanics | null>(null);

  // Skipped while the card isn't laid out, and run once it is (see useFitWhenLaidOut).
  const fitSteps = useFitWhenLaidOut(stepsRef, () => {
    const container = stepsRef.current;
    if (!container) return;
    const blocks = Array.from(container.querySelectorAll<HTMLElement>(STEP_TEXT));
    let next: SagaFit | null = null;
    layOutAtDesignSize([container], () => {
      resetPrintedLines(container);
      for (const fontSize of sizes) {
        container.style.fontSize = `${fontSize}px`;
        const layout = layoutSaga(
          blocks.map((block, i) => ({
            textHeight: block.offsetHeight,
            chapterCount: steps[i]?.numerals.length ?? 0,
          })),
          getSagaArea(isCreature),
        );
        next = { key: fitKey, fontSize, layout };
        if (layout.fits) break;
      }
      balancePrintedLines(container);
    });
    fittedMechanics.current = mechanics;
    setFit(next);
  });

  useLayoutEffect(() => {
    if (fit?.key !== fitKey || fittedMechanics.current !== mechanics) fitSteps();
  });

  useLayoutEffect(() => {
    const { fonts } = document;
    if (!fonts?.addEventListener) return undefined;
    const onFontsLoaded = () => fitSteps();
    fonts.addEventListener('loadingdone', onFontsLoaded);
    return () => fonts.removeEventListener?.('loadingdone', onFontsLoaded);
  }, [fitSteps]);

  const layout =
    fit?.layout.abilities.length === steps.length
      ? fit.layout
      : layoutSaga(
          steps.map(({ numerals }) => ({ textHeight: 0, chapterCount: numerals.length })),
          getSagaArea(isCreature),
        );

  return (
    <>
      <div className={`${styles.text} ${styles.sagaReminder}`} data-testid="saga-reminder">
        <TextResize
          defaultFontSize={42}
          maxFontSize={reminderSizes[0]}
          minFontSize={28}
          lineHeight={SAGA_LINE_HEIGHT}
          fixedSpacing
          sizeSteps={reminderSizes}
          layout={fitAtDesignSize}
          className={`${styles.textWrap} ${styles.sagaPrintedText}`}
        >
          <div>{paragraphs(reminder, 'saga-reminder')}</div>
        </TextResize>
      </div>

      <div
        ref={stepsRef}
        className={`${styles.text} ${styles.sagaSteps}`}
        style={{ fontSize: `${fit?.fontSize ?? sizes[0]}px`, lineHeight: SAGA_LINE_HEIGHT }}
      >
        {steps.map(({ numerals, lines }, i) => {
          const { dividerTop, textTop, iconTops } = layout.abilities[i];
          return (
            <div key={`saga-step-${cardID}-${i}`} data-testid="saga-step">
              <img
                className={styles.sagaDivider}
                src={getSagaDivider()}
                alt=""
                style={{ top: `${dividerTop}px` }}
              />
              {numerals.map((numeral, n) => (
                <div
                  key={`saga-numeral-${cardID}-${i}-${n}`}
                  className={styles.sagaChapterIcon}
                  style={{
                    top: `${iconTops[n]}px`,
                    backgroundImage: `url("${getSagaChapterIcon()}")`,
                  }}
                >
                  {numeral}
                </div>
              ))}
              <div
                data-step-text
                className={`${styles.sagaStepText} ${styles.sagaPrintedText}`}
                style={{ top: `${textTop}px` }}
              >
                {paragraphs(lines, `saga-step-${i}`)}
              </div>
            </div>
          );
        })}
      </div>

      {isCreature ? (
        <div className={`${styles.text} ${styles.sagaRules}`} data-testid="saga-rules">
          <TextResize
            defaultFontSize={42}
            maxFontSize={RULES_SIZES[0]}
            minFontSize={28}
            lineHeight={SAGA_LINE_HEIGHT}
            fixedSpacing
            sizeSteps={RULES_SIZES}
            beforeFit={resetPrintedLines}
            afterFit={balancePrintedLines}
            layout={fitAtDesignSize}
            className={`${styles.textWrap} ${styles.sagaPrintedText}`}
          >
            <div>
              {paragraphs(rules, 'saga-rules')}
              <FlavourText name={name} flavourText={flavourText} flavourAuthor={flavourAuthor} />
            </div>
          </TextResize>
        </div>
      ) : null}
    </>
  );
};

export default SagaText;
