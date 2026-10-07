import React, { useContext } from 'react';

import 'mana-font/css/mana.css';
// @ts-ignore
import { Mana } from '../Mana/Mana';

import TextResize from '../TextResize/TextResize';

import {
  BasicLandArtStyles,
  CardArtStyles,
  CardMainType,
  CoverFit,
  RarityType,
} from '../../interfaces/enums';
import { Store, StoreType } from '../../store';
import { getColor } from '../../utils/cardToColor';

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
  cardMainType: CardMainType;
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
  const { legendary, cardMainType, cardSubTypes } = cardRender;
  const { name, manaCost, cardStats, cover, coverFit, creator } = cardRender;
  const { cardText, cardID } = cardRender;
  const { backFace, collectionNumber, collectionSize, rarity } = cardRender;
  const { containerWidth = CARD_WIDTH, artStyle } = cardRender;

  const { mechanics } = useContext<StoreType>(Store);

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
          {pinline && !isNickname ? <img className={styles.pinline} src={pinline} alt="" /> : null}
          {isNickname && nicknamePlate ? (
            <img className={`${styles.pinline} ${styles.nickname}`} src={nicknamePlate} alt="" />
          ) : null}
          <ImageLoader src={getRarityIcon(rarity)} alt="" className={styles.rarity} />

          <div>
            <div className={styles.stats}>
              <div>{cardStats}</div>
            </div>
          </div>

          {!backFace && <div className={styles.cost}>{injectManaIcons(orderedCost, true)}</div>}

          <div className={styles.title}>{name}</div>
          {isNickname && nicknamePlate ? (
            <div className={`${styles.nicknameText} ${styles.nicknameText}`}>{nickname}</div>
          ) : null}

          <div className={styles.type}>
            {legendary ? 'Legendary ' : ''}
            {cardMainType}
            {cardSubTypes ? ` – ${cardSubTypes}` : ''}
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
                    className={planeswalkerStyles.loyaltyText}
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
