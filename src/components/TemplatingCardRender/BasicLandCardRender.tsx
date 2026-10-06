import React from 'react';

import 'mana-font/css/mana.css';
// @ts-ignore
import { Mana } from '../Mana/Mana';

import {
  BasicLandArtStyles,
  BasicLandType,
  ColorType,
  CoverFit,
  RarityType,
} from '../../interfaces/enums';
import { getBasicLandColor } from '../../utils/cardToColor';

import styles from './TemplatingCardRender.module.scss';
import {
  getBasicLandSymbols,
  getFallbackCover,
  getLandMainframe,
  getRarityIcon,
} from './assetLoader';
import ImageLoader from '../ImageLoader/ImageLoader';
import parseCollectionNumber from '../../utils/parseCollectionNumber';
import { CARD_HEIGHT, CARD_WIDTH } from '../../utils/constants';
import getCoverFitClass from './getCoverFitClass';

interface BasicLandCardRenderProps {
  cardID: string;
  creator?: string;
  landType: BasicLandType;
  cover?: string;
  coverFit?: CoverFit;
  artStyle: BasicLandArtStyles;
  collectionNumber: number;
  collectionSize: number;
  containerWidth?: number;
}

const basicLandTypeToColor = (landType: BasicLandType) => {
  switch (landType) {
    case BasicLandType.Plains:
      return ColorType.White;
    case BasicLandType.Island:
      return ColorType.Blue;
    case BasicLandType.Swamp:
      return ColorType.Black;
    case BasicLandType.Mountain:
      return ColorType.Red;
    case BasicLandType.Forest:
      return ColorType.Green;
    default:
      return ColorType.White;
  }
};

const BasicLandCardRender = (cardRender: BasicLandCardRenderProps) => {
  const { creator, collectionNumber, collectionSize } = cardRender;
  const { landType, cover, coverFit, artStyle, cardID } = cardRender;
  const { containerWidth = CARD_WIDTH } = cardRender;

  const resizeFactor = (width: number) => {
    return width / CARD_WIDTH;
  };

  const getHeight = (width: number) => {
    return resizeFactor(width) * CARD_HEIGHT;
  };

  const mainframe = getLandMainframe(basicLandTypeToColor(landType), artStyle);
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
          style={{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }}
          className={`${styles.cardRender} 
            ${artStyle === BasicLandArtStyles.Unstable && styles.unstableStyle}
            ${artStyle === BasicLandArtStyles.FullArt && styles.landFullArtStyle}
          `}
        >
          <ImageLoader
            src={cover || getFallbackCover()}
            alt="cover"
            className={`${styles.cover} ${getCoverFitClass(styles, coverFit)} ${
              artStyle !== BasicLandArtStyles.Unstable && 'card-cover'
            }`}
          />
          <ImageLoader
            src={typeof mainframe === 'string' ? mainframe : mainframe.highRes}
            lowResSrc={typeof mainframe === 'string' ? undefined : mainframe.lowRes}
            className={styles.mainframe}
            fallBackColor={getBasicLandColor(landType || BasicLandType.Plains)}
          />

          {artStyle === BasicLandArtStyles.Unstable ? (
            <div className={styles.basicLandTitle}>{landType}</div>
          ) : (
            <div>
              <div className={styles.title}>{landType}</div>
              {artStyle === BasicLandArtStyles.FullArt ? (
                <div>
                  <div className={styles.type}>Basic Land</div>
                  <div className={styles.type2}>{landType}</div>
                </div>
              ) : (
                <div className={styles.type}>{`Basic Land – ${landType}`}</div>
              )}
              <ImageLoader
                src={getRarityIcon(RarityType.Common)}
                alt=""
                className={styles.rarity}
              />
              <div className={styles.landSymbol}>
                <ImageLoader src={getBasicLandSymbols(landType)} />
              </div>
            </div>
          )}

          <div className={styles.collectionBlock}>
            {`${parseCollectionNumber(collectionNumber)}/${parseCollectionNumber(collectionSize)}`}
            {' L'}
          </div>
          <div className={styles.collectionBlock2}>
            MFS &#x2022; EN
            <span className={styles.brush}>
              <Mana symbol="artist-nib" />
            </span>
            <span className={styles.artist}>{creator}</span>
          </div>
          <div className={styles.copyright}>&#8482; &amp; &#169; 2019 BJennWare</div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BasicLandCardRender);
