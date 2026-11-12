import React, { useContext, useLayoutEffect, useRef, useState } from 'react';

import 'mana-font/css/mana.css';
// @ts-ignore
import { Mana } from '../Mana/Mana';

import TextResize from '../TextResize/TextResize';

import {
  BasicLandArtStyles,
  CardArtStyles,
  CardType,
  ColorType,
  CoverFit,
  RarityType,
} from '../../interfaces/enums';
import { MechanicsContext } from '../../store';
import { getColor } from '../../utils/cardToColor';
import { resolveColorIdentity } from '../../utils/getLandColor';
import { formatTypeLine } from '../../utils/cardTypes';
import CardFaceInterface from '../../interfaces/CardFaceInterface';

import styles from './TemplatingCardRender.module.scss';
import { CARD_ZOOM_ATTRIBUTE, layOutAtDesignSize } from './designSizeLayout';
import LegalLine from './LegalLine';
import planeswalkerStyles from './Planeswalker.module.scss';

import {
  getFallbackCover,
  getLoyaltyIcon,
  getPlaneswalkerMainframe,
  getPlaneswalkerHoloStamp,
  getPlaneswalkerNicknamePlate,
  getPlaneswalkerPinline,
  getRarityIcon,
  getTwoColorHoloStamp,
  hasHoloStamp,
} from './assetLoader';
import { injectForText, injectManaIcons } from '../../utils/injectUtils';
import { formatCardText } from '../../utils/formatCardText';
import ImageLoader from '../ImageLoader/ImageLoader';
import PlaneswalkerRulesBackground from './PlaneswalkerRulesBackground';
import {
  AbilityLayout,
  getDefaultDividers,
  getIconCenters,
  layoutAbilities,
  PLANESWALKER_LINE_HEIGHT,
  PLANESWALKER_MAX_FONT_SIZE,
  PLANESWALKER_MIN_FONT_SIZE,
} from './planeswalkerGeometry';
import { PRINTED_RULES_SIZES } from './printedTextFit';
import getRarityCode from '../../utils/getRarityCode';
import formatCollectorLine from '../../utils/formatCollectorLine';
import { CARD_WIDTH, CARD_HEIGHT } from '../../utils/constants';
import getCoverFitClass from './getCoverFitClass';
import useFitWhenLaidOut from './useFitWhenLaidOut';

interface PlaneswalkerCardRenderProps {
  artStyle?: BasicLandArtStyles | CardArtStyles;
  name: string;
  rarity: RarityType;
  creator?: string;
  cardID: string;
  manaCost: string;
  legendary?: boolean;
  nickname?: string;
  cardTypes: CardType[];
  cardSubTypes?: string;
  cardText: string[];
  colorIdentity?: ColorType[];
  cardStats?: string;
  flavourText?: string;
  flavourAuthor?: string;
  cover?: string;
  coverFit?: CoverFit;
  backFace?: boolean;
  collectionNumber: number;
  collectionSize: number;
  containerWidth?: number;
}

// The sizes the ability text may use, largest first (0.25pt steps like the
// rules text, capped at the planeswalker maximum).
const ABILITY_FONT_SIZES = PRINTED_RULES_SIZES.filter(
  size => size <= PLANESWALKER_MAX_FONT_SIZE && size >= PLANESWALKER_MIN_FONT_SIZE,
);

// Where the icon image and the cost go relative to the template icon center
// (the colon's height), per icon shape.
// The icon images put their colon at different heights, so each shape gets its
// own offset (measured against Professor Dellian Fel, SOS).
// The text block of each ability (see the markup below), whose lines get pinned.
const ABILITY_TEXT_BLOCKS = '[data-ability-text] > div > div';

const ICON_OFFSET = { up: 7, neutral: 17, down: 28 };
const NUMBER_OFFSET = { up: 0, neutral: 0, down: 0 };

const iconShape = (loyalty: string) => {
  if (loyalty.startsWith('+')) return 'up';
  if (loyalty.startsWith('-') || loyalty.startsWith('−')) return 'down';
  return 'neutral';
};

// Printed loyalty costs use a real minus sign, not a hyphen.
const formatLoyalty = (loyalty: string) => loyalty.replace(/^-/, '−');

interface AbilityFit {
  key: string;
  fontSize: number;
  layout: AbilityLayout;
}

