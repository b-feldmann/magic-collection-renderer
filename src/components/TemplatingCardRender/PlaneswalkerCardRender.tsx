import React, { useContext, useLayoutEffect, useRef, useState } from 'react';

import 'mana-font/css/mana.css';
// @ts-ignore
import { Mana } from '../Mana/Mana';

import TextResize from '../TextResize/TextResize';

import {
  BasicLandArtStyles,
  CardArtStyles,
  CardType,
  CoverFit,
  RarityType,
} from '../../interfaces/enums';
import { Store, StoreType } from '../../store';
import { getColor } from '../../utils/cardToColor';
import { formatTypeLine } from '../../utils/cardTypes';
import CardFaceInterface from '../../interfaces/CardFaceInterface';

import styles from './TemplatingCardRender.module.scss';
import planeswalkerStyles from './Planeswalker.module.scss';

import {
  getFallbackCover,
  getLoyaltyIcon,
  getPlaneswalkerMainframe,
  getPlaneswalkerNicknamePlate,
  getPlaneswalkerPinline,
  getRarityIcon,
} from './assetLoader';
import { injectForText, injectManaIcons } from '../../utils/injectUtils';
import ImageLoader from '../ImageLoader/ImageLoader';
import PlaneswalkerRulesBackground from './PlaneswalkerRulesBackground';
import { getAbilityLineLayouts } from './planeswalkerGeometry';
import getRarityCode from '../../utils/getRarityCode';
import parseCollectionNumber from '../../utils/parseCollectionNumber';
import { CARD_WIDTH, CARD_HEIGHT } from '../../utils/constants';
import getCoverFitClass from './getCoverFitClass';

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

const PlaneswalkerCardRender = (cardRender: PlaneswalkerCardRenderProps) => {
  const { name, manaCost, cardStats, cover, coverFit, creator } = cardRender;
  const { cardText, cardID } = cardRender;
  const { backFace, collectionNumber, collectionSize, rarity } = cardRender;
  const { containerWidth = CARD_WIDTH, artStyle } = cardRender;

  const { mechanics } = useContext<StoreType>(Store);

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

  const lineLayouts = getAbilityLineLayouts(lineCount, isTall);

  const { color, allColors, orderedCost } = getColor(manaCost);
  const mainframe = getPlaneswalkerMainframe(color, isTall, isBorderless);
  const pinline = getPlaneswalkerPinline(allColors, isTall, isBorderless);
  const nicknamePlate = isNickname ? getPlaneswalkerNicknamePlate(color, allColors) : '';

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
        style={{
          transform: `scale(${resizeFactor(containerWidth)})`,
          transformOrigin: 'top left',
          width: `${(CARD_WIDTH / containerWidth) * 100}%`,
        }}
      >
        <div
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
          <PlaneswalkerRulesBackground lineCount={lineCount} isTall={isTall} />
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
              {name}
            </TextResize>
          </div>
          {isNickname && nicknamePlate ? (
            <div className={`${styles.nicknameText} ${styles.nicknameText}`}>{nickname}</div>
          ) : null}

          <div className={styles.type}>
            {formatTypeLine(cardRender as unknown as CardFaceInterface)}
          </div>

          <div>
            {cardText.map((val, i) => {
              const { loyalty, text, loyaltyImage } = parsePlaneswalkerLine(val);
              const layout = lineLayouts[i];
              return (
                <div key={`pw-line-${cardID}-${i}`}>
                  <div
                    className={`${planeswalkerStyles.loyaltyIcon} ${
                      loyalty === '0' ? planeswalkerStyles.loyaltyIconNeutral : ''
                    }`}
                    style={{ top: `${layout.iconTop}px` }}
                  >
                    {loyaltyImage ? <img src={loyaltyImage} alt="" /> : null}
                  </div>
                  <div
                    className={`${planeswalkerStyles.loyaltyIcon} ${
                      loyalty === '0' ? planeswalkerStyles.loyaltyIconNeutral : ''
                    }`}
                    style={{ top: `${layout.iconTop}px` }}
                  >
                    <p>{loyalty}</p>
                  </div>
                  <div
                    className={`${planeswalkerStyles.loyaltyText} ${!loyalty ? planeswalkerStyles.loyaltyTextNoIcon : ''}`}
                    style={{ top: `${layout.textTop}px`, height: `${layout.textHeight}px` }}
                  >
                    <TextResize
                      defaultFontSize={42}
                      maxFontSize={56}
                      minFontSize={38}
                      className={styles.textWrap}
                    >
                      <div>{injectForText(text, name, mechanics)}</div>
                    </TextResize>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.collectionBlock}>
            {`${parseCollectionNumber(collectionNumber)}/${parseCollectionNumber(collectionSize)}`}
            {` ${getRarityCode(rarity)}`}
          </div>
          <div className={styles.collectionBlock2}>
            MFS &#x2022; EN
            <span className={styles.brush}>
              <Mana symbol="artist-nib" />
            </span>
            <span className={styles.artist}>{creator}</span>
          </div>
          <div className={styles.copyrightStats}>&#8482; &amp; &#169; 2019 BJennWare</div>
        </div>
      </div>
    </div>
  );
};

export default PlaneswalkerCardRender;