const PlaneswalkerCardRender = (cardRender: PlaneswalkerCardRenderProps) => {
  const { name, manaCost, cardStats, cover, coverFit, creator } = cardRender;
  const { cardText, cardID } = cardRender;
  const { backFace, collectionNumber, rarity } = cardRender;
  const { containerWidth = CARD_WIDTH, artStyle } = cardRender;

  const mechanics = useContext(MechanicsContext);

  // The mana cost (rendered top-right) and the title share the same row, so a
  // wider cost must leave the title less room. Measure the cost box and shrink
  // the title's available width accordingly; TextResize then scales the title
  // text down to fit. Falls back to the CSS width when there is no mana cost.
  const costRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const [titleWidth, setTitleWidth] = useState<number>();

  useLayoutEffect(() => {
    const titleEl = titleRef.current;
    if (!titleEl) return undefined;

    const GAP = 30; // design-space px gap between the title and the mana cost

    const compute = () => {
      const costEl = costRef.current;
      if (!costEl) {
        setTitleWidth(undefined);
        return;
      }
      // Both elements are absolutely positioned inside the unscaled 1500px card
      // frame, so offsetLeft/offsetWidth are in the same design coordinate space
      // regardless of the card's render scale.
      const available = costEl.offsetLeft - titleEl.offsetLeft - GAP;
      setTitleWidth(Math.max(0, available));
    };

    compute();

    const costEl = costRef.current;
    if (!costEl) return undefined;
    // Recompute when the cost box reflows (e.g. once the mana font loads).
    const observer = new ResizeObserver(() => compute());
    observer.observe(costEl);
    return () => observer.disconnect();
  }, [manaCost, backFace]);

  const { nickname } = cardRender;
  const isNickname = nickname != null && nickname.length > 0;

  const resizeFactor = (width: number) => {
    return width / CARD_WIDTH;
  };

  const getHeight = (width: number) => {
    return resizeFactor(width) * CARD_HEIGHT;
  };

  const lineCount = cardText.length;
  const isTall = lineCount >= 4;
  const isBorderless = artStyle === CardArtStyles.Borderless;

  const iconCenters = getIconCenters(lineCount, isTall);

  // All abilities share one font size: the largest step at which every
  // ability, centered on its icon, keeps its distance to its neighbours and the
  // box edges (layoutAbilities). Measured from the rendered text, so it reruns
  // when the text, the display width (line breaks are pinned per zoom, see
  // designSizeLayout) or the loaded fonts change.
  const abilitiesRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const fitKey = `${lineCount}|${isTall}|${containerWidth}|${cardText.join('\n')}`;
  const [abilityFit, setAbilityFit] = useState<AbilityFit | null>(null);

  // Skipped while the card isn't laid out, and run once it is (see useFitWhenLaidOut).
  const fitAbilities = useFitWhenLaidOut(frameRef, () => {
    const container = abilitiesRef.current;
    if (!container) return;
    const blocks = Array.from(container.querySelectorAll<HTMLElement>('[data-ability-text]'));
    let fit: AbilityFit | null = null;
    // Measured at the card's design size, with the line breaks pinned after
    // (see designSizeLayout), so every displayed size wraps the same.
    layOutAtDesignSize(
      [container],
      () => {
        for (const fontSize of ABILITY_FONT_SIZES) {
          container.style.fontSize = `${fontSize}px`;
          const lineCounts = blocks.map(block =>
            Math.max(1, Math.round(block.offsetHeight / (PLANESWALKER_LINE_HEIGHT * fontSize))),
          );
          fit = { key: fitKey, fontSize, layout: layoutAbilities(lineCounts, fontSize, isTall) };
          if (fit.layout.fits) break;
        }
        if (fit) container.style.fontSize = `${fit.fontSize}px`;
      },
      ABILITY_TEXT_BLOCKS,
    );
    if (!fit) return;
    setAbilityFit(fit);
  });

  useLayoutEffect(() => {
    if (abilityFit?.key !== fitKey) fitAbilities();
  });

  useLayoutEffect(() => {
    const { fonts } = document;
    if (!fonts?.addEventListener) return undefined;
    const onFontsLoaded = () => fitAbilities();
    fonts.addEventListener('loadingdone', onFontsLoaded);
    return () => fonts.removeEventListener('loadingdone', onFontsLoaded);
  }, [fitAbilities]);

  const abilityFontSize = abilityFit?.fontSize ?? PLANESWALKER_MAX_FONT_SIZE;
  const dividers = abilityFit?.layout.dividers ?? getDefaultDividers(lineCount, isTall);

  const colorInfo = manaCost
    ? getColor(manaCost)
    : getColor('', resolveColorIdentity(cardText, cardRender.colorIdentity));
  const { color, allColors, orderedCost } = colorInfo;
  const mainframe = getPlaneswalkerMainframe(color, isTall, isBorderless);
  const pinline = getPlaneswalkerPinline(allColors, isTall, isBorderless);
  const nicknamePlate = isNickname ? getPlaneswalkerNicknamePlate(color, allColors) : '';

  // Rare and mythic planeswalkers carry the holo stamp too; on two-color ones
  // the bump runs through the pinline's fade from one color into the other.
  const holoStamp = hasHoloStamp(rarity)
    ? (getTwoColorHoloStamp(allColors, 'planeswalker') ??
      getPlaneswalkerHoloStamp(color, isTall, isBorderless))
    : null;

  const parsePlaneswalkerLine = (line: string) => {
    if (!line) return { loyalty: '', text: '', loyaltyImage: '' };

    const splitIndex = line.indexOf('|');
    if (splitIndex === -1) return { loyalty: '', text: line, loyaltyImage: '' };

    const loyalty = line.substring(0, splitIndex).replace('{', '').replace('}', '').toUpperCase();

    return { loyalty, text: line.substring(splitIndex + 1), loyaltyImage: getLoyaltyIcon(loyalty) };
  };

  return (
    <div style={{ height: `${getHeight(containerWidth)}px` }}>
      <div
        id={`card-id-${cardID}`}
        {...{ [CARD_ZOOM_ATTRIBUTE]: '' }}
        style={{
          // `zoom` (not `transform: scale`) lays the card out at its real size, so
          // edges and text snap to device pixels instead of being resampled.
          zoom: resizeFactor(containerWidth),
        }}
      >
        <div
          ref={frameRef}
          style={{
            width: `${CARD_WIDTH}px`,
            height: `${CARD_HEIGHT}px`,
          }}
          className={`${styles.cardRender} ${styles.planeswalker} ${isBorderless} ${styles.borderless} ${isTall && styles.lines4} ${
            isNickname && styles.nicknameFrame
          }`}
        >
          <ImageLoader
            src={cover || getFallbackCover()}
            alt="cover"
            fallBackColor="black"
            className={`${styles.cover} ${getCoverFitClass(styles, coverFit)} card-cover`}
          />
          <PlaneswalkerRulesBackground dividers={dividers} isTall={isTall} />
          <ImageLoader
            src={mainframe.highRes}
            lowResSrc={mainframe.lowRes}
            className={styles.mainframe}
            fallBackColor="#eed66b"
          />
          {pinline ? <img className={styles.pinline} src={pinline} alt="" /> : null}
          {isNickname && nicknamePlate ? (
            <img className={`${styles.pinline} ${styles.nickname}`} src={nicknamePlate} alt="" />
          ) : null}
          {holoStamp ? (
            <img className={styles.holoStamp} src={holoStamp} alt="" data-testid="holo-stamp" />
          ) : null}
          <ImageLoader src={getRarityIcon(rarity)} alt="" className={styles.rarity} />

          <div>
            <div className={styles.stats}>
              <div>{cardStats}</div>
            </div>
          </div>

          {!backFace && (
            <div ref={costRef} className={styles.cost}>
              {injectManaIcons(orderedCost, true)}
            </div>
          )}

          <div
            ref={titleRef}
            className={styles.title}
            style={titleWidth !== undefined ? { width: `${titleWidth}px` } : undefined}
          >
            <TextResize defaultFontSize={75} maxFontSize={75} minFontSize={40}>
              {formatCardText(name)}
            </TextResize>
          </div>
          {isNickname && nicknamePlate ? (
            <div className={`${styles.nicknameText} ${styles.nicknameText}`}>
              {formatCardText(nickname)}
            </div>
          ) : null}

          <div className={styles.type}>
            <TextResize defaultFontSize={67} maxFontSize={67} minFontSize={38}>
              {formatCardText(formatTypeLine(cardRender as unknown as CardFaceInterface))}
            </TextResize>
          </div>

          <div ref={abilitiesRef} style={{ fontSize: `${abilityFontSize}px` }}>
            {cardText.map((val, i) => {
              const { loyalty, text, loyaltyImage } = parsePlaneswalkerLine(val);
              const shape = iconShape(loyalty);
              const textTop = abilityFit?.layout.textTops[i] ?? iconCenters[i];
              return (
                <div key={`pw-line-${cardID}-${i}`}>
                  {loyalty ? (
                    <>
                      <div
                        className={planeswalkerStyles.loyaltyIcon}
                        style={{ top: `${iconCenters[i] + ICON_OFFSET[shape]}px` }}
                      >
                        {loyaltyImage ? <img src={loyaltyImage} alt="" /> : null}
                      </div>
                      <div
                        className={planeswalkerStyles.loyaltyNumber}
                        style={{ top: `${iconCenters[i] + NUMBER_OFFSET[shape]}px` }}
                      >
                        <p>{formatLoyalty(loyalty)}</p>
                      </div>
                    </>
                  ) : null}
                  <div
                    data-ability-text
                    className={`${planeswalkerStyles.loyaltyText} ${!loyalty ? planeswalkerStyles.loyaltyTextNoIcon : ''}`}
                    style={{ top: `${textTop}px` }}
                  >
                    <div className={styles.textWrap}>
                      <div
                        style={
                          text.trimStart().startsWith('--')
                            ? { paddingLeft: '0.5em', boxSizing: 'border-box' }
                            : undefined
                        }
                      >
                        {injectForText(text, name, mechanics)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.collectionBlock}>
            {formatCollectorLine(collectionNumber, getRarityCode(rarity))}
          </div>
          <div className={styles.collectionBlock2}>
            MFS &#x2022; EN
            <span className={styles.brush}>
              <Mana symbol="artist-nib" />
            </span>
            <span className={styles.artist}>{creator}</span>
          </div>
          <div className={styles.copyrightStats}>
            <LegalLine />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaneswalkerCardRender;
